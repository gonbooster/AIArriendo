import { Property, SearchCriteria, ScrapingSource } from '../../types';
import { RateLimiter } from '../RateLimiter';
import { LocationDetector } from '../../utils/LocationDetector';
import { logger } from '../../../utils/logger';
import * as cheerio from 'cheerio';
import axios from 'axios';
import puppeteer, { Browser, Page } from 'puppeteer';

export class ProperatiScraper {
  public source: ScrapingSource;
  private rateLimiter: RateLimiter;

  constructor() {
    this.source = {
      id: 'properati',
      name: 'Properati',
      baseUrl: 'https://www.properati.com.co',
      isActive: true,
      priority: 5,
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
   * Scrape Properati specifically
   */
  async scrape(criteria: SearchCriteria, maxPages: number = 10): Promise<Property[]> {
    logger.info('Starting Properati scraping');

    try {
      const searchUrl = this.buildProperatiUrl(criteria);
      logger.info(`Properati URL: ${searchUrl}`);

      const allProperties: Property[] = [];
      let currentPage = 1;

      while (currentPage <= maxPages) {
        await this.rateLimiter.waitForSlot();

        try {
          const pageUrl = currentPage === 1 ? searchUrl : `${searchUrl}?page=${currentPage}`;
          logger.info(`Scraping Properati page ${currentPage}: ${pageUrl}`);

          const response = await axios.get(pageUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
              'Accept-Language': 'es-CO,es;q=0.9,en;q=0.8',
              'Referer': 'https://www.properati.com.co/',
              'Connection': 'keep-alive'
            },
            timeout: 30000
          });

          const $ = cheerio.load(response.data);
          let pageProperties = this.extractProperatiProperties($, criteria);

          // Fallback: if static HTML yielded 0, try headless for this page (any page)
          if (pageProperties.length === 0) {
            logger.warn('No properties from static HTML. Trying headless mode for Properati...');
            try {
              const headlessProps = await this.scrapeProperatiHeadless(pageUrl, criteria);
              if (headlessProps.length > 0) {
                pageProperties = headlessProps;
              }
            } catch (e) {
              logger.warn('Headless fallback for Properati failed:', e);
            }
          }

          if (pageProperties.length === 0) {
            logger.info(`No properties found on Properati page ${currentPage}, stopping`);
            break;
          }

          allProperties.push(...pageProperties);
          logger.info(`Properati page ${currentPage}: ${pageProperties.length} properties found`);

          currentPage++;

        } catch (error) {
          logger.error(`Error scraping Properati page ${currentPage}:`, error);
          currentPage++;

          if (currentPage > 3 && allProperties.length === 0) {
            logger.warn('Too many consecutive errors, stopping Properati scraping');
            break;
          }
        }
      }

      logger.info(`Properati scraping completed: ${allProperties.length} total properties`);
      return allProperties;

    } catch (error) {
      logger.error('Properati scraping failed:', error);
      return [];
    }
  }

  private async scrapeProperatiHeadless(pageUrl: string, criteria: SearchCriteria): Promise<Property[]> {
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();
    try {
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      await page.setViewport({ width: 1366, height: 800 });

      await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

      // Try to wait for any recognizable container
      await page.waitForSelector('body', { timeout: 10000 }).catch(() => {});
      // Scroll para asegurarnos de cargar tarjetas
      await page.evaluate(() => {
        return new Promise((resolve) => {
          let total = 0;
          const step = () => {
            (globalThis as any).scrollBy(0, 1200);
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
      await page.waitForSelector('[data-qa="POSTING_TITLE"], .posting-card, article, li', { timeout: 15000 }).catch(()=>{});

      const rawItems = await page.evaluate(() => {
        const items: Array<{title: string; priceText: string; location: string; url: string; imageUrl: string; features: string;}> = [];
        const doc: any = (globalThis as any).document;
        const nodeList: any[] = doc ? Array.from(doc.querySelectorAll('[data-qa="POSTING_TITLE"], .posting-card, .result-item, .listing-card, a[href*="/detalle"], a[href*="/inmueble"], article, li')) : [];
        const seen = new Set<string>();

        const pushItem = (title: string, priceText: string, location: string, url: string, imageUrl: string, features: string) => {
          try {
            if (!url) return;
            if (url.startsWith('/')) url = `${location && location.includes('http') ? new URL(location).origin : (globalThis as any).location.origin}${url}`;
            const key = `${title}|${priceText}|${url}`;
            if (!seen.has(key) && (title || priceText)) {
              seen.add(key);
              items.push({ title, priceText, location, url, imageUrl, features });
            }
          } catch {}
        };

        nodeList.forEach((node: any) => {
          const container: any = (node.closest && node.closest('article, li, .posting-card, .result-item, .listing-card, .property-item')) || node;
          const titleEl: any = container.querySelector ? container.querySelector('[data-qa="POSTING_TITLE"], .posting-title, h3, h4') : null;
          const priceEl: any = container.querySelector ? container.querySelector('[data-qa="POSTING_PRICE"], .posting-price, .price, [class*="price"]') : null;
          const locEl: any = container.querySelector ? container.querySelector('[data-qa="POSTING_LOCATION"], .posting-location, .location, [class*="location"]') : null;
          const linkEl: any = container.querySelector ? container.querySelector('a[href^="/"], a[href*="properati.com.co"]') : null;
          const imgEl: any = container.querySelector ? container.querySelector('img') : null;
          const text: string = (container.innerText || '').toString();

          let title = (titleEl && titleEl.textContent ? titleEl.textContent.trim() : '') as string;
          let priceText = (priceEl && priceEl.textContent ? priceEl.textContent.trim() : '') as string;
          if (!priceText) {
            const m = text.match(/\$\s*[\d\.,]+/);
            priceText = m ? m[0] : '';
          }
          const location = (locEl && locEl.textContent ? locEl.textContent.trim() : '') as string;
          let href = linkEl && (linkEl as any).href ? (linkEl as any).href : '';
          let imageUrl = '';
          if (imgEl) {
            imageUrl = imgEl.getAttribute?.('data-src') || imgEl.getAttribute?.('data-lazy') || imgEl.getAttribute?.('src') || '';
            if (!imageUrl) {
              const srcset = imgEl.getAttribute?.('srcset') || '';
              if (srcset) imageUrl = srcset.split(',')[0]?.trim().split(' ')[0] || '';
            }
          }

          if (!title) {
            const linkT = (linkEl?.getAttribute?.('title') || linkEl?.textContent || '').trim();
            title = linkT || title;
          }

          pushItem(title, priceText, location, href, imageUrl, text);
        });

        if (items.length === 0 && doc) {
          const anchors = Array.from(doc.querySelectorAll('a[href*="/detalle"], a[href*="/inmueble"], a[href^="/"]')) as any[];
          anchors.forEach(a => {
            const container = a.closest('article, li, .posting-card, .result-item, .listing-card, .property-item') || a;
            const text = (container?.innerText || '').toString();
            const m = text.match(/\$\s*[\d\.,]+/);
            const priceText = m ? m[0] : '';
            const title = (a.getAttribute('title') || a.textContent || '').trim();
            let url = a.href || a.getAttribute('href') || '';
            const img: any = container?.querySelector?.('img');
            let imageUrl = img?.getAttribute?.('data-src') || img?.getAttribute?.('data-lazy') || img?.getAttribute?.('src') || '';
            if (!imageUrl) {
              const srcset = img?.getAttribute?.('srcset') || '';
              if (srcset) imageUrl = srcset.split(',')[0]?.trim().split(' ')[0] || '';
            }
            pushItem(title, priceText, '', url, imageUrl, text);
          });
        }

        return items;
      });

      const properties: Property[] = [];
      rawItems.forEach((it, index) => {
        const price = this.parsePrice(it.priceText);
        if (!price || price <= 0) return;
        const area = this.parseArea(it.features || it.title);
        const rooms = this.parseRooms(it.features || it.title);
        const bathrooms = this.parseBathrooms(it.features || it.title);

        const prop: Property = {
          id: `properati_headless_${Date.now()}_${index}`,
          title: it.title || 'Apartamento',
          price,
          adminFee: 0,
          totalPrice: price,
          area,
          rooms,
          bathrooms,
          location: {
            address: it.location,
            neighborhood: this.extractNeighborhood(it.location),
            city: 'Dynamic',
            coordinates: { lat: 0, lng: 0 }
          },
          amenities: this.extractAmenities(it.features || ''),
          images: it.imageUrl ? [this.normalizeUrl(it.imageUrl)] : [],
          url: this.normalizeUrl(it.url),
          source: this.source.name,
          scrapedDate: new Date().toISOString(),
          pricePerM2: area > 0 ? Math.round(price / area) : 0,
          description: '',
          isActive: true
        };

        if (this.meetsBasicCriteria(prop, criteria)) {
          properties.push(prop);
        }
      });

      return properties;
    } finally {
      await page.close();
      await browser.close();
    }
  }

  /**
   * Build Properati search URL - UNIFICADO
   */
  private buildProperatiUrl(criteria: SearchCriteria): string {
    // 🔥 USAR LOCATIONDETECTOR SIN HARDCODING
    const locationText = criteria.hardRequirements.location?.neighborhoods?.join(' ') || '';
    const locationInfo = LocationDetector.detectLocation(locationText);

    // 🔥 DINÁMICO: Determinar tipo de transacción
    const transactionType = this.getTransactionType(criteria);
    const propertyType = 'apartamento'; // Por ahora apartamentos, se puede hacer dinámico después

    // Properati usa formato: /s/barrio-ciudad-d-c/tipo/transaccion
    const cityUrl = LocationDetector.getCityUrl(locationInfo.city, 'standard');
    const neighborhoodUrl = locationInfo.neighborhood ? LocationDetector.getNeighborhoodUrl(locationInfo.neighborhood, 'standard') : '';

    let url = `https://www.properati.com.co/s`;
    if (neighborhoodUrl) {
      url += `/${neighborhoodUrl}-${cityUrl}-d-c`;
    } else {
      url += `/${cityUrl}-d-c-colombia`;
    }
    url += `/${propertyType}/${transactionType}`;

    logger.info(`🎯 Properati - Ubicación detectada: ${locationInfo.city} ${locationInfo.neighborhood || ''} (confianza: ${locationInfo.confidence})`);

    return url;
  }

  /**
   * Determinar tipo de transacción dinámicamente
   */
  private getTransactionType(criteria: SearchCriteria): string {
    // TODO: Implementar cuando tengamos el campo en SearchCriteria
    // Por ahora defaultear a arriendo
    return 'arriendo';
  }

  /**
   * Extract properties from Properati HTML
   */
  private extractProperatiProperties($: cheerio.CheerioAPI, criteria: SearchCriteria): Property[] {
    const properties: Property[] = [];
    
    // Properati specific selectors
    const selectors = [
      '.listing-card',
      '.property-item',
      '[data-qa="posting PROPERTY"]',
      '.posting-card',
      '.result-item'
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
      logger.warn('No property cards found on Properati');
      return properties;
    }

    propertyCards.each((index, card) => {
      try {
        const $card = $(card);
        
        // Extract title
        let title = this.extractText($card, [
          '[data-qa="POSTING_TITLE"]',
          '.posting-title',
          '.listing-title',
          'h3',
          'h4'
        ]);

        // Extract price
        let priceText = this.extractText($card, [
          '[data-qa="POSTING_PRICE"]',
          '.posting-price',
          '.price',
          '[class*="price"]'
        ]);

        // Extract location
        let location = this.extractText($card, [
          '[data-qa="POSTING_LOCATION"]',
          '.posting-location',
          '.location',
          '[class*="location"]'
        ]);

        // Extract features (area, rooms, etc.)
        let featuresText = this.extractText($card, [
          '[data-qa="POSTING_FEATURES"]',
          '.posting-features',
          '.features',
          '.property-features'
        ]);

        // Extract URL
        let propertyUrl = this.extractAttribute($card, [
          'a',
          '[data-qa="posting PROPERTY"] a'
        ], 'href');

        // Extract image (handle lazy/srcset)
        let imageUrl = this.extractAttribute($card, [
          '.posting-image img',
          '.listing-image img',
          'img'
        ], 'data-src');
        if (!imageUrl) {
          imageUrl = this.extractAttribute($card, [
            '.posting-image img',
            '.listing-image img',
            'img'
          ], 'src');
        }
        if (!imageUrl) {
          const srcset = this.extractAttribute($card, [
            '.posting-image img',
            '.listing-image img',
            'img'
          ], 'srcset');
          if (srcset) imageUrl = srcset.split(',')[0]?.trim().split(' ')[0] || '';
        }

        // Parse data
        const price = this.parsePrice(priceText);
        const area = this.parseArea(featuresText || title);
        const rooms = this.parseRooms(featuresText || title);
        const bathrooms = this.parseBathrooms(featuresText || title);

        // Create property if it has minimum required data
        if (title && price > 0) {
          const pricePerM2 = area > 0 ? Math.round(price / area) : 0;
          const property: Property = {
            id: `properati_${Date.now()}_${index}`,
            title: title,
            price: price,
            adminFee: 0,
            totalPrice: price,
            area: area,
            rooms: rooms,
            bathrooms: bathrooms,
            location: {
              address: location,
              neighborhood: this.extractNeighborhood(location),
              city: 'Dynamic',
              coordinates: { lat: 0, lng: 0 }
            },
            amenities: this.extractAmenities(featuresText),
            images: imageUrl ? [this.normalizeUrl(imageUrl)] : [],
            url: propertyUrl ? this.normalizeUrl(propertyUrl) : '',
            source: this.source.name,
            scrapedDate: new Date().toISOString(),
            pricePerM2,
            description: '',
            isActive: true
          };

          // Apply basic filtering
          if (this.meetsBasicCriteria(property, criteria)) {
            properties.push(property);
          }
        }

      } catch (error) {
        logger.warn(`Error extracting Properati property ${index}:`, error);
      }
    });

    return properties;
  }

  /**
   * Extract amenities from features text
   */
  private extractAmenities(featuresText: string): string[] {
    if (!featuresText) return [];
    
    const amenities: string[] = [];
    const text = featuresText.toLowerCase();
    
    // Common amenities to look for
    const amenityKeywords = [
      'gimnasio', 'piscina', 'jacuzzi', 'sauna', 'turco',
      'salon social', 'bbq', 'terraza', 'balcon',
      'parqueadero', 'garaje', 'porteria', 'seguridad',
      'ascensor', 'aire acondicionado', 'calefaccion'
    ];
    
    amenityKeywords.forEach(keyword => {
      if (text.includes(keyword)) {
        amenities.push(keyword);
      }
    });
    
    return amenities;
  }

  /**
   * Extract neighborhood from location text - USAR LOCATIONDETECTOR
   */
  private extractNeighborhood(locationText: string): string {
    if (!locationText) return '';

    // LIMPIAR TEXTO DE UBICACIÓN - FUNCIÓN SIMPLE
    return locationText.trim().toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ');
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
      return `https://www.properati.com.co${url}`;
    }
    
    return `https://www.properati.com.co/${url}`;
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

  /**
   * Parse area from text
   */
  private parseArea(text: string): number {
    if (!text) return 0;
    
    const areaMatch = text.match(/(\d+(?:\.\d+)?)\s*m[²2]/i);
    return areaMatch ? parseFloat(areaMatch[1]) : 0;
  }

  /**
   * Parse rooms from text
   */
  private parseRooms(text: string): number {
    if (!text) return 0;
    
    const roomsMatch = text.match(/(\d+)\s*(?:hab|habitacion|alcoba|dormitorio|bedroom)/i);
    return roomsMatch ? parseInt(roomsMatch[1]) : 0;
  }

  /**
   * Parse bathrooms from text
   */
  private parseBathrooms(text: string): number {
    if (!text) return 0;
    
    const bathroomsMatch = text.match(/(\d+)\s*(?:baño|bathroom|wc)/i);
    return bathroomsMatch ? parseInt(bathroomsMatch[1]) : 0;
  }
}
