import { BaseScraper } from '../BaseScraper';
import { Property, SearchCriteria, ScrapingSource } from '../../types';
import { RateLimiter } from '../RateLimiter';
import { logger } from '../../../utils/logger';
import * as cheerio from 'cheerio';
import axios from 'axios';
import puppeteer from 'puppeteer';

export class PadsScraper extends BaseScraper {
  constructor(source: ScrapingSource, rateLimiter: RateLimiter) {
    super(source, rateLimiter);
  }

  /**
   * Scrape PADS specifically
   */
  async scrape(criteria: SearchCriteria, maxPages: number = 10): Promise<Property[]> {
    logger.info('Starting PADS scraping');

    try {
      const searchUrl = this.buildPadsUrl(criteria);
      logger.info(`PADS URL: ${searchUrl}`);

      const allProperties: Property[] = [];
      let currentPage = 1;

      while (currentPage <= maxPages) {
        await this.rateLimiter.waitForSlot();

        try {
          const pageUrl = currentPage === 1 ? searchUrl : `${searchUrl}&page=${currentPage}`;
          logger.info(`Scraping PADS page ${currentPage}: ${pageUrl}`);

          const response = await axios.get(pageUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
              'Accept-Language': 'es-CO,es;q=0.9,en;q=0.8',
              'Referer': 'https://www.pads.com/',
              'Connection': 'keep-alive'
            },
            timeout: 30000
          });

          const $ = cheerio.load(response.data);
          let pageProperties = this.extractPadsProperties($, criteria);

          if (pageProperties.length === 0) {
            logger.warn('No cards found on PADS static HTML. Trying headless...');
            try {
              const headless = await this.scrapePadsHeadless(pageUrl, criteria);
              if (headless.length > 0) pageProperties = headless;
            } catch (e) { logger.warn('Headless fallback for PADS failed:', e); }
          }

          if (pageProperties.length === 0) {
            logger.info(`No properties found on PADS page ${currentPage}, stopping`);
            break;
          }

          allProperties.push(...pageProperties);
          logger.info(`PADS page ${currentPage}: ${pageProperties.length} properties found`);

          currentPage++;

        } catch (error) {
          logger.error(`Error scraping PADS page ${currentPage}:`, error);
          currentPage++;

          if (currentPage > 3 && allProperties.length === 0) {
            logger.warn('Too many consecutive errors, stopping PADS scraping');
            break;
          }
        }
      }

      logger.info(`PADS scraping completed: ${allProperties.length} total properties`);
      return allProperties;

    } catch (error) {
      logger.error('PADS scraping failed:', error);
      return [];
    }
  }

  /**
   * Build PADS search URL
   */
  private buildPadsUrl(criteria: SearchCriteria): string {
    let baseUrl = 'https://www.pads.com/bogota-apartments-for-rent';

    // Add neighborhood filter if specified
    if (criteria.hardRequirements.location?.neighborhoods?.length) {
      const neighborhood = criteria.hardRequirements.location.neighborhoods[0];
      // Map neighborhood names to PADS zone names
      const neighborhoodMap: Record<string, string> = {
        'usaquen': 'usaquen',
        'usaquén': 'usaquen',
        'chapinero': 'chapinero',
        'zona rosa': 'zona-rosa',
        'chico': 'chico',
        'rosales': 'rosales',
        'la candelaria': 'la-candelaria',
        'centro': 'centro'
      };

      const mappedNeighborhood = neighborhoodMap[neighborhood.toLowerCase()];
      if (mappedNeighborhood) {
        baseUrl = `https://www.pads.com/${mappedNeighborhood}-bogota-apartments-for-rent`;
      }
    }

    // Remove all parameter restrictions - get everything
    return baseUrl;
  }

  /**
   * Extract properties from PADS HTML
   */
  private extractPadsProperties($: cheerio.CheerioAPI, criteria: SearchCriteria): Property[] {
    const properties: Property[] = [];

    // PADS specific selectors
    const selectors = [
      '.property-listing',
      '.listing-card',
      '.apartment-card',
      '[data-testid="property-card"]',
      '.search-result-item'
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
      logger.warn('No property cards found on PADS');
      return properties;
    }

    propertyCards.each((index, card) => {
      try {
        const $card = $(card);

        // Extract title
        let title = this.extractText($card, [
          '.property-name',
          '.listing-title',
          'h3',
          'h4',
          '[data-testid="property-name"]'
        ]);

        // Extract price
        let priceText = this.extractText($card, [
          '.rent-price',
          '.price',
          '[data-testid="rent-price"]',
          '.listing-price'
        ]);

        // Extract location
        let location = this.extractText($card, [
          '.property-address',
          '.address',
          '[data-testid="property-address"]',
          '.location'
        ]);

        // Extract features
        let bedroomsText = this.extractText($card, [
          '.bedrooms',
          '[data-testid="bedrooms"]',
          '.bed-count'
        ]);

        let bathroomsText = this.extractText($card, [
          '.bathrooms',
          '[data-testid="bathrooms"]',
          '.bath-count'
        ]);

        let areaText = this.extractText($card, [
          '.square-feet',
          '.sqft',
          '[data-testid="square-feet"]',
          '.area'
        ]);

        // Extract URL
        let propertyUrl = this.extractAttribute($card, [
          'a',
          '.property-link'
        ], 'href');

        // Extract image
        let imageUrl = this.extractAttribute($card, [
          '.property-image img',
          'img',
          '[data-testid="property-image"] img'
        ], 'src');

        // Parse data
        const price = this.parsePrice(priceText);
        const area = this.parseArea(areaText);
        const rooms = this.parseRooms(bedroomsText || title);
        const bathrooms = this.parseBathrooms(bathroomsText || title);

        // Create property if it has minimum required data
        if (title && price > 0) {
          const property: Property = {
            id: `pads_${Date.now()}_${index}`,
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
              city: 'Bogotá',
              coordinates: { lat: 0, lng: 0 }
            },
            amenities: this.extractAmenities($card),
            images: imageUrl ? [this.normalizeUrl(imageUrl)] : [],
            url: propertyUrl ? this.normalizeUrl(propertyUrl) : '',
            source: this.source.name,
            scrapedDate: new Date().toISOString(),
            pricePerM2: area > 0 ? Math.round(price / area) : 0,
            description: '',
            isActive: true
          };

          // Apply basic filtering
          if (this.meetsBasicCriteria(property, criteria)) {
            properties.push(property);
          }
        }

      } catch (error) {
        logger.warn(`Error extracting PADS property ${index}:`, error);
      }
    });

    return properties;
  }

  private async scrapePadsHeadless(pageUrl: string, criteria: SearchCriteria): Promise<Property[]> {
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage'] });
    const page = await browser.newPage();
    try {
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
      // scrolling para forzar carga diferida
      await page.evaluate(() => {
        return new Promise((resolve) => {
          let total = 0;
          const step = () => {
            window.scrollBy(0, 1000);
            total += 1000;
            if (total < 6000) {
              setTimeout(step, 400);
            } else {
              resolve(true);
            }
          };
          step();
        });
      });
      await page.waitForSelector('.property-listing, .listing-card, .search-result-item, article, li', { timeout: 15000 }).catch(()=>{});

      const items = await page.evaluate(() => {
        const out: Array<{title:string; priceText:string; url:string; imageUrl:string; location:string;}> = [];
        const doc: any = (globalThis as any).document;
        const cards = doc ? Array.from(doc.querySelectorAll('.property-listing, .listing-card, .search-result-item, article, li')) : [];
        cards.forEach((el:any) => {
          const title = el.querySelector('.property-name, .listing-title, h3, h4')?.textContent?.trim() || '';
          const priceText = el.querySelector('.rent-price, .price, .listing-price, [class*="price"]')?.textContent?.trim() || '';
          const linkEl: any = el.querySelector('a[href]');
          const url = linkEl ? (linkEl.href || linkEl.getAttribute('href')) : '';
          const imgEl: any = el.querySelector('img');
          let imageUrl = imgEl?.getAttribute?.('data-src') || imgEl?.getAttribute?.('data-lazy') || imgEl?.getAttribute?.('src') || '';
          if (!imageUrl) {
            const srcset = imgEl?.getAttribute?.('srcset') || '';
            if (srcset) imageUrl = srcset.split(',')[0]?.trim().split(' ')[0] || '';
          }
          const location = el.querySelector('.property-address, .address, .location')?.textContent?.trim() || '';
          if ((title || priceText) && url) out.push({ title, priceText, url, imageUrl, location });
        });

        if (out.length === 0 && doc) {
          // fallback: anchors y precios globales
          const anchors = Array.from(doc.querySelectorAll('a[href*="/property"], a[href*="/inmueble"], a[href^="/"]')) as any[];
          anchors.forEach(a => {
            const url = a.href || a.getAttribute('href');
            const container = a.closest('article, li, div');
            const title = (a.getAttribute('title') || a.textContent || '').trim();
            const priceText = (container?.querySelector?.('[class*="price"], .price, .rent-price')?.textContent || '').trim();
            const imgEl: any = container?.querySelector?.('img');
            const imageUrl = imgEl?.getAttribute?.('data-src') || imgEl?.getAttribute?.('src') || '';
            if ((title || priceText) && url) out.push({ title, priceText, url, imageUrl, location: '' });
          });
        }

        return out;
      });

      const remapped: Property[] = [];
      (items as any).forEach((it: any, idx: number) => {
        const raw = {
          title: it.title || 'Apartamento en arriendo',
          price: it.priceText,
          area: '',
          rooms: '',
          bathrooms: '',
          location: it.location || 'Bogotá',
          images: it.imageUrl ? [it.imageUrl] : [],
          url: it.url,
          description: ''
        };
        const parsed = this.parser.parseProperty(raw);
        if (parsed && parsed.price <= criteria.hardRequirements.maxTotalPrice) remapped.push(parsed);
      });

      return remapped;
    } finally {
      await page.close();
      await browser.close();
    }
  }


  /**
   * Extract amenities from card
   */
  private extractAmenities($card: cheerio.Cheerio<any>): string[] {
    const amenities: string[] = [];

    // Look for amenities in various places
    const amenitySelectors = [
      '.amenities',
      '.features',
      '[data-testid="amenities"]',
      '.property-features'
    ];

    amenitySelectors.forEach(selector => {
      const amenityText = $card.find(selector).text().toLowerCase();

      // Common amenities to look for
      const amenityKeywords = [
        'pool', 'piscina', 'gym', 'gimnasio', 'fitness',
        'parking', 'parqueadero', 'garage', 'garaje',
        'balcony', 'balcon', 'terrace', 'terraza',
        'air conditioning', 'aire acondicionado',
        'laundry', 'lavanderia', 'dishwasher',
        'elevator', 'ascensor', 'security', 'seguridad'
      ];

      amenityKeywords.forEach(keyword => {
        if (amenityText.includes(keyword)) {
          amenities.push(keyword);
        }
      });
    });

    return [...new Set(amenities)]; // Remove duplicates
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

  /**
   * Normalize URLs
   */
  private normalizeUrl(url: string): string {
    if (!url) return '';

    if (url.startsWith('http')) {
      return url;
    }

    if (url.startsWith('/')) {
      return `https://www.pads.com${url}`;
    }

    return `https://www.pads.com/${url}`;
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
      const maxRooms = criteria.hardRequirements.maxRooms ?? (criteria.hardRequirements.minRooms + 2);
      if (property.rooms < criteria.hardRequirements.minRooms ||
          property.rooms > maxRooms) {
        return false;
      }
    }

    // Area check (if available)
    if (property.area > 0) {
      const maxArea = criteria.hardRequirements.maxArea ?? (criteria.hardRequirements.minArea + 50);
      if (property.area < criteria.hardRequirements.minArea ||
          property.area > maxArea) {
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

    // Look for square feet or square meters
    const sqftMatch = text.match(/(\d+(?:,\d+)?)\s*(?:sq\.?\s*ft|sqft)/i);
    if (sqftMatch) {
      const sqft = parseInt(sqftMatch[1].replace(/,/g, ''));
      return Math.round(sqft * 0.092903); // Convert to square meters
    }

    const sqmMatch = text.match(/(\d+(?:\.\d+)?)\s*m[²2]/i);
    return sqmMatch ? parseFloat(sqmMatch[1]) : 0;
  }

  /**
   * Parse rooms from text
   */
  private parseRooms(text: string): number {
    if (!text) return 0;

    const roomsMatch = text.match(/(\d+)\s*(?:bed|bedroom|hab|habitacion)/i);
    return roomsMatch ? parseInt(roomsMatch[1]) : 0;
  }

  /**
   * Parse bathrooms from text
   */
  private parseBathrooms(text: string): number {
    if (!text) return 0;

    const bathroomsMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:bath|bathroom|baño)/i);
    return bathroomsMatch ? parseFloat(bathroomsMatch[1]) : 0;
  }
}
