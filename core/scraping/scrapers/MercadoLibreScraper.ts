import { BaseScraper } from '../BaseScraper';
import { Property, SearchCriteria, ScrapingSource } from '../../types';
import { RateLimiter } from '../../scraping/RateLimiter';
import { logger } from '../../../utils/logger';
import { SmartExtractor } from '../utils/SmartExtractor';
import { PropertyEnhancer } from '../utils/PropertyEnhancer';
import * as cheerio from 'cheerio';
import axios from 'axios';
import puppeteer from 'puppeteer';

export class MercadoLibreScraper extends BaseScraper {
  constructor(source: ScrapingSource, rateLimiter: RateLimiter) {
    super(source, rateLimiter);
  }

  /**
   * Scrape MercadoLibre specifically
   */
  async scrape(criteria: SearchCriteria, maxPages: number = 10): Promise<Property[]> {
    logger.info('Starting MercadoLibre scraping');
    
    try {
      const searchUrl = this.buildMercadoLibreUrl(criteria);
      logger.info(`MercadoLibre URL: ${searchUrl}`);

      const allProperties: Property[] = [];
      let currentPage = 1;

      while (currentPage <= maxPages) {
        await this.rateLimiter.waitForSlot();

        try {
          const pageUrl = currentPage === 1 ? searchUrl : `${searchUrl}_Desde_${(currentPage - 1) * 50 + 1}`;
          logger.info(`Scraping MercadoLibre page ${currentPage}: ${pageUrl}`);

          const response = await axios.get(pageUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
              'Accept-Language': 'es-CO,es-419;q=0.9,es;q=0.8,en;q=0.7',
              'Accept-Encoding': 'gzip, deflate, br',
              'Referer': 'https://inmuebles.mercadolibre.com.co/',
              'Connection': 'keep-alive',
              'Upgrade-Insecure-Requests': '1',
              'Sec-Fetch-Dest': 'document',
              'Sec-Fetch-Mode': 'navigate',
              'Sec-Fetch-Site': 'same-origin',
              'Sec-Fetch-User': '?1',
              'Cache-Control': 'max-age=0',
              'DNT': '1'
            },
            timeout: 30000
          });

          // MercadoLibre SIEMPRE usa headless (contenido dinámico)
          logger.info(`MercadoLibre: Using headless browser for page ${currentPage}`);
          try {
            const pageProperties = await this.scrapeMercadoLibreHeadless(pageUrl, criteria);
            if (pageProperties.length > 0) {
              allProperties.push(...pageProperties);
              logger.info(`MercadoLibre headless page ${currentPage}: ${pageProperties.length} properties found`);
            } else {
              logger.info(`No properties found with headless on page ${currentPage}, stopping`);
              break;
            }
          } catch (e) {
            logger.error('MercadoLibre headless failed:', e);
            break;
          }

          currentPage++;

        } catch (error) {
          logger.error(`Error scraping MercadoLibre page ${currentPage}:`, error);
          currentPage++;
          
          if (currentPage > 3 && allProperties.length === 0) {
            logger.warn('Too many consecutive errors, stopping MercadoLibre scraping');
            break;
          }
        }
      }

      logger.info(`MercadoLibre scraping completed: ${allProperties.length} total properties`);
      return allProperties;

    } catch (error) {
      logger.error('MercadoLibre scraping failed:', error);
      return [];
    }
  }

  /**
   * Build MercadoLibre search URL
   */
  private buildMercadoLibreUrl(criteria: SearchCriteria): string {
    // MercadoLibre uses a different URL structure
    let baseUrl = 'https://inmuebles.mercadolibre.com.co/apartamentos/arriendo/bogota';

    // Add neighborhood filter if specified
    if (criteria.hardRequirements.location?.neighborhoods?.length) {
      const neighborhood = criteria.hardRequirements.location.neighborhoods[0];
      // Map neighborhood names to MercadoLibre search terms
      const neighborhoodMap: Record<string, string> = {
        'usaquen': 'usaquen',
        'usaquén': 'usaquen',
        'cedritos': 'cedritos',
        'chapinero': 'chapinero',
        'zona rosa': 'zona-rosa',
        'chico': 'chico',
        'rosales': 'rosales',
        'la candelaria': 'candelaria',
        'centro': 'centro',
        'santa barbara': 'santa-barbara',
        'country club': 'country-club'
      };

      const mappedNeighborhood = neighborhoodMap[neighborhood.toLowerCase()];
      if (mappedNeighborhood) {
        // Add neighborhood to search URL
        baseUrl += `/${mappedNeighborhood}`;
      }
    }

    return baseUrl;
  }

  /**
   * Extract properties from MercadoLibre HTML
   */
  private extractMercadoLibreProperties($: cheerio.CheerioAPI, criteria: SearchCriteria): Property[] {
    const properties: Property[] = [];
    
    // MercadoLibre specific selectors - Actualizados 2024
    const selectors = [
      '.ui-search-result',
      '.ui-search-result__wrapper',
      '.ui-search-layout__item',
      '.ui-search-item',
      '.ui-search-result__content',
      '[data-testid="result"]',
      '[class*="ui-search"]',
      '[class*="card"]',
      '.item',
      'article[class*="item"]',
      'div[class*="result"]'
    ];

    let propertyCards: cheerio.Cheerio<any> = $();
    
    for (const selector of selectors) {
      propertyCards = $(selector);
      if (propertyCards.length > 0) {
        logger.info(`Found ${propertyCards.length} properties using selector: ${selector}`);
        break;
      }
    }

    if (propertyCards.length === 0) {
      logger.warn('No property cards found on MercadoLibre');
      return properties;
    }

    propertyCards.each((index, card) => {
      try {
        const $card = $(card);

        // Use SmartExtractor for better title extraction
        const title = SmartExtractor.extractTitle($, $card);

        // Ignore room rentals and duplicates cues in title
        if (/habitaci[oó]n/i.test(title)) {
          return; // skip room listings
        }

        // Use SmartExtractor for better price extraction
        const priceText = SmartExtractor.extractPrice($, $card);

        // Extract location with more selectors
        let location = this.extractText($card, [
          '.item-location',
          '[class*="location"]',
          '.ui-search-item__location',
          '.ui-search-item__group__element .ui-search-item__location',
          '.ui-search-item__subtitle',
          '[class*="subtitle"]',
          '.ui-search-item__group__element span'
        ]);

        // If no location found, use default
        if (!location || location.trim() === '') {
          location = 'Usaquén, Bogotá';
        }

        // Extract URL
        let propertyUrl = this.extractAttribute($card, ['a.ui-search-link', 'a'], 'href');

        // Extract image with aggressive fallbacks
        let imageUrl = '';

        // Try multiple image selectors
        const imageSelectors = [
          '.ui-search-result-image img',
          '.ui-search-item__image img',
          '.item-image img',
          'img[src*="http"]',
          'img[data-src*="http"]',
          'img'
        ];

        for (const selector of imageSelectors) {
          const $img = $card.find(selector).first();
          if ($img.length > 0) {
            const src = $img.attr('src') || '';
            const dataSrc = $img.attr('data-src') || '';
            const dataLazy = $img.attr('data-lazy') || '';
            const dataOriginal = $img.attr('data-original') || '';

            // Priorizar data-src si src es un placeholder de lazy loading
            if (src.includes('data:image/gif;base64') || src.includes('placeholder')) {
              imageUrl = dataSrc || dataLazy || dataOriginal || src;
            } else {
              imageUrl = src || dataSrc || dataLazy || dataOriginal;
            }

            if (imageUrl && imageUrl.length > 10 && !imageUrl.includes('data:image/gif')) {
              break;
            }
          }
        }

        // Try srcset as fallback
        if (!imageUrl) {
          const $img = $card.find('img').first();
          const srcset = $img.attr('srcset');
          if (srcset) {
            const firstUrl = srcset.split(',')[0]?.trim().split(' ')[0];
            if (firstUrl) imageUrl = firstUrl;
          }
        }

        // Ensure image URL is absolute and valid
        if (imageUrl) {
          if (imageUrl.startsWith('//')) {
            imageUrl = `https:${imageUrl}`;
          } else if (imageUrl.startsWith('/')) {
            imageUrl = `https://http2.mlstatic.com${imageUrl}`;
          }

          // Validate image URL
          if (!imageUrl.includes('.jpg') && !imageUrl.includes('.jpeg') &&
              !imageUrl.includes('.png') && !imageUrl.includes('.webp')) {
            imageUrl = '';
          }
        }

        // Parse price with fallbacks
        let price = this.parsePrice(priceText);
        if (!price || price === 0) {
          const textAll = $card.text();
          const match = textAll.match(/\$\s*[\d\.\,]+/);
          if (match) {
            price = this.parsePrice(match[0]);
          }
        }

        // Extract detailed property data
        let area = 0;
        let rooms = 0;
        let bathrooms = 0;
        let parking = 0;

        // Get all text from the card for comprehensive extraction
        const allText = $card.text();

        // Extract area (m², metros, m2)
        const areaPatterns = [
          /(\d+)\s*m[²2]/i,
          /(\d+)\s*metros/i,
          /área[:\s]*(\d+)/i,
          /superficie[:\s]*(\d+)/i
        ];

        for (const pattern of areaPatterns) {
          const match = allText.match(pattern) || title.match(pattern);
          if (match) {
            const extractedArea = parseInt(match[1]);
            if (extractedArea > 20 && extractedArea < 1000) {
              area = extractedArea;
              break;
            }
          }
        }

        // Extract rooms (habitaciones, alcobas, dormitorios)
        const roomPatterns = [
          /(\d+)\s*(?:hab|habitaci[oó]n|alcoba|dormitorio|bedroom)s?/i,
          /(\d+)\s*cuarto/i,
          /(\d+)\s*rec[aá]mara/i
        ];

        for (const pattern of roomPatterns) {
          const match = allText.match(pattern) || title.match(pattern);
          if (match) {
            const extractedRooms = parseInt(match[1]);
            if (extractedRooms >= 1 && extractedRooms <= 10) {
              rooms = extractedRooms;
              break;
            }
          }
        }

        // Extract bathrooms (baños)
        const bathroomPatterns = [
          /(\d+)\s*ba[ñn]o/i,
          /(\d+)\s*bathroom/i,
          /(\d+)\s*wc/i
        ];

        for (const pattern of bathroomPatterns) {
          const match = allText.match(pattern);
          if (match) {
            const extractedBathrooms = parseInt(match[1]);
            if (extractedBathrooms >= 1 && extractedBathrooms <= 6) {
              bathrooms = extractedBathrooms;
              break;
            }
          }
        }

        // Extract parking (parqueadero, garaje)
        const parkingPatterns = [
          /(\d+)\s*parqueadero/i,
          /(\d+)\s*garaje/i,
          /(\d+)\s*parking/i,
          /(\d+)\s*cochera/i
        ];

        for (const pattern of parkingPatterns) {
          const match = allText.match(pattern);
          if (match) {
            const extractedParking = parseInt(match[1]);
            if (extractedParking >= 0 && extractedParking <= 5) {
              parking = extractedParking;
              break;
            }
          }
        }

        // Set intelligent defaults based on price and area
        if (area === 0) {
          // Estimate area based on price (Colombian market)
          if (price > 5000000) area = 120;
          else if (price > 3000000) area = 90;
          else if (price > 2000000) area = 75;
          else if (price > 1000000) area = 60;
          else area = 50;
        }

        if (rooms === 0) {
          // Estimate rooms based on area
          if (area > 100) rooms = 4;
          else if (area > 80) rooms = 3;
          else if (area > 60) rooms = 2;
          else rooms = 1;
        }

        if (bathrooms === 0) {
          // Estimate bathrooms based on rooms
          if (rooms >= 4) bathrooms = 3;
          else if (rooms >= 3) bathrooms = 2;
          else bathrooms = 1;
        }

        if (parking === 0) {
          // Estimate parking based on price and rooms
          if (price > 3000000 && rooms >= 3) parking = 1;
          else parking = 0;
        }

        // Create property if it has minimum required data
        if (title && price > 0) {
          const pricePerM2 = area > 0 ? Math.round(price / area) : 0;
          const property: Property = {
            id: `mercadolibre_${Date.now()}_${index}`,
            title: title,
            price: price,
            adminFee: 0,
            totalPrice: price,
            area: area,
            rooms: rooms,
            bathrooms: bathrooms,
            parking: parking,
            location: {
              address: location,
              neighborhood: this.extractNeighborhood(location),
              city: 'Bogotá',
              coordinates: { lat: 0, lng: 0 }
            },
            amenities: [], // Would need to extract from detail page
            images: imageUrl ? [this.normalizeUrl(imageUrl)] : [],
            url: propertyUrl ? this.normalizeUrl(propertyUrl) : '',
            source: this.source.name,
            scrapedDate: new Date().toISOString(),
            pricePerM2,
            description: '',
            isActive: true
          };

          // Enhance property with intelligent fallbacks
          const enhancedProperty = PropertyEnhancer.enhance(property, {
            neighborhood: criteria.hardRequirements.location?.neighborhoods?.[0],
            source: 'MercadoLibre',
            searchCriteria: criteria
          });

          // Apply basic filtering
          if (this.meetsBasicCriteria(enhancedProperty, criteria)) {
            properties.push(enhancedProperty);
          }
        }

      } catch (error) {
        logger.warn(`Error extracting MercadoLibre property ${index}:`, error);
      }
    });

    return properties;
  }

  /**
   * Extract neighborhood from location text
   */
  private extractNeighborhood(locationText: string): string {
    if (!locationText) return '';

    // Remove "Bogotá" and get neighborhood
    const cleaned = locationText.replace(/,?\s*bogotá/i, '').trim();
    const parts = cleaned.split(',');

    return parts[0]?.trim() || '';
  }

  private async scrapeMercadoLibreHeadless(pageUrl: string, criteria: SearchCriteria): Promise<Property[]> {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
    });
    const page = await browser.newPage();

    try {
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      await page.setViewport({ width: 1366, height: 800 });
      await page.goto(pageUrl, { waitUntil: 'networkidle2', timeout: 45000 });
      await page.waitForSelector('body', { timeout: 10000 }).catch(() => {});

      const rawItems = await page.evaluate(() => {
        const items: Array<{title: string; priceText: string; url: string; imageUrl: string; location: string;}> = [];
        const doc: any = (globalThis as any).document;
        const cards = doc ? Array.from(doc.querySelectorAll('.ui-search-result, .ui-search-result__wrapper, .ui-search-layout__item')) : [];

        cards.forEach((el: any) => {
          const titleEl = el.querySelector('h2, .ui-search-item__title');
          const priceEl = el.querySelector('.andes-money-amount__fraction, .ui-search-price__part, .price-tag-amount');
          const linkEl = el.querySelector('a.ui-search-link, a');
          const imgEl = el.querySelector('img');
          const locationEl = el.querySelector('.ui-search-item__location, [class*="location"]');

          const title = titleEl?.textContent?.trim() || '';
          let priceText = '';
          if (priceEl) {
            priceText = priceEl.textContent?.trim() || '';
          } else {
            const m = (el.textContent || '').match(/\$\s*[\d\.,]+/);
            priceText = m ? m[0] : '';
          }
          const url = linkEl?.href || '';
          // Mejorar extracción de imagen para lazy loading
          let imageUrl = '';
          if (imgEl) {
            const src = imgEl.src || '';
            const dataSrc = imgEl.getAttribute('data-src') || '';
            const dataLazy = imgEl.getAttribute('data-lazy') || '';

            // Priorizar data-src si src es placeholder
            if (src.includes('data:image/gif;base64') || src.includes('placeholder')) {
              imageUrl = dataSrc || dataLazy || src;
            } else {
              imageUrl = src || dataSrc || dataLazy;
            }
          }
          const location = locationEl?.textContent?.trim() || '';

          if ((title || priceText) && url) {
            items.push({ title, priceText, url, imageUrl, location });
          }
        });
        return items;
      });

      const properties: Property[] = [];
      rawItems.forEach((it, index) => {
        const price = this.parsePrice(it.priceText);
        if (!price || price <= 0) return;

        const property: Property = {
          id: `mercadolibre_headless_${Date.now()}_${index}`,
          title: it.title || 'Apartamento en arriendo',
          price,
          adminFee: 0,
          totalPrice: price,
          area: 0,
          rooms: 0,
          bathrooms: 0,
          location: {
            address: it.location,
            neighborhood: this.extractNeighborhood(it.location),
            city: 'Bogotá',
            coordinates: { lat: 0, lng: 0 }
          },
          amenities: [],
          images: it.imageUrl ? [it.imageUrl] : [],
          url: it.url,
          source: this.source.name,
          scrapedDate: new Date().toISOString(),
          pricePerM2: 0,
          description: '',
          isActive: true
        };

        if (this.meetsBasicCriteria(property, criteria)) {
          properties.push(property);
        }
      });

      return properties;
    } finally {
      await page.close();
      await browser.close();
    }
  }

  /**
   * Normalize URLs
   */
  private normalizeUrl(url: string): string {
    if (!url) return '';
    
    if (url.startsWith('http')) {
      return url;
    }
    
    if (url.startsWith('/')) {
      return `https://inmuebles.mercadolibre.com.co${url}`;
    }
    
    return `https://inmuebles.mercadolibre.com.co/${url}`;
  }

  /**
   * Check if property meets basic criteria
   */
  private meetsBasicCriteria(property: Property, criteria: SearchCriteria): boolean {
    // Price check
    if (property.price > criteria.hardRequirements.maxTotalPrice) {
      return false;
    }

    // Rooms check (if available)
    if (property.rooms > 0) {
      if (property.rooms < criteria.hardRequirements.minRooms ||
          (criteria.hardRequirements.maxRooms !== undefined && property.rooms > criteria.hardRequirements.maxRooms)) {
        return false;
      }
    }

    // Area check (if available)
    if (property.area > 0) {
      if (property.area < criteria.hardRequirements.minArea ||
          (criteria.hardRequirements.maxArea !== undefined && property.area > criteria.hardRequirements.maxArea)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Extract text using multiple selectors
   */
  private extractText($card: cheerio.Cheerio<any>, selectors: string[]): string {
    for (const selector of selectors) {
      const text = $card.find(selector).first().text().trim();
      if (text) return text;
    }
    return '';
  }

  /**
   * Extract attribute using multiple selectors
   */
  private extractAttribute($card: cheerio.Cheerio<any>, selectors: string[], attribute: string): string {
    for (const selector of selectors) {
      const attr = $card.find(selector).first().attr(attribute);
      if (attr) return attr.trim();
    }
    return '';
  }

  /**
   * Parse price from text
   */
  private parsePrice(priceText: string): number {
    if (!priceText) return 0;
    
    const cleanPrice = priceText.replace(/[^\d]/g, '');
    return parseInt(cleanPrice) || 0;
  }
}
