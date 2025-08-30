import { BaseScraper } from '../BaseScraper';
import { Property, SearchCriteria, ScrapingSource } from '../../types';
import { RateLimiter } from '../RateLimiter';
import { LocationDetector } from '../../utils/LocationDetector';
import { logger } from '../../../utils/logger';
import * as cheerio from 'cheerio';
import axios from 'axios';

export class PadsScraper extends BaseScraper {
  constructor(source: ScrapingSource, rateLimiter: RateLimiter) {
    super(source, rateLimiter);
  }

  /**
   * Build PADS search URL
   */
  private buildPadsUrl(criteria: SearchCriteria): string {
    // Detectar ubicación usando el sistema inteligente
    let locationInfo = null;
    if (criteria.hardRequirements.location?.neighborhoods?.length) {
      const searchText = criteria.hardRequirements.location.neighborhoods[0];
      locationInfo = LocationDetector.detectLocation(searchText);
      logger.info(`🎯 PADS - Ubicación detectada: ${locationInfo.city} ${locationInfo.neighborhood || ''} (confianza: ${locationInfo.confidence})`);
    }

    // Usar ubicación detectada o fallback a Bogotá
    const city = locationInfo?.city || 'bogotá';
    const neighborhood = locationInfo?.neighborhood;

    // Mapeo de ciudades para PADS
    const cityUrlMap: Record<string, string> = {
      'bogotá': 'bogota',
      'bogota': 'bogota',
      'medellín': 'medellin',
      'medellin': 'medellin',
      'cali': 'cali',
      'barranquilla': 'barranquilla',
      'cartagena': 'cartagena',
      'bucaramanga': 'bucaramanga'
    };

    const cityUrl = cityUrlMap[city] || 'bogota';
    let baseUrl = `https://pads.com.co/inmuebles-en-arriendo/${cityUrl}`;

    // Agregar barrio si está disponible
    if (neighborhood) {
      const neighborhoodMap: Record<string, string> = {
        'usaquén': 'usaquen',
        'usaquen': 'usaquen',
        'chapinero': 'chapinero',
        'zona rosa': 'chapinero/zona-rosa',
        'chico': 'chapinero/chico',
        'rosales': 'chapinero/rosales',
        'cedritos': 'cedritos',
        'santa barbara': 'santa-barbara',
        'santa bárbara': 'santa-barbara',
        'suba': 'suba',
        'centro': 'centro',
        'la candelaria': 'centro/la-candelaria',
        // Barrios de otras ciudades
        'el poblado': 'el-poblado',
        'poblado': 'el-poblado',
        'laureles': 'laureles',
        'granada': 'granada'
      };

      const mappedNeighborhood = neighborhoodMap[neighborhood.toLowerCase()];
      if (mappedNeighborhood) {
        baseUrl += `/${mappedNeighborhood}`;
      }
    }

    return baseUrl;
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

        // Extract area and rooms info from .flex.text-xs div elements
        const infoElements = $card.find('.flex.text-xs div');
        let rooms = '';
        let area = '';
        let parking = '';

        infoElements.each((i, el) => {
          const text = $(el).text().trim();
          if (text.includes('Alc.')) {
            rooms = text.replace('Alc.', '').trim();
          } else if (text.includes('m2')) {
            area = text.replace('m2', '').trim();
          } else if (text.includes('Parq.')) {
            parking = text.replace('Parq.', '').trim();
          }
        });

        // Extract location from .text-sm
        const locationElement = $card.find('.text-sm');
        const location = locationElement.text().trim();

        // Extract image from .bg-image style attribute
        const imageElement = $card.find('.bg-image');
        let imageUrl = '';
        if (imageElement.length > 0) {
          const style = imageElement.attr('style') || '';
          const urlMatch = style.match(/background-image:url\(([^)]+)\)/);
          if (urlMatch) {
            imageUrl = urlMatch[1];
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
        stratum: 0,
        location: {
          address: data.location,
          neighborhood: data.location.split(',')[0]?.trim() || '',
          city: 'Bogotá',
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
