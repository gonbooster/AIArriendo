import { Property, SearchCriteria, ScrapingSource } from '../../types';
import { RateLimiter } from '../RateLimiter';
import { LocationDetector } from '../../utils/LocationDetector';
import { logger } from '../../../utils/logger';
import * as cheerio from 'cheerio';
import axios from 'axios';

export class RentolaScraper {
  public source: ScrapingSource;
  private rateLimiter: RateLimiter;

  constructor() {
    this.source = {
      id: 'rentola',
      name: 'Rentola',
      baseUrl: 'https://www.rentola.com.co',
      isActive: true,
      priority: 10,
      rateLimit: {
        requestsPerMinute: 20,
        delayBetweenRequests: 3000,
        maxConcurrentRequests: 1
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
   * Scrape Rentola specifically
   */
  async scrape(criteria: SearchCriteria, maxPages: number = 1): Promise<Property[]> {
    logger.info('Starting Rentola scraping');
    
    try {
      const searchUrl = this.buildRentolaUrl(criteria);
      logger.info(`Rentola URL: ${searchUrl}`);

      const allProperties: Property[] = [];
      let currentPage = 1;

      while (currentPage <= maxPages) {
        await this.rateLimiter.waitForSlot();

        try {
          const pageUrl = currentPage === 1 ? searchUrl : `${searchUrl}?page=${currentPage}`;
          logger.info(`Scraping Rentola page ${currentPage}: ${pageUrl}`);

          const response = await axios.get(pageUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
              'Accept-Language': 'es-CO,es-419;q=0.9,es;q=0.8,en;q=0.7',
              'Accept-Encoding': 'gzip, deflate, br',
              'Referer': 'https://www.rentola.co/',
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

          // Rentola SIEMPRE usa headless (contenido dinámico)
          logger.info(`Rentola: Using headless browser for page ${currentPage}`);
          try {
            const pageProperties = await this.scrapeWithHeadless(pageUrl, criteria);
            if (pageProperties.length > 0) {
              allProperties.push(...pageProperties);
              logger.info(`Rentola headless page ${currentPage}: ${pageProperties.length} properties found`);
            } else {
              logger.info(`No properties found with headless on page ${currentPage}, stopping`);
              break;
            }
          } catch (e) {
            logger.error('Rentola headless failed:', e);
            break;
          }

          currentPage++;

        } catch (error) {
          logger.error(`Error scraping Rentola page ${currentPage}:`, error);
          currentPage++;
          
          if (currentPage > 3 && allProperties.length === 0) {
            logger.warn('Too many consecutive errors, stopping Rentola scraping');
            break;
          }
        }
      }

      logger.info(`Rentola scraping completed: ${allProperties.length} total properties`);
      return allProperties;

    } catch (error) {
      logger.error('Rentola scraping failed:', error);
      return [];
    }
  }

  /**
   * Build Rentola search URL - UNIFICADO
   */
  private buildRentolaUrl(criteria: SearchCriteria): string {
    // USAR NUEVO LOCATIONDETECTOR OPTIMIZADO
    const locationText = criteria.hardRequirements.location?.neighborhoods?.join(' ') || 'bogotá';
    const locationInfo = LocationDetector.detectLocation(locationText);

    const baseUrl = 'https://www.rentola.com.co/apartamentos/arriendo';

    logger.info(`🎯 Rentola - Ubicación detectada: ${locationInfo.city} ${locationInfo.neighborhood || ''} (confianza: ${locationInfo.confidence})`);

    // Rentola usa formato específico para barrios
    let finalUrl = baseUrl;
    if (locationInfo?.neighborhood) {
      const rentolaMapping = LocationDetector.getNeighborhoodUrl(locationInfo.neighborhood, 'rentola');
      if (rentolaMapping) {
        finalUrl = `https://www.rentola.com.co/${rentolaMapping}`;
      }
    }

    return finalUrl;
  }

  /**
   * Extract properties from Rentola HTML
   */
  private extractRentolaProperties($: cheerio.CheerioAPI, criteria: SearchCriteria): Property[] {
    const properties: Property[] = [];
    
    // Rentola specific selectors
    const selectors = [
      '.property-card',
      '.listing-item',
      '[class*="property"]',
      '.search-result',
      '.rental-item'
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
      logger.warn('No property cards found on Rentola');
      return properties;
    }

    propertyCards.each((index, card) => {
      try {
        const $card = $(card);
        
        // Extract title
        let title = this.extractText($card, [
          '.property-title',
          '.listing-title',
          'h3',
          'h4',
          '[class*="title"]'
        ]);

        // Extract price
        let priceText = this.extractText($card, [
          '.price',
          '.rental-price',
          '[class*="price"]',
          '.cost'
        ]);

        // Extract location
        let location = this.extractText($card, [
          '.location',
          '.address',
          '[class*="location"]',
          '.neighborhood'
        ]);

        // Extract area and rooms from description or title
        let areaText = this.extractText($card, [
          '.area',
          '.size',
          '[class*="area"]',
          '.square-meters'
        ]);

        let roomsText = this.extractText($card, [
          '.bedrooms',
          '.rooms',
          '[class*="bedroom"]',
          '[class*="room"]'
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
          '.listing-image img'
        ], 'src');

        // Parse data
        const price = this.parsePrice(priceText);
        const area = this.parseArea(areaText || title);
        const rooms = this.parseRooms(roomsText || title);

        // Create property if it has minimum required data
        if (title && price > 0) {
          const property: Property = {
            id: `rentola_${Date.now()}_${index}`,
            title: title,
            price: price,
            totalPrice: price,
            adminFee: 0,
            description: '',
            pricePerM2: area > 0 ? Math.round(price / area) : 0,
            area: area,
            rooms: rooms,
            bathrooms: 0, // Not usually available in listing
            location: {
              address: location,
              neighborhood: this.extractNeighborhood(location),
              city: 'Dynamic', // Will be enhanced by LocationDetector
              coordinates: { lat: 0, lng: 0 }
            },
            amenities: [], // Would need to extract from detail page
            images: imageUrl ? [this.normalizeUrl(imageUrl)] : [],
            url: propertyUrl ? this.normalizeUrl(propertyUrl) : '',
            source: this.source.name,
            scrapedDate: new Date().toISOString(),
            isActive: true
          };

          // Apply basic filtering
          if (this.meetsBasicCriteria(property, criteria)) {
            properties.push(property);
          }
        }

      } catch (error) {
        logger.warn(`Error extracting Rentola property ${index}:`, error);
      }
    });

    return properties;
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
      return `https://www.rentola.co${url}`;
    }
    
    return `https://www.rentola.co/${url}`;
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
          (criteria.hardRequirements.maxRooms && property.rooms > criteria.hardRequirements.maxRooms)) {
        return false;
      }
    }

    // Area check (if available)
    if (property.area > 0) {
      if (property.area < criteria.hardRequirements.minArea ||
          (criteria.hardRequirements.maxArea && property.area > criteria.hardRequirements.maxArea)) {
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
   * Scrape with headless browser for SPA content
   */
  private async scrapeWithHeadless(url: string, criteria: SearchCriteria): Promise<Property[]> {
    const puppeteer = require('puppeteer');
    let browser;

    try {
      logger.info('Starting Rentola headless scraping...');

      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      });

      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

      // Navigate and wait for content to load
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

      // Wait for listings to load
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Extract property data using Rentola's specific text structure
      const items = await page.evaluate(() => {
        const out: Array<{title:string; priceText:string; url:string; imageUrl:string; location:string; rooms:string; bathrooms:string; area:string;}> = [];
        const doc: any = (globalThis as any).document;

        // Get the full page text content
        const bodyText = doc.body.textContent || '';

        // Debug: Log a sample of the text to understand the format
        console.log('Rentola body text sample:', bodyText.substring(0, 2000));

        // Multiple patterns to try based on the actual Rentola format
        const patterns = [
          // Pattern 1: "3 rooms apartment of 43m²Carrera 32, Puente Aranda, 111611 [City], Colombia730,000 $ / month"
          /(\d+)\s+rooms?\s+(\w+)\s+of\s+(\d+)m²([^$]*?)([\d,]+)\s*\$\s*\/\s*month/gi,

          // Pattern 2: "1 room studio of 40m²Calle 63B, Engativá, 111071 [City], Colombia800,000 $ / month"
          /(\d+)\s+room\s+(\w+)\s+of\s+(\d+)m²([^$]*?)([\d,]+)\s*\$\s*\/\s*month/gi,

          // Pattern 3: More flexible - any number + rooms/room + type + area + location + price
          /(\d+)\s+rooms?\s+\w+\s+of\s+(\d+)m²[^$]*?([\d,]+)\s*\$\s*\/\s*month/gi,

          // Pattern 4: Even more flexible - just look for area and price patterns
          /(\d+)m²[^$]*?([\d,]+)\s*\$\s*\/\s*month/gi
        ];

        patterns.forEach((pattern, index) => {
          let match;
          while ((match = pattern.exec(bodyText)) !== null) {
            try {
              let rooms, propertyType, area, locationPart, price;

              if (index === 0 || index === 1) {
                // Full pattern match
                [, rooms, propertyType, area, locationPart, price] = match;
              } else if (index === 2) {
                // Simplified pattern
                [, rooms, area, price] = match;
                propertyType = 'apartment';
                locationPart = 'Dynamic';
              } else {
                // Most basic pattern
                [, area, price] = match;
                rooms = '1';
                propertyType = 'apartment';
                locationPart = 'Dynamic';
              }

              // Clean up location
              let location = (locationPart || 'Dynamic').trim()
                .replace(/\s+/g, ' ')
                .replace(/\d{6}/g, '') // Remove postal codes
                .replace(/,\s*Colombia\s*$/, '') // Remove country
                .trim();

              if (location.length > 50) {
                location = location.split(',')[0].trim();
              }

              if (!location || location.length < 3) {
                location = 'Dynamic';
              }

              // Create title
              const title = `${rooms} ${rooms === '1' ? 'room' : 'rooms'} ${propertyType} of ${area}m²`;

              // Format price
              const cleanPrice = price.replace(/,/g, '');
              const priceText = `${cleanPrice} $ / month`;

              // Check if already exists
              const exists = out.some(item =>
                item.area === area &&
                item.priceText === priceText
              );

              if (!exists && rooms && area && cleanPrice && parseInt(cleanPrice) > 0) {
                out.push({
                  title,
                  priceText,
                  url: `https://rentola.com/for-rent/co/colombia`,
                  imageUrl: '',
                  location,
                  rooms,
                  bathrooms: '1',
                  area
                });
              }
            } catch (error) {
              console.warn(`Error parsing Rentola property with pattern ${index}:`, error);
            }
          }
        });

        console.log(`Rentola extracted ${out.length} properties`);
        return out;
      });

      // Convert to Property objects
      const properties: Property[] = [];
      items.forEach((item: any, index: number) => {
        try {
          const price = this.parsePrice(item.priceText);
          if (!price || price < 100000) return;

          const rooms = parseInt(item.rooms) || 0;
          const bathrooms = parseInt(item.bathrooms) || 0;
          const area = parseInt(item.area) || 0;

          const property: Property = {
            id: `rentola_headless_${Date.now()}_${index}`,
            title: item.title || 'Propiedad en Rentola',
            price,
            adminFee: 0,
            totalPrice: price,
            area,
            rooms,
            bathrooms,
            parking: 0,
            stratum: 0,
            location: {
              address: item.location || 'Dynamic',
              neighborhood: this.extractNeighborhood(item.location),
              city: 'Dynamic' // Will be enhanced by LocationDetector
            },
            images: item.imageUrl ? [item.imageUrl] : [],
            url: item.url.startsWith('http') ? item.url : `https://rentola.com${item.url}`,
            source: this.source.name,
            description: '',
            amenities: [],
            scrapedDate: new Date().toISOString(),
            pricePerM2: area > 0 ? Math.round(price / area) : 0,
            isActive: true
          };

          if (this.meetsBasicCriteria(property, criteria)) {
            properties.push(property);
          }
        } catch (error) {
          logger.warn(`Error processing Rentola headless property ${index}:`, error);
        }
      });

      logger.info(`Rentola headless found ${items.length} raw items, ${properties.length} valid properties`);
      return properties;

    } catch (error) {
      logger.error('Rentola headless scraping failed:', error);
      return [];
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
}
