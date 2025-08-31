import { Property, SearchCriteria, ScrapingSource } from '../../types';
import { RateLimiter } from '../RateLimiter';
import { LocationDetector } from '../../utils/LocationDetector';
import { logger } from '../../../utils/logger';
import puppeteer from 'puppeteer';

export class RentolaScraper {
  public source: ScrapingSource;
  private rateLimiter: RateLimiter;

  constructor() {
    this.source = {
      id: 'rentola',
      name: 'Rentola',
      baseUrl: 'https://rentola.com',
      isActive: true,
      priority: 8,
      rateLimit: {
        requestsPerMinute: 10,
        delayBetweenRequests: 6000,
        maxConcurrentRequests: 1
      },
      selectors: {
        propertyCard: '[data-testid*="listing"], .listing-card',
        title: 'h1, h2, h3, .title',
        price: '.price, [data-testid*="price"]',
        area: '.area, .size',
        rooms: '.bedrooms, .rooms',
        bathrooms: '.bathrooms',
        location: '.location, .address',
        amenities: '.amenities',
        images: 'img',
        link: 'a',
        nextPage: '.next-page'
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-CO,es;q=0.9,en;q=0.8'
      }
    };

    this.rateLimiter = new RateLimiter(this.source.rateLimit);
  }

  /**
   * 🔥 RENTOLA SCRAPER - URL CORRECTA QUE FUNCIONA
   */
  async scrape(criteria: SearchCriteria, maxPages: number = 1): Promise<Property[]> {
    logger.info('Starting Rentola scraping');

    const allProperties: Property[] = [];
    let currentPage = 1;

    while (currentPage <= maxPages) {
      await this.rateLimiter.waitForSlot();

      try {
        const searchUrl = this.buildRentolaUrl(criteria);
        const pageUrl = currentPage === 1 ? searchUrl : `${searchUrl}?page=${currentPage}`;
        logger.info(`Scraping Rentola page ${currentPage}: ${pageUrl}`);

        // 🔥 Rentola es SPA - USAR HEADLESS DIRECTAMENTE
        const pageProperties = await this.scrapeWithHeadless(pageUrl, criteria);
        
        if (pageProperties.length > 0) {
          allProperties.push(...pageProperties);
          logger.info(`Rentola headless page ${currentPage}: ${pageProperties.length} properties found`);
        } else {
          logger.info(`No properties found with headless on page ${currentPage}, stopping`);
          break;
        }

        currentPage++;

      } catch (error) {
        logger.error(`Error scraping Rentola page ${currentPage}:`, error);
        break;
      }
    }

    logger.info(`Rentola scraping completed: ${allProperties.length} total properties`);
    return allProperties;
  }

  /**
   * Build Rentola search URL - URL CORRECTA QUE FUNCIONA
   */
  private buildRentolaUrl(criteria: SearchCriteria): string {
    // 🔥 USAR URL CORRECTA DE RENTOLA.COM (NO .COM.CO)
    const locationText = criteria.hardRequirements.location?.neighborhoods?.join(' ') || '';
    const locationInfo = LocationDetector.detectLocation(locationText);

    logger.info(`🎯 Rentola - Ubicación detectada: ${locationInfo.city} ${locationInfo.neighborhood || ''} (confianza: ${locationInfo.confidence})`);

    // 🔥 URL ESPECÍFICA PARA BARRIOS
    if (criteria.hardRequirements.location?.neighborhoods?.length) {
      const neighborhood = criteria.hardRequirements.location.neighborhoods[0].toLowerCase();
      
      // Mapeo específico de barrios que funcionan
      const neighborhoodMap: Record<string, string> = {
        'usaquén': 'bogota-localidad-usaquen',
        'usaquen': 'bogota-localidad-usaquen',
        'suba': 'bogota-localidad-suba',
        'chapinero': 'bogota-localidad-chapinero',
        'cedritos': 'bogota-localidad-usaquen', // Cedritos está en Usaquén
        'zona rosa': 'bogota-localidad-chapinero'
      };

      const mappedNeighborhood = neighborhoodMap[neighborhood];
      if (mappedNeighborhood) {
        return `https://rentola.com/for-rent/co/${mappedNeighborhood}`;
      }
    }

    // 🔥 URL GENÉRICA PARA CIUDAD
    const cityMap: Record<string, string> = {
      'bogotá': 'bogota',
      'bogota': 'bogota',
      'medellín': 'medellin',
      'medellin': 'medellin',
      'cali': 'cali'
    };

    const cityUrl = cityMap[locationInfo.city] || 'bogota';
    return `https://rentola.com/for-rent/co/${cityUrl}`;
  }

  /**
   * 🔥 HEADLESS SCRAPER PARA RENTOLA SPA
   */
  private async scrapeWithHeadless(url: string, criteria: SearchCriteria): Promise<Property[]> {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();

    try {
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      await page.setViewport({ width: 1366, height: 768 });

      // Navigate and wait for content to load
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Extract property data
      const items = await page.evaluate(() => {
        const out: Array<{title:string; priceText:string; url:string; imageUrl:string; location:string; rooms:string; bathrooms:string; area:string;}> = [];
        const doc: any = (globalThis as any).document;

        // Try multiple selectors for property cards
        const selectors = [
          '[data-testid*="listing"]',
          '.listing-card',
          '.property-card',
          '.rental-listing',
          '.search-result',
          'article',
          '.card'
        ];

        let cards: any[] = [];
        for (const selector of selectors) {
          cards = Array.from(doc.querySelectorAll(selector));
          if (cards.length > 0) break;
        }

        cards.forEach((el: any) => {
          try {
            const title = el.querySelector('h1, h2, h3, h4, .title, [data-testid*="title"]')?.textContent?.trim() || '';
            const priceText = el.querySelector('.price, [data-testid*="price"], .cost, .rent')?.textContent?.trim() || '';
            const linkEl: any = el.querySelector('a[href]');
            const url = linkEl ? (linkEl.href || linkEl.getAttribute('href')) : '';
            const imgEl: any = el.querySelector('img');
            const imageUrl = imgEl?.getAttribute?.('src') || imgEl?.getAttribute?.('data-src') || '';
            const location = el.querySelector('.location, .address, [data-testid*="location"]')?.textContent?.trim() || '';

            // Extract rooms, bathrooms, area from text
            const fullText = el.textContent?.toLowerCase() || '';
            const roomsMatch = fullText.match(/(\d+)\s*(room|bedroom|habitacion|cuarto)/i);
            const bathroomMatch = fullText.match(/(\d+)\s*(bathroom|baño)/i);
            const areaMatch = fullText.match(/(\d+)\s*m[²2]/i);

            if ((title || priceText) && url) {
              out.push({
                title,
                priceText,
                url,
                imageUrl,
                location,
                rooms: roomsMatch ? roomsMatch[1] : '',
                bathrooms: bathroomMatch ? bathroomMatch[1] : '',
                area: areaMatch ? areaMatch[1] : ''
              });
            }
          } catch (error) {
            console.warn('Error parsing property:', error);
          }
        });

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
            location: {
              address: item.location || '',
              neighborhood: this.extractNeighborhood(item.location),
              city: this.extractCity(item.location, criteria),
              coordinates: { lat: 0, lng: 0 }
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
      await page.close();
      await browser.close();
    }
  }

  private extractCity(locationText: string, criteria: SearchCriteria): string {
    if (!locationText) {
      if (criteria.hardRequirements.location?.neighborhoods?.length) {
        const searchText = criteria.hardRequirements.location.neighborhoods[0];
        const locationInfo = LocationDetector.detectLocation(searchText);
        return locationInfo.city || 'Bogotá';
      }
      return 'Bogotá';
    }

    const cityPattern = /(bogotá|medellín|cali|barranquilla|cartagena|bucaramanga)/i;
    const cityMatch = locationText.match(cityPattern);
    return cityMatch ? cityMatch[1] : 'Bogotá';
  }

  private extractNeighborhood(locationText: string): string {
    if (!locationText) return '';
    const cityPattern = /,?\s*(bogotá|medellín|cali|barranquilla|cartagena|bucaramanga)/i;
    const cleaned = locationText.replace(cityPattern, '').trim();
    const parts = cleaned.split(',');
    return parts[0]?.trim() || '';
  }

  private meetsBasicCriteria(property: Property, criteria: SearchCriteria): boolean {
    if (property.price > criteria.hardRequirements.maxTotalPrice) {
      return false;
    }
    return true;
  }

  private parsePrice(priceText: string): number {
    if (!priceText) return 0;
    const cleanPrice = priceText.replace(/[^\d]/g, '');
    return parseInt(cleanPrice) || 0;
  }
}
