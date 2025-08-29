import { BaseScraper } from './BaseScraper';
import { Property, SearchCriteria, ScrapingSource } from '../types';
import { RateLimiter } from './RateLimiter';
import { logger } from '../../utils/logger';
import * as cheerio from 'cheerio';
import axios from 'axios';

export class RentolaScraper extends BaseScraper {
  constructor(source: ScrapingSource, rateLimiter: RateLimiter) {
    super(source, rateLimiter);
  }

  /**
   * Scrape Rentola specifically
   */
  async scrape(criteria: SearchCriteria, maxPages: number = 5): Promise<Property[]> {
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
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
              'Accept-Language': 'es-CO,es;q=0.9,en;q=0.8',
              'Referer': 'https://www.rentola.co/',
              'Connection': 'keep-alive'
            },
            timeout: 30000
          });

          const $ = cheerio.load(response.data);
          const pageProperties = this.extractRentolaProperties($, criteria);

          if (pageProperties.length === 0) {
            logger.info(`No properties found on Rentola page ${currentPage}, stopping`);
            break;
          }

          allProperties.push(...pageProperties);
          logger.info(`Rentola page ${currentPage}: ${pageProperties.length} properties found`);

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
   * Build Rentola search URL
   */
  private buildRentolaUrl(criteria: SearchCriteria): string {
    const baseUrl = 'https://www.rentola.co/search';

    // Add neighborhood to location if specified
    let location = 'bogota';
    if (criteria.hardRequirements.location?.neighborhoods?.length) {
      const neighborhood = criteria.hardRequirements.location.neighborhoods[0];
      // Map neighborhood names to Rentola location format
      const neighborhoodMap: Record<string, string> = {
        'usaquen': 'usaquen-bogota',
        'usaquén': 'usaquen-bogota',
        'chapinero': 'chapinero-bogota',
        'zona rosa': 'zona-rosa-bogota',
        'chico': 'chico-bogota',
        'rosales': 'rosales-bogota',
        'la candelaria': 'la-candelaria-bogota',
        'centro': 'centro-bogota'
      };

      const mappedNeighborhood = neighborhoodMap[neighborhood.toLowerCase()];
      if (mappedNeighborhood) {
        location = mappedNeighborhood;
      }
    }

    const params = new URLSearchParams({
      'location': location,
      'property_type': 'apartment',
      'listing_type': 'rent'
      // Remove all other filters - get everything
    });

    return `${baseUrl}?${params}`;
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
            area: area,
            rooms: rooms,
            bathrooms: 0, // Not usually available in listing
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
          property.rooms > criteria.hardRequirements.maxRooms) {
        return false;
      }
    }

    // Area check (if available)
    if (property.area > 0) {
      if (property.area < criteria.hardRequirements.minArea || 
          property.area > criteria.hardRequirements.maxArea) {
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
}
