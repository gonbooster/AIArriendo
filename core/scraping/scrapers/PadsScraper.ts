import { Property, SearchCriteria, ScrapingSource } from '../../types';
import { RateLimiter } from '../RateLimiter';
import { LocationDetector } from '../../utils/LocationDetector';
import { logger } from '../../../utils/logger';
import * as cheerio from 'cheerio';
import axios from 'axios';

export class PadsScraper {
  public source: ScrapingSource;
  private rateLimiter: RateLimiter;

  constructor() {
    this.source = {
      id: 'pads',
      name: 'PADS',
      baseUrl: 'https://www.pads.com.co',
      isActive: true,
      priority: 11,
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
   * Build PADS search URL - UNIFICADO
   */
  private buildPadsUrl(criteria: SearchCriteria): string {
    // USAR URL BUILDER UNIFICADO - ELIMINA TODA LA DUPLICACIÓN
    // 🔥 USAR LOCATIONDETECTOR SIN HARDCODING
    const locationText = criteria.hardRequirements.location?.neighborhoods?.join(' ') || '';
    const locationInfo = LocationDetector.detectLocation(locationText);

    // 🔥 DINÁMICO: Determinar tipo de transacción
    const transactionType = this.getTransactionType(criteria);

    // PADS usa formato: /inmuebles-en-{transaccion} con filtros por query params
    const baseUrl = `https://www.pads.com.co/inmuebles-en-${transactionType}`;

    // PADS usa query params para filtros
    const params = new URLSearchParams();
    if (locationInfo.neighborhood) {
      params.append('location', locationInfo.neighborhood);
    } else if (locationInfo.city) {
      params.append('location', locationInfo.city);
    }
    params.append('type', 'apartamento');

    const url = params.toString() ? `${baseUrl}?${params.toString()}` : baseUrl;

    logger.info(`🎯 PADS - Ubicación detectada: ${locationInfo.city} ${locationInfo.neighborhood || ''} (confianza: ${locationInfo.confidence})`);

    return url;
  }

  /**
   * Determinar tipo de transacción dinámicamente
   */
  private getTransactionType(criteria: SearchCriteria): string {
    // 🚀 IMPLEMENTADO: Usar el campo operation de SearchCriteria
    const operation = criteria.hardRequirements.operation || 'arriendo';

    // Mapear a los valores que usa PADS
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
   * Extract properties from PADS HTML
   */
  private extractPadsProperties($: cheerio.CheerioAPI, criteria: SearchCriteria): Property[] {
    const properties: Property[] = [];

    // PADS specific selectors based on real HTML structure
    const propertyCards = $('a[href*="/propiedades/"]');

    logger.info(`Found ${propertyCards.length} PADS property cards`);

    if (propertyCards.length === 0) {
      logger.warn('No property cards found on PADS');
      return properties;
    }

    propertyCards.each((index, card) => {
      try {
        const $card = $(card);

        // Extract URL
        const url = $card.attr('href') || '';
        if (!url) return;

        // Extract price from .text-lg.font-semibold
        const priceElement = $card.find('.text-lg.font-semibold');
        const priceText = priceElement.text().trim();

        // 🔧 MEJORAR EXTRACCIÓN DE DATOS - PADS específico
        const infoElements = $card.find('.flex.text-xs div, .text-xs, .property-details div');
        let rooms = '';
        let area = '';
        let parking = '';

        // Buscar en elementos de información
        infoElements.each((i, el) => {
          const text = $(el).text().trim();
          if (text.includes('Alc.') || text.includes('hab') || text.includes('cuarto')) {
            rooms = text.replace(/[^\d]/g, '').trim();
          } else if (text.includes('m2') || text.includes('m²')) {
            area = text.replace(/[^\d.]/g, '').trim();
          } else if (text.includes('Parq.') || text.includes('garage') || text.includes('parking')) {
            parking = text.replace(/[^\d]/g, '').trim();
          }
        });

        // Si no se encontró parking, buscar en todo el texto de la card
        if (!parking) {
          const fullCardText = $card.text();
          const parkingPatterns = [
            /(\d+)\s*(?:parq|parqueadero|parqueaderos|garage|garaje|parking)/i,
            /(?:parq|parqueadero|parqueaderos|garage|garaje|parking)[:\s]*(\d+)/i
          ];
          for (const pattern of parkingPatterns) {
            const match = fullCardText.match(pattern);
            if (match) {
              parking = match[1];
              break;
            }
          }
        }

        // Extract location from .text-sm
        const locationElement = $card.find('.text-sm');
        const location = locationElement.text().trim();

        // 🔧 MEJORAR EXTRACCIÓN DE IMÁGENES - PADS específico
        let imageUrl = '';

        // Intentar múltiples selectores para imágenes
        const imageSelectors = [
          '.bg-image',
          'img[src]',
          '[style*="background-image"]',
          '.property-image img',
          '.image img',
          'img'
        ];

        for (const selector of imageSelectors) {
          const imageElement = $card.find(selector);
          if (imageElement.length > 0) {
            if (selector === '.bg-image' || selector.includes('style')) {
              const style = imageElement.attr('style') || '';
              const urlMatch = style.match(/background-image:url\(([^)]+)\)/);
              if (urlMatch) {
                imageUrl = urlMatch[1].replace(/['"]/g, '');
                break;
              }
            } else {
              const src = imageElement.attr('src') || imageElement.attr('data-src');
              if (src && !src.includes('placeholder') && !src.includes('logo')) {
                imageUrl = src.startsWith('http') ? src : `https://www.pads.com.co${src}`;
                break;
              }
            }
          }
        }

        // Create title
        const title = `Propiedad en ${location}`;

        // Only add if we have essential data
        if (url && (priceText || location)) {
          const property = this.createPropertyFromData({
            title,
            priceText,
            url: url.startsWith('http') ? url : `https://pads.com.co${url}`,
            imageUrl,
            location,
            rooms: rooms || '1',
            bathrooms: '1', // Default since not specified in PADS
            area: area || '',
            parking: parking || '0',
            source: 'PADS'
          });

          if (property) {
            properties.push(property);
          }
        }
      } catch (error) {
        logger.warn(`Error parsing PADS property ${index}:`, error);
      }
    });

    return properties;
  }

  /**
   * Create property from extracted data
   */
  private createPropertyFromData(data: any): Property | null {
    try {
      // Parse price
      let totalPrice = 0;
      if (data.priceText) {
        const priceMatch = data.priceText.match(/[\d,]+/);
        if (priceMatch) {
          totalPrice = parseInt(priceMatch[0].replace(/,/g, ''));
        }
      }

      // Parse area
      let area = 0;
      if (data.area) {
        const areaMatch = data.area.match(/\d+/);
        if (areaMatch) {
          area = parseInt(areaMatch[0]);
        }
      }

      // Parse rooms
      let rooms = 1;
      if (data.rooms) {
        const roomsMatch = data.rooms.match(/\d+/);
        if (roomsMatch) {
          rooms = parseInt(roomsMatch[0]);
        }
      }

      // Parse parking
      let parking = 0;
      if (data.parking) {
        const parkingMatch = data.parking.match(/\d+/);
        if (parkingMatch) {
          parking = parseInt(parkingMatch[0]);
        }
      }

      // 🆕 EXTRAER ESTRATO CON PATRONES MEJORADOS
      const fullText = `${data.title} ${data.location}`.toLowerCase();
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

      // 🆕 MEJORAR EXTRACCIÓN DE ÁREA SI NO SE ENCONTRÓ
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

      return {
        id: `pads-${Date.now()}-${Math.random()}`,
        source: 'PADS',
        title: data.title,
        price: totalPrice,
        adminFee: 0,
        totalPrice: totalPrice,
        area,
        rooms,
        bathrooms: 1,
        parking,
        stratum, // 🆕 USAR ESTRATO EXTRAÍDO
        location: {
          address: data.location,
          neighborhood: data.location.split(',')[0]?.trim() || '',
          city: 'Dynamic',
          coordinates: { lat: 0, lng: 0 }
        },
        amenities: [],
        description: data.title,
        images: data.imageUrl ? [data.imageUrl] : [],
        url: data.url,
        scrapedDate: new Date().toISOString(),
        pricePerM2: area > 0 ? Math.round(totalPrice / area) : 0,
        isActive: true
      };
    } catch (error) {
      logger.warn('Error creating PADS property:', error);
      return null;
    }
  }

  /**
   * Scrape PADS properties
   */
  async scrape(criteria: SearchCriteria, maxPages: number = 1): Promise<Property[]> {
    logger.info('Starting PADS scraping');

    try {
      const searchUrl = this.buildPadsUrl(criteria);
      logger.info(`PADS URL: ${searchUrl}`);

      const allProperties: Property[] = [];
      let currentPage = 1;

      while (currentPage <= maxPages) {
        await this.rateLimiter.waitForSlot();

        try {
          const pageUrl = currentPage === 1 ? searchUrl : `${searchUrl}?page=${currentPage}`;
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
          const pageProperties = this.extractPadsProperties($, criteria);

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
}
