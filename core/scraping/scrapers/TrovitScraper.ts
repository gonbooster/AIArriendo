import puppeteer, { Browser, Page } from 'puppeteer';
import { BaseScraper } from '../BaseScraper';
import { Property, SearchCriteria } from '../../types';
import { PropertyParser } from '../PropertyParser';
import { RateLimiter } from '../RateLimiter';
import { logger } from '../../../utils/logger';

export class TrovitScraper extends BaseScraper {
  constructor() {
    const trovitSource = {
      id: 'trovit',
      name: 'Trovit',
      baseUrl: 'https://casas.trovit.com.co',
      isActive: true,
      priority: 3,
      rateLimit: {
        requestsPerMinute: 20,
        delayBetweenRequests: 3000,
        maxConcurrentRequests: 1
      },
      selectors: {
        propertyCard: '.js-item-list-element, .item',
        title: '.item_title, .js-item-title',
        price: '.item_price, .price',
        area: '.item_surface, .surface',
        rooms: '.item_rooms, .rooms',
        bathrooms: '.item_bathrooms, .bathrooms',
        location: '.item_location, .location',
        amenities: '.item_features, .features',
        images: '.item_image img',
        link: '.item_link, a',
        nextPage: '.pagination .next, .js-pagination-next'
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-CO,es;q=0.9,en;q=0.8'
      }
    };

    const rateLimiter = new RateLimiter(trovitSource.rateLimit);
    super(trovitSource, rateLimiter);
  }

  /**
   * Trovit-specific scraping implementation
   */
  async scrape(criteria: SearchCriteria, maxPages: number = 10): Promise<Property[]> {
    logger.info('Starting Trovit scraping with enhanced mapping');
    
    const browser = await this.initTrovitBrowser();
    
    try {
      const properties: Property[] = [];
      let currentPage = 1;

      while (currentPage <= maxPages) {
        logger.info(`Scraping Trovit page ${currentPage}`);
        
        // Rate limiting
        await this.rateLimiter.waitForSlot();

        const pageProperties = await this.scrapeTrovitPage(browser, criteria, currentPage);
        
        if (pageProperties.length === 0) {
          logger.info(`No properties found on Trovit page ${currentPage}, stopping`);
          break;
        }

        properties.push(...pageProperties);
        logger.info(`Trovit page ${currentPage}: ${pageProperties.length} properties found`);

        currentPage++;
      }

      return properties;

    } finally {
      await browser.close();
    }
  }

  /**
   * Initialize browser with Trovit-specific settings
   */
  private async initTrovitBrowser(): Promise<Browser> {
    return await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ]
    });
  }

  /**
   * Scrape a specific Trovit page
   */
  private async scrapeTrovitPage(
    browser: Browser, 
    criteria: SearchCriteria, 
    pageNumber: number
  ): Promise<Property[]> {
    const page = await browser.newPage();
    
    try {
      // Configure page for Trovit
      await this.configureTrovitPage(page);

      // Build Trovit search URL
      const searchUrl = this.buildTrovitSearchUrl(criteria, pageNumber);
      logger.info(`Navigating to: ${searchUrl}`);

      // Navigate to page
      await page.goto(searchUrl, { 
        waitUntil: 'networkidle2', 
        timeout: 30000 
      });

      // Handle potential CAPTCHA or blocking
      await this.handleTrovitBlocking(page);

      // Wait for content to load
      await this.waitForTrovitContent(page);
      // Extra wait to ensure cards render
      await page.waitForSelector('.js-item-list-element, .item, article', { timeout: 5000 }).catch(()=>{});

      // Extract properties using Trovit-specific logic
      const properties = await this.extractTrovitProperties(page);

      // Process and validate properties
      return this.processTrovitProperties(properties);

    } finally {
      await page.close();
    }
  }

  /**
   * Configure page specifically for Trovit
   */
  private async configureTrovitPage(page: Page): Promise<void> {
    // Set user agent
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    );

    // Set viewport
    await page.setViewport({ width: 1366, height: 768 });

    // Set extra headers
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'es-CO,es;q=0.9,en;q=0.8',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    });

    // Allow images for better title/alt extraction
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const resourceType = req.resourceType();
      if (['stylesheet', 'font'].includes(resourceType)) {
        req.abort();
      } else {
        req.continue();
      }
    });
  }

  /**
   * Build Trovit search URL with specific parameters
   */
  private buildTrovitSearchUrl(criteria: SearchCriteria, page: number): string {
    let baseUrl = 'https://casas.trovit.com.co/arriendo-apartamento-bogota';
    const params = new URLSearchParams();

    // Add neighborhood to search if specified
    let where = 'bogota';
    if (criteria.hardRequirements.location?.neighborhoods?.length) {
      const neighborhood = criteria.hardRequirements.location.neighborhoods[0];
      // Map neighborhood names to Trovit location format
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
        where = mappedNeighborhood;
        baseUrl = `https://casas.trovit.com.co/arriendo-apartamento-${mappedNeighborhood}`;
      }
    }

    // Basic search parameters - NO FILTERS, GET EVERYTHING
    params.set('what', 'apartamento arriendo');
    params.set('where', where);

    // Page parameter
    if (page > 1) {
      params.set('page', page.toString());
    }

    return `${baseUrl}?${params.toString()}`;
  }

  /**
   * Handle potential blocking or CAPTCHA
   */
  private async handleTrovitBlocking(page: Page): Promise<void> {
    try {
      // Check for CAPTCHA
      const captchaElement = await page.$('.captcha, #captcha, [data-captcha]');
      if (captchaElement) {
        logger.warn('CAPTCHA detected on Trovit, waiting...');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }

      // Check for blocking message
      const blockingElement = await page.$('.blocked, .access-denied');
      if (blockingElement) {
        logger.warn('Access blocked on Trovit');
        throw new Error('Access blocked by Trovit');
      }

    } catch (error) {
      logger.warn('Error handling Trovit blocking:', error);
    }
  }

  /**
   * Wait for Trovit content to load
   */
  private async waitForTrovitContent(page: Page): Promise<void> {
    try {
      await page.waitForSelector('body', { timeout: 10000 });
      // scroll para forzar render
      await page.evaluate(async () => {
        await new Promise<void>((resolve) => {
          let total = 0;
          const step = () => {
            (globalThis as any).scrollBy(0, 1200);
            total += 1200;
            if (total < 8000) setTimeout(step, 350); else resolve();
          };
          step();
        });
      });
      // Wait for property listings
      await page.waitForSelector('.js-item-list-element, .item, article, [class*="property"], li', {
        timeout: 15000
      });
      // Additional wait for dynamic content
      await new Promise(resolve => setTimeout(resolve, 1500));
    } catch (error) {
      logger.warn('Timeout waiting for Trovit content');
    }
  }

  /**
   * Extract properties from Trovit page
   */
  private async extractTrovitProperties(page: Page): Promise<any[]> {
    return await (page as any).evaluate(() => {
      const properties: any[] = [];
      const doc: any = (globalThis as any).document;
      const propertyCards = doc ? doc.querySelectorAll('.js-item-list-element, .item, article, [class*="property"], li') : [];

      propertyCards.forEach((card: any, index: number) => {
        try {
          // Extract title (with fallbacks)
          let title = card.querySelector('.item_title, .js-item-title, [class*="title"]')?.textContent?.trim() || '';
          if (!title) {
            const linkEl: any = card.querySelector('.item_link, a');
            title = (linkEl?.getAttribute?.('title') || linkEl?.textContent || '').trim();
          }
          if (!title) {
            const imgEl: any = card.querySelector('img');
            title = (imgEl?.getAttribute?.('alt') || '').trim();
          }
          if (!title) {
            // derive from nearby heading or container text
            const header = card.querySelector('h2, h3, h4');
            title = (header?.textContent || '').trim();
          }
          if (!title) {
            const t = (card.innerText || '').toString().split('\n').map((s: any)=>String(s).trim()).filter(Boolean)[0] || '';
            title = t;
          }

          // Extract price with regex fallback
          const priceElement = card.querySelector('.item_price, .price');
          let priceText = priceElement?.textContent?.trim() || '';
          if (!priceText) {
            const text = (card.innerText || '').toString();
            const m = text.match(/(?:\$|COP|Col\$)\s*[\d\.,]+/i);
            priceText = m ? m[0] : '';
          }

          // Extract area with regex fallback
          const areaElement = card.querySelector('.item_surface, .surface');
          let areaText = areaElement?.textContent?.trim() || '';
          if (!areaText) {
            const text = (card.innerText || '').toString();
            const m = text.match(/(\d+(?:[\.,]\d+)?)\s*m[²2]/i);
            areaText = m ? m[0] : '';
          }

          // Extract rooms with regex fallback
          const roomsElement = card.querySelector('.item_rooms, .rooms');
          let roomsText = roomsElement?.textContent?.trim() || '';
          if (!roomsText) {
            const text = (card.innerText || '').toString();
            const m = text.match(/(\d+)\s*(hab|habitacion|alcoba|dormitorio|bedroom)/i);
            roomsText = m ? m[0] : '';
          }

          // Extract location
          const locationElement = card.querySelector('.item_location, .location');
          const location = locationElement?.textContent?.trim() || '';

          // Extract link (prefer absolute)
          const linkElement = card.querySelector('.item_link, a');
          let url = linkElement?.getAttribute('href') || '';
          const href = (linkElement as any)?.href;
          if (href) url = href;
          if (url && !url.startsWith('http')) {
            url = `https://casas.trovit.com.co${url}`;
          }

          // Extract image (lazy variants)
          const img = card.querySelector('.item_image img, img');
          let imageUrl = img?.getAttribute('data-src') || img?.getAttribute('data-lazy') || img?.getAttribute('src') || '';
          if (!imageUrl) {
            const srcset = img?.getAttribute('srcset') || '';
            if (srcset) imageUrl = srcset.split(',')[0]?.trim().split(' ')[0] || '';
          }

          // Extract additional Trovit-specific data
          const descriptionElement = card.querySelector('.item_description, .description');
          const description = descriptionElement?.textContent?.trim() || '';

          // Extract features/amenities
          const featuresElements = card.querySelectorAll('.item_features .feature, .features .feature');
          const features: string[] = [];
          featuresElements.forEach((feature: any) => {
            const featureText = feature.textContent?.trim();
            if (featureText) features.push(featureText);
          });

          if (priceText && url) {
            properties.push({
              title: title || 'Apartamento en arriendo',
              priceText,
              areaText,
              roomsText,
              location,
              url,
              imageUrl,
              description,
              features,
              source: 'Trovit'
            });
          }

        } catch (error) {
          console.log(`Error processing Trovit property ${index}:`, error);
        }
      });

      return properties;
    });
  }

  /**
   * Process and validate Trovit properties
   */
  private processTrovitProperties(rawProperties: any[]): Property[] {
    const parser = new PropertyParser(this.source);
    const processedProperties: Property[] = [];

    for (const rawProperty of rawProperties) {
      try {
        // Enhanced parsing for Trovit-specific data
        const property = this.parseTrovitProperty(rawProperty, parser);
        
        if (property && this.validateTrovitProperty(property)) {
          processedProperties.push(property);
        }

      } catch (error) {
        logger.warn('Error processing Trovit property:', error);
      }
    }

    return processedProperties;
  }

  /**
   * Parse Trovit-specific property data
   */
  private parseTrovitProperty(rawProperty: any, parser: PropertyParser): Property | null {
    // Normalizar campos esperados por el parser
    const normalizedRaw = {
      ...rawProperty,
      price: rawProperty.price || rawProperty.priceText,
      area: rawProperty.area || rawProperty.areaText,
      rooms: rawProperty.rooms || rawProperty.roomsText,
      bathrooms: rawProperty.bathrooms || rawProperty.bathroomsText,
      images: rawProperty.images || (rawProperty.imageUrl ? [rawProperty.imageUrl] : undefined),
      url: rawProperty.url
    };

    // Parse base property
    const baseProperty = parser.parseProperty(normalizedRaw);
    if (!baseProperty) return null;

    // Enhance with Trovit-specific data
    baseProperty.description = rawProperty.description || baseProperty.description || '';

    // Parse Trovit-specific amenities
    if (rawProperty.features && Array.isArray(rawProperty.features)) {
      const trovitAmenities = this.parseTrovitAmenities(rawProperty.features);
      baseProperty.amenities = [...new Set([...(baseProperty.amenities || []), ...trovitAmenities])];
    }

    // Normalize Trovit URLs (por si algo pasó aguas arriba)
    if (baseProperty.url && !baseProperty.url.startsWith('http')) {
      baseProperty.url = `https://casas.trovit.com.co${baseProperty.url}`;
    }

    return baseProperty;
  }

  /**
   * Parse Trovit-specific amenities
   */
  private parseTrovitAmenities(features: string[]): string[] {
    const amenityMap: { [key: string]: string } = {
      'piscina': 'piscina',
      'gimnasio': 'gimnasio',
      'gym': 'gimnasio',
      'jacuzzi': 'jacuzzi',
      'sauna': 'sauna',
      'turco': 'turco',
      'padel': 'cancha de padel',
      'tenis': 'tenis',
      'squash': 'squash',
      'salon social': 'salon social',
      'bbq': 'bbq',
      'parqueadero': 'parqueadero',
      'garaje': 'parqueadero',
      'porteria': 'porteria',
      'seguridad': 'seguridad',
      'ascensor': 'ascensor',
      'balcon': 'balcon',
      'terraza': 'terraza'
    };

    const amenities: string[] = [];
    
    features.forEach(feature => {
      const featureLower = feature.toLowerCase();
      for (const [key, value] of Object.entries(amenityMap)) {
        if (featureLower.includes(key)) {
          amenities.push(value);
        }
      }
    });

    return [...new Set(amenities)];
  }

  /**
   * Validate Trovit-specific property
   */
  private validateTrovitProperty(property: Property): boolean {
    // Basic validation
    if (!property.url || property.price <= 0) return false;
    if (!property.title) property.title = 'Apartamento en arriendo';

    // Normalize/validate URL
    if (!property.url.startsWith('http')) {
      property.url = `https://casas.trovit.com.co${property.url}`;
    }
    if (!property.url.includes('trovit.com')) {
      logger.warn('Invalid Trovit URL:', property.url);
      return false;
    }

    // Broader price range; filtramos por criterio máximo arriba
    if (property.totalPrice < 300000 || property.totalPrice > 30000000) return false;

    return true;
  }
}
