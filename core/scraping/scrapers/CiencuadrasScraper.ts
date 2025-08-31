import { Property, SearchCriteria, ScrapingSource } from '../../types';
import { PropertyParser } from '../PropertyParser';
import { RateLimiter } from '../RateLimiter';
import { LocationDetector } from '../../utils/LocationDetector';
import { logger } from '../../../utils/logger';
import * as cheerio from 'cheerio';
import axios from 'axios';
import puppeteer from 'puppeteer';

export class CiencuadrasScraper {
  public source: ScrapingSource;
  private rateLimiter: RateLimiter;
  private parser: PropertyParser;

  constructor() {
    this.source = {
      id: 'ciencuadras',
      name: 'Ciencuadras',
      baseUrl: 'https://www.ciencuadras.com',
      isActive: true,
      priority: 1,
      rateLimit: {
        requestsPerMinute: 30,
        delayBetweenRequests: 2000,
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
    this.parser = new PropertyParser(this.source);
  }

  /**
   * Scrape Ciencuadras specifically
   */
  async scrape(criteria: SearchCriteria, maxPages: number = 5): Promise<Property[]> {
    logger.info('Starting Ciencuadras scraping');

    try {
      const searchUrl = this.buildCiencuadrasUrl(criteria);
      logger.info(`Ciencuadras URL: ${searchUrl}`);

      const allProperties: Property[] = [];
      let currentPage = 1;

      while (currentPage <= maxPages) {
        await this.rateLimiter.waitForSlot();

        try {
          const pageUrl = currentPage === 1 ? searchUrl : `${searchUrl}?page=${currentPage}`;
          
          const response = await axios.get(pageUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
              'Accept-Language': 'es-CO,es;q=0.9,en;q=0.8',
              'Referer': 'https://www.ciencuadras.com/',
              'Connection': 'keep-alive'
            },
            timeout: 30000
          });

          const $ = cheerio.load(response.data);
          let pageProperties = this.extractCiencuadrasProperties($, criteria);

          // Fallback headless si no hay props en primera página
          if (pageProperties.length === 0 && currentPage === 1) {
            logger.warn('No properties from static HTML. Trying headless mode for Ciencuadras...');
            try {
              const headlessProps = await this.scrapeCiencuadrasHeadless(pageUrl, criteria);
              if (headlessProps.length > 0) {
                pageProperties = headlessProps;
              }
            } catch (e) {
              logger.warn('Headless fallback for Ciencuadras failed:', e);
            }
          }

          if (pageProperties.length === 0) {
            logger.info(`No properties found on Ciencuadras page ${currentPage}, stopping`);
            break;
          }

          allProperties.push(...pageProperties);
          logger.info(`Ciencuadras page ${currentPage}: ${pageProperties.length} properties found`);

          // Check for next page
          const hasNextPage = $('.pagination .next').length > 0 || 
                             $('.pager .siguiente').length > 0 ||
                             $('[aria-label="Siguiente"]').length > 0;
          
          if (!hasNextPage) {
            logger.info('No more pages available on Ciencuadras');
            break;
          }

          currentPage++;
          
          // Add delay between requests
          await new Promise(resolve => setTimeout(resolve, 3000));

        } catch (error) {
          logger.error(`Error scraping Ciencuadras page ${currentPage}:`, error);
          break;
        }
      }

      logger.info(`Ciencuadras scraping completed: ${allProperties.length} properties found`);
      return allProperties;

    } catch (error) {
      logger.error('Ciencuadras scraping failed:', error);
      throw error;
    }
  }

  /**
   * Build Ciencuadras search URL - UNIFICADO
   */
  private buildCiencuadrasUrl(criteria: SearchCriteria): string {
    // USAR NUEVO LOCATIONDETECTOR OPTIMIZADO
    const locationText = criteria.hardRequirements.location?.neighborhoods?.join(' ') || 'bogotá';
    const locationInfo = LocationDetector.detectLocation(locationText);

    // Ciencuadras usa formato específico: /ciudad/apartamento/arriendo
    const cityUrl = LocationDetector.getCityUrl(locationInfo.city, 'standard');
    const url = `https://www.ciencuadras.com/${cityUrl}/apartamento/arriendo`;

    logger.info(`🎯 Ciencuadras - Ubicación detectada: ${locationInfo.city} ${locationInfo.neighborhood || ''} (confianza: ${locationInfo.confidence})`);

    return url;
  }

  /**
   * Extract properties from Ciencuadras HTML - IMPROVED with JSON extraction
   */
  private extractCiencuadrasProperties($: cheerio.CheerioAPI, criteria: SearchCriteria): Property[] {
    const properties: Property[] = [];

    // IMPROVED: First try to extract from JSON data embedded in the page
    const jsonProperties = this.extractFromCiencuadrasJSON($);
    if (jsonProperties.length > 0) {
      logger.info(`Found ${jsonProperties.length} properties from Ciencuadras JSON data`);
      return jsonProperties;
    }

    // Fallback to HTML extraction if JSON fails
    let propertyCards = $('article');
    if (propertyCards.length === 0) {
      propertyCards = $('.card, [class*="card"], li');
    }
    logger.info(`Found ${propertyCards.length} properties using HTML selector: article`);

    if (propertyCards.length === 0) {
      logger.warn('No property cards found with any selector on Ciencuadras');
      return properties;
    }

    propertyCards.each((index, card) => {
      try {
        const $card = $(card);
        
        // Extract basic information using text analysis (Ciencuadras has data in text)
        const fullText = $card.text().trim();

        // IMPROVED: Extract title - look for "Apartamento en arriendo"
        let title = '';
        const titleMatch = fullText.match(/(Apartamento en arriendo[^$]*)/i);
        if (titleMatch) {
          title = titleMatch[1].trim();
        } else {
          // Fallback to first meaningful line
          const lines = fullText.split('\n').map(l => l.trim()).filter(l => l.length > 10);
          title = lines[0] || '';
        }

        // IMPROVED: Extract price using better regex - matches Ciencuadras format
        let priceText = '';
        const priceMatch = fullText.match(/\$\s*([\d,]+(?:\.\d{3})*)/);
        if (priceMatch) {
          priceText = priceMatch[0];
        }

        // Also try to extract the numeric price for better parsing
        let priceNumber = 0;
        const priceNumMatch = fullText.match(/\$\s*([\d,]+)/);
        if (priceNumMatch) {
          priceNumber = parseInt(priceNumMatch[1].replace(/,/g, ''));
        }

        // IMPROVED: Extract area using better regex - matches Ciencuadras format
        let areaText = '';
        let areaNumber = 0;
        const areaMatch = fullText.match(/(\d+(?:\.\d+)?)\s*m[²2]/i);
        if (areaMatch) {
          areaText = areaMatch[0];
          areaNumber = parseFloat(areaMatch[1]);
        }

        // IMPROVED: Extract rooms using better regex - matches Ciencuadras format
        let roomsText = '';
        let roomsNumber = 0;

        // Try multiple patterns for rooms - improved for Ciencuadras format
        const roomPatterns = [
          /habit\.\s*(\d+)/i,           // "Habit. 3"
          /habitacion[es]*\s*(\d+)/i,   // "Habitaciones 3"
          /(\d+)\s*habitacion/i,        // "3 habitaciones"
          /(\d+)\s*hab\./i,             // "3 hab."
          /(\d+)\s*hab/i,               // "3 hab"
          /(\d+)\s*cuarto/i             // "3 cuartos"
        ];

        for (const pattern of roomPatterns) {
          const match = fullText.match(pattern);
          if (match) {
            roomsText = match[1];
            roomsNumber = parseInt(match[1]);
            break;
          }
        }

        // IMPROVED: Extract bathrooms using better regex - matches Ciencuadras format
        let bathroomsText = '';
        let bathroomsNumber = 0;

        const bathPatterns = [
          /baños\s*(\d+)/i,             // "Baños 2"
          /(\d+)\s*baño[s]*/i,          // "2 baños" or "2 baño"
          /baño[s]*\s*(\d+)/i           // "baños 2"
        ];

        for (const pattern of bathPatterns) {
          const match = fullText.match(pattern);
          if (match) {
            bathroomsText = match[1];
            bathroomsNumber = parseInt(match[1]);
            break;
          }
        }

        // IMPROVED: Extract location using LocationDetector for dynamic city support
        let location = 'Dynamic'; // Will be enhanced by LocationDetector

        // Usar extracción centralizada de ubicación - NUEVO LOCATIONDETECTOR
        const extractedLocation = LocationDetector.detectLocation(fullText);
        if (extractedLocation && extractedLocation.city) {
          const neighborhood = extractedLocation.neighborhood || '';
          const city = extractedLocation.city || 'dynamic';
          location = neighborhood ? `${neighborhood}, ${city}` : city;
        }

        // Ensure location is always a string
        if (typeof location !== 'string' || !location) {
          location = 'Dynamic';
        }

        // IMPROVED: Extract image with better selectors and fallbacks
        let imageUrl = '';

        // Try multiple approaches to get the real image
        const imgElements = $card.find('img');
        imgElements.each((i, img) => {
          const $img = $(img);
          const src = $img.attr('src') || '';
          const dataSrc = $img.attr('data-src') || '';
          const dataSrcset = $img.attr('data-srcset') || '';

          // Skip default/placeholder images
          if (src && !src.includes('default-image') && !src.includes('placeholder') && src.includes('http')) {
            imageUrl = src;
            return false; // Break the loop
          }
          if (dataSrc && !dataSrc.includes('default-image') && !dataSrc.includes('placeholder') && dataSrc.includes('http')) {
            imageUrl = dataSrc;
            return false; // Break the loop
          }
          if (dataSrcset && !dataSrcset.includes('default-image')) {
            const firstSrc = dataSrcset.split(',')[0]?.trim().split(' ')[0];
            if (firstSrc && firstSrc.includes('http')) {
              imageUrl = firstSrc;
              return false; // Break the loop
            }
          }
        });

        // If no real image found, try to extract from style attributes or background images
        if (!imageUrl) {
          $card.find('[style*="background-image"]').each((i, el) => {
            const style = $(el).attr('style') || '';
            const bgMatch = style.match(/background-image:\s*url\(['"]?([^'"]+)['"]?\)/);
            if (bgMatch && bgMatch[1] && !bgMatch[1].includes('default-image')) {
              imageUrl = bgMatch[1];
              return false; // Break the loop
            }
          });
        }

        // IMPROVED: Extract property URL with better selectors and create unique URLs
        let propertyUrl = this.extractAttribute($card, [
          'a[href*="/inmueble/"]',
          'a[href*="apartamento"]',
          'a[href]',
          '.property-link',
          '.enlace-inmueble'
        ], 'href');

        // Ensure URL is absolute
        if (propertyUrl && !propertyUrl.startsWith('http')) {
          propertyUrl = `https://www.ciencuadras.com${propertyUrl}`;
        }

        // Extract real property ID from data-qa-id or other attributes
        let propertyId = '';
        const dataQaId = $card.attr('data-qa-id');
        if (dataQaId && dataQaId.includes('property_')) {
          propertyId = dataQaId.split('property_')[1];
        }

        // If no specific URL found, create a unique one based on property data
        if (!propertyUrl || propertyUrl === 'https://www.ciencuadras.com' || !propertyUrl.includes('/inmueble/')) {
          const priceForUrl = priceNumber || 0;
          const areaForUrl = areaNumber || 0;
          const roomsForUrl = roomsNumber || 0;
          const idForUrl = propertyId || index;
          const uniqueId = `${priceForUrl}-${areaForUrl}-${roomsForUrl}-${idForUrl}`;
          propertyUrl = `https://www.ciencuadras.com/inmueble/${uniqueId}`;
        }

        // Only process if we have essential data (relaxed conditions for Ciencuadras)
        if ((title || priceText) && (priceNumber > 0 || priceText) && (areaNumber > 0 || roomsNumber > 0)) {
          const rawProperty = {
            title: title.trim(),
            price: priceNumber > 0 ? priceNumber : priceText.trim(),
            priceText: priceText.trim(),
            area: areaNumber > 0 ? areaNumber : areaText,
            areaText: areaText || '',
            rooms: roomsNumber > 0 ? roomsNumber : roomsText,
            roomsText: roomsText || '',
            bathrooms: bathroomsNumber > 0 ? bathroomsNumber : bathroomsText,
            bathroomsText: bathroomsText || '',
            location: typeof location === 'string' ? location : 'Dynamic',
            imageUrl: imageUrl || '',
            images: imageUrl ? [imageUrl] : [],
            url: propertyUrl || 'https://www.ciencuadras.com',
            source: 'Ciencuadras',
            description: ''
          };

          const property = this.parser.parseProperty(rawProperty);
          if (property) {
            properties.push(property);
          }
        }

      } catch (error) {
        logger.warn(`Error processing Ciencuadras property ${index}:`, error);
      }
    });

    return properties;
  }

  /**
   * Extract properties from embedded JSON data in Ciencuadras pages
   */
  private extractFromCiencuadrasJSON($: cheerio.CheerioAPI): Property[] {
    const properties: Property[] = [];

    try {
      // Look for JSON data in script tags
      const scripts = $('script').toArray();

      for (const script of scripts) {
        const scriptContent = $(script).html() || '';

        // Look for the specific Ciencuadras data format we found in the analysis
        // Try multiple patterns to catch the JSON data
        const patterns = [
          /\{[^}]*"id":\s*\d+[^}]*"rentPrice":[^}]*\}/g,
          /\{[^}]*"id":\s*\d+[^}]*"leaseFee":[^}]*\}/g,
          /\{[^}]*"propertyCode":[^}]*"leaseFee":[^}]*\}/g
        ];

        for (const pattern of patterns) {
          const matches = scriptContent.match(pattern);
          if (matches) {
            for (const match of matches) {
              try {
                const jsonData = JSON.parse(match);
                const property = this.parseJsonProperty(jsonData);
                if (property) {
                  properties.push(property);
                }
              } catch (parseError) {
                continue;
              }
            }
          }
        }

        // Look for the main data structure that contains all properties
        const mainDataMatch = scriptContent.match(/window\.__NUXT__\s*=\s*({.*?});/s) ||
                              scriptContent.match(/window\.__INITIAL_STATE__\s*=\s*({.*?});/s) ||
                              scriptContent.match(/"searchResults":\s*({.*?"properties":\s*\[.*?\]})/s) ||
                              scriptContent.match(/"results":\s*(\[.*?\])/s);

        if (mainDataMatch) {
          try {
            const jsonData = JSON.parse(mainDataMatch[1]);

            // Navigate through the data structure to find properties
            let propertiesArray = null;

            if (jsonData.searchResults && jsonData.searchResults.properties) {
              propertiesArray = jsonData.searchResults.properties;
            } else if (jsonData.results) {
              propertiesArray = jsonData.results;
            } else if (Array.isArray(jsonData)) {
              propertiesArray = jsonData;
            }

            if (propertiesArray && Array.isArray(propertiesArray)) {
              for (const item of propertiesArray) {
                const property = this.parseJsonProperty(item);
                if (property) {
                  properties.push(property);
                }
              }
            }
          } catch (parseError) {
            logger.warn('Error parsing main data structure:', parseError);
          }
        }

        // Also look for array format
        const arrayMatch = scriptContent.match(/(?:properties|results|data)["']?\s*:\s*(\[.*?\])/s);
        if (arrayMatch && properties.length === 0) {
          try {
            const jsonData = JSON.parse(arrayMatch[1]);

            if (Array.isArray(jsonData)) {
              for (const item of jsonData) {
                const property = this.parseJsonProperty(item);
                if (property) {
                  properties.push(property);
                }
              }
            }
          } catch (parseError) {
            continue;
          }
        }
      }

    } catch (error) {
      logger.warn('Error extracting JSON from Ciencuadras:', error);
    }

    return properties;
  }

  /**
   * Parse a single property from Ciencuadras JSON data
   */
  private parseJsonProperty(data: any): Property | null {
    try {
      if (!data || typeof data !== 'object') return null;

      // Extract data from Ciencuadras JSON structure
      const id = data.id || data.propertyCode || '';
      const title = data.realEstateType && data.typeTransaction && data.neighborhood
        ? `${data.realEstateType} en ${data.typeTransaction} en ${data.neighborhood}`
        : data.title || 'Apartamento en arriendo';

      const price = data.rentPrice || data.leaseFee || data.price || 0;
      const area = data.areaPrivate || data.area || data.privateArea || 0;
      const rooms = data.numRooms || data.rooms || 0;
      const bathrooms = data.numBathrooms || data.baths || data.bathrooms || 0;
      const parking = data.numParking || data.garages || data.parking || 0;

      const location = [data.neighborhood, data.city].filter(Boolean).join(', ');
      const address = data.address || '';

      const imageUrl = data.urlPhoto || data.image || data.imageUrl || '';
      const propertyUrl = data.url ? `https://www.ciencuadras.com${data.url}` : '';

      // Create raw property object
      const rawProperty = {
        title: title.trim(),
        price: price,
        adminFee: data.adminValue || 0,
        totalPrice: price + (data.adminValue || 0),
        area: area,
        rooms: rooms,
        bathrooms: bathrooms,
        parking: parking,
        location: location || 'Dynamic',
        address: address,
        amenities: [],
        images: imageUrl ? [imageUrl] : [],
        url: propertyUrl || 'https://www.ciencuadras.com',
        description: '',
        stratum: data.stratum || 0,
        antiquity: data.antiquity || 0,
        coordinates: data.location ? {
          lat: data.location.lat,
          lng: data.location.lon
        } : null
      };

      const property = this.parser.parseProperty(rawProperty);
      return property;

    } catch (error) {
      logger.warn('Error parsing Ciencuadras JSON property:', error);
      return null;
    }
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
   * Extract attribute using multiple selectors - IMPROVED
   */
  private extractAttribute($card: cheerio.Cheerio<any>, selectors: string[], attribute: string): string {
    for (const selector of selectors) {
      const element = $card.find(selector).first();
      if (element.length > 0) {
        const attr = element.attr(attribute);
        if (attr && attr.trim()) {
          // For images, ensure we have a valid URL
          if (attribute === 'src' && !attr.startsWith('http') && !attr.startsWith('data:')) {
            if (attr.startsWith('//')) {
              return `https:${attr}`;
            } else if (attr.startsWith('/')) {
              return `https://www.ciencuadras.com${attr}`;
            }
          }
          return attr.trim();
        }
      }
    }

    // Fallback for href attribute
    if (attribute === 'href') {
      const href = $card.find('a[href]').first().attr('href') || '';
      if (href) {
        return href.startsWith('http') ? href : href ? `https://www.ciencuadras.com${href}` : '';
      }
    }

    return '';
  }

  private async scrapeCiencuadrasHeadless(pageUrl: string, criteria: SearchCriteria): Promise<Property[]> {
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage'] });
    const page = await browser.newPage();

    try {
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      await page.goto(pageUrl, { waitUntil: 'networkidle2', timeout: 45000 });
      await page.waitForSelector('body', { timeout: 10000 }).catch(() => {});

      const items = await page.evaluate(() => {
        const out: Array<{title:string; priceText:string; url:string; imageUrl:string; text:string;}> = [];
        const doc: any = (globalThis as any).document;
        const cards = doc ? Array.from(doc.querySelectorAll('article, .card, [class*="card"], li')) : [];
        cards.forEach((el:any) => {
          const titleEl = el.querySelector('h2,h3,.title,[class*="title"]');
          const priceEl = el.querySelector('[class*="price"], .price, .valor');
          const linkEl = el.querySelector('a[href]');
          const imgEl = el.querySelector('img');
          const title = titleEl?.textContent?.trim() || '';
          const priceText = priceEl?.textContent?.trim() || '';
          const url = linkEl?.getAttribute('href') || '';
          const imageUrl = imgEl?.getAttribute('src') || '';
          const text = el.textContent || '';
          if ((title || priceText) && url) out.push({ title, priceText, url, imageUrl, text });
        });
        return out;
      });

      const props: Property[] = [];
      items.forEach((it, idx) => {
        // Construir raw y delegar parseo al PropertyParser
        const raw = {
          title: it.title || 'Apartamento en arriendo',
          price: it.priceText || (it.text.match(/\$\s*[\d\.,]+/)||[''])[0] || '',
          adminFee: 0,
          totalPrice: undefined,
          area: '',
          rooms: '',
          bathrooms: '',
          location: 'Dynamic',
          amenities: [],
          images: it.imageUrl ? [it.imageUrl] : [],
          url: it.url.startsWith('http') ? it.url : `https://www.ciencuadras.com${it.url}`,
          description: ''
        };
        const parsed = this.parser.parseProperty(raw);
        if (parsed) props.push(parsed);
      });

      return props;
    } finally {
      await page.close();
      await browser.close();
    }
  }

}
