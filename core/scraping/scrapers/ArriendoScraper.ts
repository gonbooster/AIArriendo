import { Property, SearchCriteria, ScrapingSource } from '../../types';
import { RateLimiter } from '../RateLimiter';
import { logger } from '../../../utils/logger';
import { LocationDetector } from '../../utils/LocationDetector';
import * as cheerio from 'cheerio';
import axios from 'axios';

export class ArriendoScraper {
  public source: ScrapingSource;
  private rateLimiter: RateLimiter;

  constructor() {
    this.source = {
      id: 'arriendo',
      name: 'Arriendo.com',
      baseUrl: 'https://www.arriendo.com',
      isActive: true,
      priority: 12,
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
   * Scrape Arriendo.com specifically
   */
  async scrape(criteria: SearchCriteria, maxPages: number = 1): Promise<Property[]> {
    logger.info('Starting Arriendo.com scraping');
    
    try {
      const searchUrl = this.buildArriendoUrl(criteria);
      logger.info(`Arriendo.com URL: ${searchUrl}`);

      const allProperties: Property[] = [];
      let currentPage = 1;

      while (currentPage <= maxPages) {
        await this.rateLimiter.waitForSlot();

        try {
          const pageUrl = currentPage === 1 ? searchUrl : `${searchUrl}&page=${currentPage}`;
          logger.info(`Scraping Arriendo.com page ${currentPage}: ${pageUrl}`);

          const response = await axios.get(pageUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
              'Accept-Language': 'es-CO,es-419;q=0.9,es;q=0.8,en;q=0.7',
              'Accept-Encoding': 'gzip, deflate, br',
              'Referer': 'https://www.arriendo.com/',
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

          const $ = cheerio.load(response.data);
          const pageProperties = this.extractArriendoProperties($, criteria);

          if (pageProperties.length === 0 && currentPage === 1) {
            logger.info(`No properties found on Arriendo.com page ${currentPage}, trying headless...`);
            const headlessProperties = await this.scrapeWithHeadless(pageUrl, criteria);
            if (headlessProperties.length > 0) {
              allProperties.push(...headlessProperties);
              logger.info(`Arriendo.com headless: ${headlessProperties.length} properties found`);
            } else {
              logger.info(`No properties found with headless either, stopping`);
            }
            break;
          } else if (pageProperties.length === 0) {
            logger.info(`No properties found on Arriendo.com page ${currentPage}, stopping`);
            break;
          }

          allProperties.push(...pageProperties);
          logger.info(`Arriendo.com page ${currentPage}: ${pageProperties.length} properties found`);

          currentPage++;

          // Add delay between requests
          await new Promise(resolve => setTimeout(resolve, 2500));

        } catch (error) {
          logger.error(`Error scraping Arriendo.com page ${currentPage}:`, error);
          break;
        }
      }

      logger.info(`Arriendo.com scraping completed: ${allProperties.length} properties found`);
      return allProperties;

    } catch (error) {
      logger.error('Arriendo.com scraping failed:', error);
      throw error;
    }
  }

  /**
   * Build Arriendo.com search URL - UNIFICADO
   */
  private buildArriendoUrl(criteria: SearchCriteria): string {
    // USAR NUEVO LOCATIONDETECTOR OPTIMIZADO
    const locationText = criteria.hardRequirements.location?.neighborhoods?.join(' ') || 'bogotá';
    const locationInfo = LocationDetector.detectLocation(locationText);

    const baseUrl = 'https://www.arriendo.com';
    const cityUrl = LocationDetector.getCityUrl(locationInfo.city, 'standard');

    logger.info(`🎯 Arriendo - Ubicación detectada: ${locationInfo.city} ${locationInfo.neighborhood || ''} (confianza: ${locationInfo.confidence})`);

    // Arriendo.com usa parámetros específicos
    const params = new URLSearchParams();
    params.append('tipo', 'arriendo');

    // Usar mapeo centralizado para ciudad
    params.append('ciudad', cityUrl);

    // Location
    if (criteria.hardRequirements.location?.neighborhoods && criteria.hardRequirements.location.neighborhoods.length > 0) {
      params.append('zona', criteria.hardRequirements.location.neighborhoods[0].toLowerCase());
    }

    // Price range
    if (criteria.hardRequirements.maxTotalPrice) {
      params.append('precio_max', criteria.hardRequirements.maxTotalPrice.toString());
    }

    const finalUrl = `${baseUrl}?${params.toString()}`;
    logger.info(`Arriendo.com URL: ${finalUrl}`);
    return finalUrl;
  }

  /**
   * Extract properties from Arriendo.com HTML
   */
  private extractArriendoProperties($: cheerio.CheerioAPI, criteria: SearchCriteria): Property[] {
    const properties: Property[] = [];

    // Arriendo.com specific selectors - basado en estructura real
    const selectors = [
      '.es-listing',
      '.es-entity',
      'article.es-listing',
      '.property-card',
      '.listing-card',
      '.inmueble-item',
      '.search-result',
      '.property-item',
      '[class*="property"]',
      '[class*="listing"]',
      '[class*="inmueble"]',
      '[class*="card"]',
      'article',
      '.item'
    ];

    let cards: cheerio.Cheerio<any> = $();
    for (const selector of selectors) {
      cards = $(selector);
      if (cards.length > 0) {
        logger.info(`Arriendo.com: found ${cards.length} cards with selector ${selector}`);
        break;
      }
    }

    if (cards.length === 0) {
      logger.warn('No property cards found on Arriendo.com');
      return [];
    }

    cards.each((index, element) => {
      try {
        const $card = $(element);
        
        // Extract title
        const title = $card.find('h2, h3, .title, .property-title, [class*="title"]').first().text().trim() ||
                     $card.find('a').first().attr('title') || 'Propiedad en Arriendo.com';

        // Extract price - Arriendo.com usa .es-price
        const priceText = $card.find('.es-price, .price, .precio, [class*="price"], [class*="precio"]').first().text().trim();
        const price = this.extractPriceFromText(priceText);

        if (!price || price <= 0) return;

        // Extract location - Arriendo.com usa estructura específica
        const location = $card.find('.es-listing__location, .es-listing__address, .location, .ubicacion, [class*="location"], [class*="ubicacion"]').first().text().trim() ||
                        $card.find('.address, .direccion').first().text().trim();

        // Extract URL
        const relativeUrl = $card.find('a').first().attr('href') || '';
        const url = relativeUrl.startsWith('http') ? relativeUrl : `https://www.arriendo.com${relativeUrl}`;

        // Extract image
        const imageUrl = $card.find('img').first().attr('src') || $card.find('img').first().attr('data-src') || '';

        // Extract area, rooms, bathrooms from text
        const fullText = $card.text();
        const area = this.extractNumber(fullText, /(\d+)\s*m[²2]/i) || 0;
        const rooms = this.extractNumber(fullText, /(\d+)\s*hab/i) || this.extractNumber(fullText, /(\d+)\s*cuarto/i) || 0;
        const bathrooms = this.extractNumber(fullText, /(\d+)\s*baño/i) || 0;

        const property: Property = {
          id: `arriendo_${Date.now()}_${index}`,
          title,
          price,
          adminFee: 0,
          totalPrice: price,
          area,
          rooms,
          bathrooms,
          parking: 0,
          stratum: 0,
          location: {
            address: location,
            neighborhood: this.extractNeighborhood(location),
            city: 'Dynamic',
          },
          images: imageUrl ? [this.normalizeUrl(imageUrl)] : [],
          url: url,
          source: this.source.name,
          description: '',
          amenities: [],
          scrapedDate: new Date().toISOString(),
          pricePerM2: area > 0 ? Math.round(price / area) : 0,
          isActive: true
        };

        // Basic validation
        if (price > 0 && price <= criteria.hardRequirements.maxTotalPrice) {
          properties.push(property);
        }

      } catch (error) {
        logger.warn(`Error extracting property ${index} from Arriendo.com:`, error);
      }
    });

    return properties;
  }

  /**
   * Scrape with headless browser as fallback
   */
  private async scrapeWithHeadless(url: string, criteria: SearchCriteria): Promise<Property[]> {
    // Implementación básica - se puede expandir si es necesario
    logger.info('Arriendo.com headless scraping not implemented yet');
    return [];
  }

  /**
   * Extract neighborhood from location string
   */
  private extractNeighborhood(location: string): string {
    const parts = location.split(',');
    return parts[0]?.trim() || location;
  }

  /**
   * Normalize URL to absolute
   */
  private normalizeUrl(url: string): string {
    if (url.startsWith('http')) return url;
    if (url.startsWith('//')) return `https:${url}`;
    if (url.startsWith('/')) return `https://www.arriendo.com${url}`;
    return url;
  }

  /**
   * Extract number from text using regex
   */
  private extractNumber(text: string, regex: RegExp): number {
    const match = text.match(regex);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Extract price from text
   */
  private extractPriceFromText(text: string): number {
    if (!text) return 0;

    // Remove currency symbols and clean text
    const cleanText = text.replace(/[^\d.,]/g, '');

    // Handle different number formats
    const priceMatch = cleanText.match(/(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)/);
    if (!priceMatch) return 0;

    const priceStr = priceMatch[1].replace(/[.,]/g, '');
    const price = parseInt(priceStr, 10);

    // Handle millions (if price is too small, multiply by 1000)
    if (price < 100000 && price > 100) {
      return price * 1000;
    }

    return price;
  }
}
