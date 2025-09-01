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
    // 🔥 USAR LOCATIONDETECTOR SIN HARDCODING
    const locationText = criteria.hardRequirements.location?.neighborhoods?.join(' ') || '';
    const locationInfo = LocationDetector.detectLocation(locationText);

    // 🔥 DINÁMICO: Determinar tipo de transacción
    const transactionType = this.getTransactionType(criteria);
    const propertyType = 'apartamentos'; // Por ahora apartamentos, se puede hacer dinámico después

    const baseUrl = `https://www.metrocuadrado.com/${propertyType}/${transactionType}`;
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
   * Determinar tipo de transacción dinámicamente
   */
  private getTransactionType(criteria: SearchCriteria): string {
    // 🚀 IMPLEMENTADO: Usar el campo operation de SearchCriteria
    const operation = criteria.hardRequirements.operation || 'arriendo';

    // Mapear a los valores que usa Metrocuadrado
    switch (operation.toLowerCase()) {
      case 'venta':
      case 'compra':
        return 'venta';
      case 'arriendo':
      case 'alquiler':
      default:
        return 'arriendo';
    }
  }

  /**
   * Extract properties from Metrocuadrado HTML
   */
  private extractMetrocuadradoProperties($: cheerio.CheerioAPI, criteria: SearchCriteria): Property[] {
    // 🔧 HABILITAR EXTRACCIÓN ESTÁTICA COMO FALLBACK
    logger.info('🔍 Metrocuadrado: Trying static extraction as fallback');
    return this.extractMetrocuadradoPropertiesFromCards($, criteria);
  }


  // Extract cards reales con cheerio
  private extractMetrocuadradoPropertiesFromCards($: cheerio.CheerioAPI, criteria: SearchCriteria): Property[] {
    const properties: Property[] = [];

    const selectors = [
      // 🔧 SELECTORES MEJORADOS PARA METROCUADRADO 2024
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
      '[data-testid*="property"]',
      // 🆕 SELECTORES MÁS AGRESIVOS
      'article',
      'div[class*="MuiGrid"]',
      '.MuiGrid-item',
      '[class*="Grid"]',
      'div[id*="property"]',
      'div[id*="inmueble"]',
      'li',
      'div[class*="item"]',
      'div[class*="result"]'
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

      // Extract rooms and bathrooms from title/description
      const fullText = `${title} ${loc} ${priceText}`.toLowerCase();

      // 🔧 RELAJAR VALIDACIÓN PARA METROCUADRADO - Aceptar más propiedades
      if (!title && !priceText && fullText.length < 20) return;

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

      // 🔧 RELAJAR VALIDACIÓN FINAL - Aceptar propiedades con datos básicos
      if (title || price > 0 || area > 0 || rooms > 0) {
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

          // EXTRACCIÓN SIMPLE DE UBICACIÓN - SIN DEPENDENCIAS EXTERNAS
          if (!loc) {
            // 🔥 DINÁMICO: Buscar patrones comunes de barrios en el texto
            const locationPatterns = [
              /en\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ\s]+),?\s*(?:bogotá|medellín|cali|barranquilla)/i,
              /ubicado\s+en\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ\s]+)/i,
              /barrio\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ\s]+)/i,
              /sector\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ\s]+)/i
            ];

            for (const pattern of locationPatterns) {
              const match = fullText.match(pattern);
              if (match && match[1]) {
                loc = match[1].trim();
                break;
              }
            }
          }

          if ((title || priceText) && link) {
            out.push({
              title: title || 'Apartamento',
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

        // 🆕 EXTRAER DATOS MEJORADOS CON PATRONES ESPECÍFICOS
        const fullText = `${it.title} ${it.loc}`.toLowerCase();

        // Extraer área con patrones mejorados
        let area = parseInt((it as any).area || '0') || 0;
        if (!area) {
          const areaPatterns = [
            /(\d+(?:\.\d+)?)\s*(?:m2|m²|metros|mts|mt)/i,
            /(?:area|área|superficie)[:\s]*(\d+(?:\.\d+)?)/i
          ];
          for (const pattern of areaPatterns) {
            const match = fullText.match(pattern);
            if (match) {
              area = parseFloat(match[1]) || 0;
              break;
            }
          }
        }

        // Extraer habitaciones con patrones mejorados
        let rooms = parseInt((it as any).rooms || '0') || 0;
        if (!rooms) {
          const roomsPatterns = [
            /(\d+)\s*(?:hab|habitacion|habitaciones|alcoba|alcobas|dormitorio|dormitorios)/i,
            /(?:hab|habitacion|habitaciones|alcoba|alcobas)[:\s]*(\d+)/i
          ];
          for (const pattern of roomsPatterns) {
            const match = fullText.match(pattern);
            if (match) {
              rooms = parseInt(match[1]) || 0;
              break;
            }
          }
        }

        // Extraer baños con patrones mejorados
        let bathrooms = parseInt((it as any).bathrooms || '0') || 0;
        if (!bathrooms) {
          const bathroomPatterns = [
            /(\d+)\s*(?:baño|baños|bathroom|bathrooms)/i,
            /(?:baño|baños|bathroom|bathrooms)[:\s]*(\d+)/i
          ];
          for (const pattern of bathroomPatterns) {
            const match = fullText.match(pattern);
            if (match) {
              bathrooms = parseInt(match[1]) || 0;
              break;
            }
          }
        }

        // 🆕 EXTRAER PARQUEADEROS CON PATRONES MEJORADOS
        let parking = 0;
        const parkingPatterns = [
          /(\d+)\s*(?:parq|parqueadero|parqueaderos|garage|garaje|parking)/i,
          /(?:parq|parqueadero|parqueaderos|garage|garaje|parking)[:\s]*(\d+)/i
        ];
        for (const pattern of parkingPatterns) {
          const match = fullText.match(pattern);
          if (match) {
            parking = parseInt(match[1]) || 0;
            break;
          }
        }

        // 🆕 EXTRAER ESTRATO CON PATRONES MEJORADOS
        let stratum = 0;
        const stratumPatterns = [
          /(?:estrato|est)[:\s]*(\d+)/i,
          /(\d+)\s*(?:estrato|est)/i
        ];
        for (const pattern of stratumPatterns) {
          const match = fullText.match(pattern);
          if (match) {
            stratum = parseInt(match[1]) || 0;
            break;
          }
        }

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

        // ✅ Ya tenemos parking y stratum extraídos arriba con patrones mejorados

        const p: Property = {
          id: `m2_headless_${Date.now()}_${idx}`,
          title: it.title || 'Apartamento',
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
