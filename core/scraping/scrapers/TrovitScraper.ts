import puppeteer from 'puppeteer';
import { Property, SearchCriteria, ScrapingSource } from '../../types';
import { RateLimiter } from '../RateLimiter';
import { LocationDetector } from '../../utils/LocationDetector';
import { logger } from '../../../utils/logger';

export class TrovitScraper {
  public source: ScrapingSource;
  private rateLimiter: RateLimiter;

  constructor() {
    this.source = {
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

    this.rateLimiter = new RateLimiter(this.source.rateLimit);
  }

  /**
   * 🔥 SCRAPER SIMPLE QUE FUNCIONA
   */
  async scrape(criteria: SearchCriteria, maxPages: number = 3): Promise<Property[]> {
    logger.info('Starting Trovit scraping with enhanced mapping');

    const properties: Property[] = [];
    let currentPage = 1;

    while (currentPage <= maxPages) {
      logger.info(`Scraping Trovit page ${currentPage}`);

      // Rate limiting
      await this.rateLimiter.waitForSlot();

      const pageProperties = await this.scrapeTrovitPage(criteria, currentPage);

      if (pageProperties.length === 0) {
        logger.info(`No properties found on Trovit page ${currentPage}, stopping`);
        break;
      }

      properties.push(...pageProperties);
      logger.info(`Trovit page ${currentPage}: ${pageProperties.length} properties found`);

      currentPage++;
    }

    logger.info(`Trovit scraping completed: ${properties.length} total properties`);
    return properties;
  }

  /**
   * 🔥 SCRAPER DE PÁGINA SIMPLE
   */
  private async scrapeTrovitPage(criteria: SearchCriteria, pageNumber: number): Promise<Property[]> {
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
      await page.setViewport({ width: 1366, height: 768 });

      // 🔥 URL ORIGINAL QUE FUNCIONABA
      const searchUrl = this.buildTrovitSearchUrl(criteria, pageNumber);
      logger.info(`Navigating to: ${searchUrl}`);

      await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });

      // Esperar a que cargue el contenido
      await new Promise(resolve => setTimeout(resolve, 3000));

      // 🔥 EXTRACCIÓN AGRESIVA
      const rawProperties = await page.evaluate(() => {
        const results: any[] = [];
        
        // Buscar TODOS los elementos que podrían ser propiedades
        const selectors = [
          '.js-item-list-element',
          '.item',
          'article',
          '[class*="property"]',
          '[class*="listing"]',
          '[class*="result"]',
          'li'
        ];

        let allCards: Element[] = [];
        for (const selector of selectors) {
          const cards = Array.from(document.querySelectorAll(selector));
          allCards = allCards.concat(cards);
        }

        // Eliminar duplicados
        const uniqueCards = Array.from(new Set(allCards));
        console.log(`Found ${uniqueCards.length} potential property cards`);

        uniqueCards.forEach((card, index) => {
          try {
            const cardText = card.textContent || '';
            
            // Buscar precio en el texto
            const priceMatch = cardText.match(/\$\s*[\d\.,]+/);
            if (!priceMatch) return; // Si no hay precio, no es una propiedad

            // Extraer información básica
            let title = '';
            const titleEl = card.querySelector('h1, h2, h3, h4, .title, [class*="title"]');
            if (titleEl) {
              title = titleEl.textContent?.trim() || '';
            }

            if (!title) {
              // Usar las primeras palabras del texto como título
              const words = cardText.trim().split(/\s+/).slice(0, 8);
              title = words.join(' ');
            }

            // Extraer URL
            let url = '';
            const linkEl = card.querySelector('a');
            if (linkEl) {
              url = linkEl.href || linkEl.getAttribute('href') || '';
              if (url && !url.startsWith('http')) {
                url = `https://casas.trovit.com.co${url}`;
              }
            }

            // Extraer imagen
            let imageUrl = '';
            const imgEl = card.querySelector('img');
            if (imgEl) {
              imageUrl = imgEl.src || imgEl.getAttribute('data-src') || imgEl.getAttribute('data-lazy') || '';
            }

            // Extraer ubicación
            let location = '';
            const locationEl = card.querySelector('.location, [class*="location"]');
            if (locationEl) {
              location = locationEl.textContent?.trim() || '';
            }

            if (!location) {
              // Buscar ciudad en el texto dinámicamente
              const cityPattern = /([^,\n]*(?:bogotá|medellín|cali|barranquilla)[^,\n]*)/i;
              const locationMatch = cardText.match(cityPattern);
              if (locationMatch) {
                location = locationMatch[1].trim();
              }
            }

            if (priceMatch[0] && title) {
              results.push({
                title: title || 'Apartamento en arriendo',
                priceText: priceMatch[0],
                location: location || '',
                url: url || `https://casas.trovit.com.co/property/${index}`,
                imageUrl: imageUrl || '',
                source: 'Trovit'
              });
            }

          } catch (error) {
            console.log(`Error processing card ${index}:`, error);
          }
        });

        return results;
      });

      // Procesar propiedades
      const properties: Property[] = [];

      rawProperties.forEach((rawProp, index) => {
        try {
          const price = this.parsePrice(rawProp.priceText);
          if (price <= 0) return;

          const property: Property = {
            id: `trovit_${Date.now()}_${index}`,
            title: rawProp.title,
            price: price,
            adminFee: 0,
            totalPrice: price,
            area: 0, // Se puede estimar después
            rooms: 0, // Se puede estimar después
            bathrooms: 0, // Se puede estimar después
            parking: 0,
            location: {
              address: rawProp.location,
              neighborhood: this.extractNeighborhood(rawProp.location),
              city: this.extractCity(rawProp.location, criteria),
              coordinates: { lat: 0, lng: 0 }
            },
            amenities: [],
            images: rawProp.imageUrl ? [rawProp.imageUrl] : [],
            url: rawProp.url,
            source: this.source.name,
            scrapedDate: new Date().toISOString(),
            pricePerM2: 0,
            description: '',
            isActive: true
          };

          // Validación básica
          if (this.meetsBasicCriteria(property, criteria)) {
            properties.push(property);
          }

        } catch (error) {
          logger.warn(`Error processing Trovit property ${index}:`, error);
        }
      });

      return properties;

    } finally {
      await browser.close();
    }
  }

  /**
   * 🔥 URL BUILDER DINÁMICO - SIN HARDCODING
   */
  private buildTrovitSearchUrl(criteria: SearchCriteria, page: number): string {
    // Detectar ubicación dinámicamente
    let locationInfo = null;
    if (criteria.hardRequirements.location?.neighborhoods?.length) {
      const searchText = criteria.hardRequirements.location.neighborhoods[0];
      locationInfo = LocationDetector.detectLocation(searchText);
      logger.info(`🎯 Trovit - Ubicación detectada: ${locationInfo.city} ${locationInfo.neighborhood || ''} (confianza: ${locationInfo.confidence})`);
    }

    // Usar ciudad detectada dinámicamente
    const city = locationInfo?.city || 'bogotá';
    const neighborhood = locationInfo?.neighborhood;

    // 🔥 DINÁMICO: Determinar tipo de transacción
    const transactionType = this.getTransactionType(criteria);
    const propertyType = 'apartamento'; // Por ahora apartamentos, se puede hacer dinámico después

    // Construir URL base dinámicamente
    let baseUrl = `https://casas.trovit.com.co/${transactionType}-${propertyType}-${city}`;

    // Agregar barrio si está disponible
    if (neighborhood) {
      const neighborhoodUrl = this.getNeighborhoodUrl(neighborhood, city);
      if (neighborhoodUrl) {
        baseUrl = `https://casas.trovit.com.co/${transactionType}-${propertyType}-${neighborhoodUrl}`;
      }
    }

    const params = new URLSearchParams();
    params.set('what', `${propertyType} ${transactionType}`);
    params.set('where', neighborhood || city);

    if (page > 1) {
      params.set('page', page.toString());
    }

    return `${baseUrl}?${params.toString()}`;
  }

  /**
   * Determinar tipo de transacción dinámicamente
   */
  private getTransactionType(criteria: SearchCriteria): string {
    // 🚀 IMPLEMENTADO: Usar el campo operation de SearchCriteria
    const operation = criteria.hardRequirements.operation || 'arriendo';

    // Mapear a los valores que usa Trovit
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
   * Obtener URL de barrio dinámicamente
   */
  private getNeighborhoodUrl(neighborhood: string, city: string): string {
    const neighborhoodMap: Record<string, Record<string, string>> = {
      'bogotá': {
        'usaquén': 'usaquen-bogota',
        'usaquen': 'usaquen-bogota',
        'chapinero': 'chapinero-bogota',
        'suba': 'suba-bogota',
        'cedritos': 'cedritos-bogota',
        'zona rosa': 'zona-rosa-bogota'
      },
      'medellín': {
        'el poblado': 'el-poblado-medellin',
        'poblado': 'el-poblado-medellin',
        'laureles': 'laureles-medellin'
      }
    };

    return neighborhoodMap[city]?.[neighborhood.toLowerCase()] || '';
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
   * Extract city from location text or criteria
   */
  private extractCity(locationText: string, criteria: SearchCriteria): string {
    if (!locationText) {
      // Usar ciudad de los criterios si está disponible
      if (criteria.hardRequirements.location?.neighborhoods?.length) {
        const searchText = criteria.hardRequirements.location.neighborhoods[0];
        const locationInfo = LocationDetector.detectLocation(searchText);
        return locationInfo.city || 'Bogotá';
      }
      return 'Bogotá';
    }

    // Buscar ciudad en el texto
    const cityPattern = /(bogotá|medellín|cali|barranquilla|cartagena|bucaramanga)/i;
    const cityMatch = locationText.match(cityPattern);
    return cityMatch ? cityMatch[1] : 'Bogotá';
  }

  /**
   * Extract neighborhood from location text (sin hardcoding de ciudad)
   */
  private extractNeighborhood(locationText: string): string {
    if (!locationText) return '';

    // Remover cualquier ciudad conocida del texto
    const cityPattern = /,?\s*(bogotá|medellín|cali|barranquilla|cartagena|bucaramanga)/i;
    const cleaned = locationText.replace(cityPattern, '').trim();
    const parts = cleaned.split(',');
    return parts[0]?.trim() || '';
  }

  /**
   * Check if property meets basic criteria
   */
  private meetsBasicCriteria(property: Property, criteria: SearchCriteria): boolean {
    if (property.price > criteria.hardRequirements.maxTotalPrice) {
      return false;
    }
    return true;
  }
}
