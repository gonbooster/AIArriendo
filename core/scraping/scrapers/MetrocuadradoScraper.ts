import { Property, SearchCriteria, ScrapingSource } from '../../types';
import { RateLimiter } from '../RateLimiter';
import { LocationDetector } from '../../utils/LocationDetector';
import { logger } from '../../../utils/logger';
import * as cheerio from 'cheerio';
import axios from 'axios';
import puppeteer from 'puppeteer';

export class MetrocuadradoScraper {
  public source: ScrapingSource;
  private rateLimiter: RateLimiter;

  constructor() {
    this.source = {
      id: 'metrocuadrado',
      name: 'Metrocuadrado',
      baseUrl: 'https://www.metrocuadrado.com',
      isActive: true,
      priority: 3,
      rateLimit: {
        requestsPerMinute: 25,
        delayBetweenRequests: 2500,
        maxConcurrentRequests: 2
      },
      selectors: {
        propertyCard: '.property-card, .listing-item',
        title: '.property-title, .listing-title',
        price: '.price, .rental-price',
        area: '.area, .size',
        rooms: '.bedrooms, .rooms',
        bathrooms: '.bathrooms, .baños',
        location: '.location, .address',
        amenities: '.amenities, .features',
        images: '.property-image img',
        link: 'a, .property-link',
        nextPage: '.pagination .next'
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    };

    this.rateLimiter = new RateLimiter(this.source.rateLimit);
  }

  /**
   * Scrape Metrocuadrado specifically
   */
  async scrape(criteria: SearchCriteria, maxPages: number = 10): Promise<Property[]> {
    logger.info('Starting Metrocuadrado scraping');

    try {
      const searchUrl = this.buildMetrocuadradoUrl(criteria);
      logger.info(`Metrocuadrado URL: ${searchUrl}`);

      const allProperties: Property[] = [];
      let currentPage = 1;

      while (currentPage <= maxPages) {
        await this.rateLimiter.waitForSlot();

        try {
          const pageUrl = currentPage === 1 ? searchUrl : `${searchUrl}&page=${currentPage}`;

          const response = await axios.get(pageUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
              'Accept-Language': 'es-CO,es-419;q=0.9,es;q=0.8,en;q=0.7',
              'Accept-Encoding': 'gzip, deflate, br',
              'Referer': 'https://www.metrocuadrado.com/',
              'Connection': 'keep-alive',
              'Upgrade-Insecure-Requests': '1',
              'Sec-Fetch-Dest': 'document',
              'Sec-Fetch-Mode': 'navigate',
              'Sec-Fetch-Site': 'same-origin',
              'Sec-Fetch-User': '?1',
              'Cache-Control': 'max-age=0'
            },
            timeout: 30000
          });

          // Metrocuadrado SIEMPRE usa headless (contenido dinámico con JavaScript)
          logger.info(`Metrocuadrado: Using headless browser for page ${currentPage}`);
          try {
            const pageProperties = await this.scrapeMetrocuadradoHeadless(pageUrl, criteria);
            if (pageProperties.length > 0) {
              allProperties.push(...pageProperties);
              logger.info(`Metrocuadrado headless page ${currentPage}: ${pageProperties.length} properties found`);
            } else {
              logger.info(`No properties found with headless on page ${currentPage}, stopping`);
              break;
            }
          } catch (e) {
            logger.error('Metrocuadrado headless failed:', e);
            break;
          }



          // Metrocuadrado pagination is handled by headless browser

          currentPage++;

          // Add delay between requests
          await new Promise(resolve => setTimeout(resolve, 2500));

        } catch (error) {
          logger.error(`Error scraping Metrocuadrado page ${currentPage}:`, error);
          break;
        }
      }

      logger.info(`Metrocuadrado scraping completed: ${allProperties.length} properties found`);
      return allProperties;

    } catch (error) {
      logger.error('Metrocuadrado scraping failed:', error);
      throw error;
    }
  }

  /**
   * Build Metrocuadrado search URL - UNIFICADO
   */
  private buildMetrocuadradoUrl(criteria: SearchCriteria): string {
    // USAR NUEVO LOCATIONDETECTOR OPTIMIZADO
    const locationText = criteria.hardRequirements.location?.neighborhoods?.join(' ') || 'bogotá';
    const locationInfo = LocationDetector.detectLocation(locationText);

    const baseUrl = 'https://www.metrocuadrado.com/apartamentos/arriendo';
    const url = LocationDetector.buildScraperUrl(baseUrl, locationInfo.city, locationInfo.neighborhood, 'standard');

    logger.info(`🎯 Metrocuadrado - Ubicación detectada: ${locationInfo.city} ${locationInfo.neighborhood || ''} (confianza: ${locationInfo.confidence})`);

    // Agregar parámetros específicos de Metrocuadrado
    const params = new URLSearchParams({
      'search': 'form',
      'orden': 'relevancia'
    });

    const finalUrl = `${url}?${params}`;
    logger.info(`Metrocuadrado URL dinámico: ${finalUrl}`);
    return finalUrl;
  }

  /**
   * Extract properties from Metrocuadrado HTML
   */
  private extractMetrocuadradoProperties($: cheerio.CheerioAPI, criteria: SearchCriteria): Property[] {
    // IMPORTANT: Disable simple text-based fallback to avoid non-real items.
    // We only return real cards (static) or headless results.
    logger.info('🔍 Metrocuadrado: Simple fallback disabled to enforce REAL results only');
    return [];
  }


  // Extract cards reales con cheerio
  private extractMetrocuadradoPropertiesFromCards($: cheerio.CheerioAPI, criteria: SearchCriteria): Property[] {
    const properties: Property[] = [];

    const selectors = [
      // Selectores actualizados 2024
      '[data-testid="property-card"]',
      '.property-card',
      '.listing-card',
      '.search-result-item',
      '.inmueble-card',
      '.resultado-busqueda .inmueble',
      '.result-item',
      '[class*="resultado"]',
      '[class*="listing"]',
      '[class*="property"]',
      '[class*="inmueble"]',
      'article[class*="card"]',
      'div[class*="card"]',
      'li[class*="item"]',
      '[data-testid*="card"]',
      '[data-testid*="property"]'
    ];

    let cards: cheerio.Cheerio<any> = $();
    for (const sel of selectors) {
      cards = $(sel);
      if (cards.length > 0) {
        logger.info(`Metrocuadrado: found ${cards.length} cards with selector ${sel}`);
        break;
      }
    }

    if (cards.length === 0) return [];

    cards.each((idx, el) => {
      const $c = $(el);
      const title = $c.find('.listing-title, .title, h3, h4').first().text().trim();
      const priceText = $c.find('.price, .valor, .listing-price').first().text().trim();
      const url = $c.find('a[href]').first().attr('href') || '';
      const img = $c.find('img').first().attr('src') || '';
      const loc = $c.find('.location, .barrio, .address').first().text().trim();

      const price = parseInt((priceText || '').replace(/[^\d]/g, '')) || 0;
      if (!title || price <= 0) return;

      // Extract rooms and bathrooms from title/description
      const fullText = `${title} ${loc}`.toLowerCase();

      // Extract rooms
      let rooms = 0;
      const roomsMatches = [
        fullText.match(/(\d+)\s*hab/i),
        fullText.match(/(\d+)\s*habitacion/i),
        fullText.match(/(\d+)\s*alcoba/i),
        fullText.match(/(\d+)\s*dormitorio/i),
        fullText.match(/(\d+)\s*cuarto/i)
      ];
      for (const match of roomsMatches) {
        if (match) {
          rooms = parseInt(match[1]) || 0;
          break;
        }
      }

      // Extract bathrooms
      let bathrooms = 0;
      const bathroomMatches = [
        fullText.match(/(\d+)\s*baño/i),
        fullText.match(/(\d+)\s*bathroom/i)
      ];
      for (const match of bathroomMatches) {
        if (match) {
          bathrooms = parseInt(match[1]) || 0;
          break;
        }
      }

      // Extract area
      let area = 0;
      const areaMatch = fullText.match(/(\d+)\s*m[²2]/i);
      if (areaMatch) {
        area = parseInt(areaMatch[1]) || 0;
      }

      const prop: Property = {
        id: `metrocuadrado_${Date.now()}_${idx}`,
        title,
        price,
        adminFee: 0,
        totalPrice: price,
        area,
        rooms,
        bathrooms,
        location: { address: loc, neighborhood: '', city: 'Dynamic' },
        images: img ? [img] : [],
        url: url.startsWith('http') ? url : `https://www.metrocuadrado.com${url}`,
        source: 'Metrocuadrado',
        description: '',
        amenities: [],
        scrapedDate: new Date().toISOString(),
        pricePerM2: area > 0 ? Math.round(price / area) : 0,
        isActive: true
      };

      if (price <= criteria.hardRequirements.maxTotalPrice) {
        properties.push(prop);
      }
    });

    return properties;
  }

  private async scrapeMetrocuadradoHeadless(pageUrl: string, criteria: SearchCriteria): Promise<Property[]> {
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage'] });
    const page = await browser.newPage();
    try {
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForSelector('body', { timeout: 10000 }).catch(()=>{});
      // scroll para forzar render
      await page.evaluate(() => {
        return new Promise((resolve) => {
          let total = 0;
          const step = () => {
            window.scrollBy(0, 1200);
            total += 1200;
            if (total < 8000) {
              setTimeout(step, 300);
            } else {
              resolve(true);
            }
          };
          step();
        });
      });
      // Esperar a que se cargue el contenido dinámico
      await new Promise(resolve => setTimeout(resolve, 5000)); // Dar tiempo para que JavaScript cargue
      await page.waitForSelector('[class*="property"], .card-property, .property-card, .listing-card, [data-testid*="property"], [data-testid*="card"]', { timeout: 20000 }).catch(()=>{});

      const items = await page.evaluate(() => {
        const out: Array<{
          title: string;
          priceText: string;
          url: string;
          img: string;
          loc: string;
          area: string;
          rooms: string;
          bathrooms: string;
          fullText: string;
        }> = [];

        const doc: any = (globalThis as any).document;

        // Selectores más específicos para Metrocuadrado
        const selectors = [
          '.listing-card',
          '.result-item',
          '[class*="resultado"]',
          '[class*="property"]',
          '[class*="inmueble"]',
          'article',
          'li[class*="item"]',
          '[data-testid*="card"]'
        ];

        let cards: any[] = [];
        for (const selector of selectors) {
          const elements = doc.querySelectorAll(selector);
          if (elements.length > 0) {
            cards = Array.from(elements);
            console.log(`Found ${cards.length} cards with selector: ${selector}`);
            break;
          }
        }

        cards.forEach((el: any) => {
          const fullText = el.textContent?.trim() || '';

          // Título más específico
          const titleSelectors = [
            '.listing-title',
            '.title',
            '.property-title',
            'h3',
            'h4',
            'h2',
            '[class*="title"]'
          ];
          let title = '';
          for (const sel of titleSelectors) {
            const titleEl = el.querySelector(sel);
            if (titleEl?.textContent?.trim()) {
              title = titleEl.textContent.trim();
              break;
            }
          }

          // Precio más específico
          const priceSelectors = [
            '.price',
            '.valor',
            '.listing-price',
            '[class*="price"]',
            '[class*="valor"]',
            '[class*="precio"]'
          ];
          let priceText = '';
          for (const sel of priceSelectors) {
            const priceEl = el.querySelector(sel);
            if (priceEl?.textContent?.trim()) {
              priceText = priceEl.textContent.trim();
              break;
            }
          }

          // Si no encontramos precio en elementos específicos, buscar en el texto completo
          if (!priceText) {
            const priceMatch = fullText.match(/\$\s*[\d,\.]+/);
            if (priceMatch) {
              priceText = priceMatch[0];
            }
          }

          // URL
          const linkEl: any = el.querySelector('a[href]');
          const link = linkEl ? (linkEl.href || linkEl.getAttribute('href')) : '';

          // Imagen
          const imgEl: any = el.querySelector('img');
          let img = '';
          if (imgEl) {
            img = imgEl.getAttribute?.('data-src') || imgEl.getAttribute?.('data-lazy') || imgEl.getAttribute?.('src') || '';
            if (!img) {
              const srcset = imgEl.getAttribute?.('srcset') || '';
              if (srcset) img = srcset.split(',')[0]?.trim().split(' ')[0] || '';
            }
            // Convertir URLs relativas a absolutas
            if (img && img.startsWith('/')) {
              img = `https://www.metrocuadrado.com${img}`;
            }
          }

          // Ubicación más específica
          const locationSelectors = [
            '.location',
            '.barrio',
            '.address',
            '[class*="location"]',
            '[class*="barrio"]',
            '[class*="zona"]',
            '[class*="sector"]'
          ];
          let loc = '';
          for (const sel of locationSelectors) {
            const locEl = el.querySelector(sel);
            if (locEl?.textContent?.trim()) {
              loc = locEl.textContent.trim();
              break;
            }
          }

          // Extraer área del texto completo
          let area = '';
          const areaMatch = fullText.match(/(\d+)\s*m[²2]/i);
          if (areaMatch) {
            area = areaMatch[1];
          }

          // Extraer habitaciones del texto completo
          let rooms = '';
          const roomsMatches = [
            fullText.match(/(\d+)\s*hab/i),
            fullText.match(/(\d+)\s*habitacion/i),
            fullText.match(/(\d+)\s*alcoba/i),
            fullText.match(/(\d+)\s*dormitorio/i)
          ];
          for (const match of roomsMatches) {
            if (match) {
              rooms = match[1];
              break;
            }
          }

          // Extraer baños del texto completo
          let bathrooms = '';
          const bathroomMatches = [
            fullText.match(/(\d+)\s*baño/i),
            fullText.match(/(\d+)\s*bathroom/i)
          ];
          for (const match of bathroomMatches) {
            if (match) {
              bathrooms = match[1];
              break;
            }
          }

          // USAR EXTRACCIÓN CENTRALIZADA - ELIMINA HARDCODEOS
          if (!loc) {
            const extractedLocation = LocationDetector.detectLocation(fullText);
            if (extractedLocation?.neighborhood) {
              loc = extractedLocation.neighborhood;
            }
          }

          if ((title || priceText) && link) {
            out.push({
              title: title || 'Apartamento en arriendo',
              priceText,
              url: link,
              img,
              loc,
              area,
              rooms,
              bathrooms,
              fullText: fullText.substring(0, 200) // Para debugging
            });
          }
        });

        // Eliminar duplicados basados en URL
        const uniqueItems = out.filter((item, index, self) =>
          index === self.findIndex(t => t.url === item.url)
        );

        return uniqueItems;
      });

      const props: Property[] = [];
      items.forEach((it, idx) => {
        const price = parseInt((it.priceText || '').replace(/[^\d]/g, '')) || 0;
        if (!price) return;

        // Extraer datos mejorados de los nuevos campos
        const area = parseInt((it as any).area || '0') || 0;
        const rooms = parseInt((it as any).rooms || '0') || 0;
        const bathrooms = parseInt((it as any).bathrooms || '0') || 0;

        // Extraer ubicación más específica
        let neighborhood = it.loc || '';
        let address = it.loc || '';

        // Si tenemos información en la URL, extraer barrio usando patrón centralizado
        if (it.url && !neighborhood) {
          const urlMatch = it.url.match(/\/([^\/]+)\/apartamento/); // Patrón simple
          if (urlMatch) {
            neighborhood = urlMatch[1].replace(/-/g, ' ');
          }
        }

        // Extraer información adicional del texto completo
        const fullText = (it as any).fullText || '';

        // Extraer parqueaderos del texto
        let parking = 0;
        const parkingMatch = fullText.match(/(\d+)\s*garaje/i);
        if (parkingMatch) {
          parking = parseInt(parkingMatch[1]);
        }

        // Extraer estrato del texto
        let stratum = 0;
        const stratumMatch = fullText.match(/estrato\s*(\d+)/i);
        if (stratumMatch) {
          stratum = parseInt(stratumMatch[1]);
        }

        const p: Property = {
          id: `m2_headless_${Date.now()}_${idx}`,
          title: it.title || 'Apartamento en arriendo',
          price,
          adminFee: 0,
          totalPrice: price,
          area,
          rooms,
          bathrooms,
          parking,
          stratum,
          location: {
            address: address || neighborhood || 'Centro',
            neighborhood: neighborhood || 'Sin especificar',
            city: 'Dynamic',
            coordinates: { lat: 0, lng: 0 }
          },
          images: it.img ? [it.img] : [],
          url: it.url,
          source: 'Metrocuadrado',
          description: fullText.substring(0, 200) || '',
          amenities: [],
          scrapedDate: new Date().toISOString(),
          pricePerM2: area > 0 ? Math.round(price / area) : 0,
          isActive: true,
          score: 0
        };
        if (price <= criteria.hardRequirements.maxTotalPrice) props.push(p);
      });

      return props;
    } finally {
      await page.close();
      await browser.close();
    }
  }

  }
