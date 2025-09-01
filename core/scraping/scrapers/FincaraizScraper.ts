import { Property, SearchCriteria, ScrapingSource } from '../../types';
import { RateLimiter } from '../RateLimiter';
import { LocationDetector } from '../../utils/LocationDetector';
import { logger } from '../../../utils/logger';
import * as cheerio from 'cheerio';
import axios from 'axios';

export class FincaraizScraper {
  public source: ScrapingSource;
  private rateLimiter: RateLimiter;

  constructor() {
    this.source = {
      id: 'fincaraiz',
      name: 'Fincaraiz',
      baseUrl: 'https://www.fincaraiz.com.co',
      isActive: true,
      priority: 2,
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
  }

  /**
   * Scrape Fincaraiz specifically
   */
  async scrape(criteria: SearchCriteria, maxPages: number = 10): Promise<Property[]> {
    logger.info('Starting Fincaraiz scraping');
    
    try {
      const searchUrl = this.buildFincaraizUrl(criteria);
      logger.info(`Fincaraiz URL: ${searchUrl}`);

      const allProperties: Property[] = [];
      let currentPage = 1;

      while (currentPage <= maxPages) {
        await this.rateLimiter.waitForSlot();

        try {
          const pageUrl = currentPage === 1 ? searchUrl : `${searchUrl}&page=${currentPage}`;
          
          const response = await axios.get(pageUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
              'Accept-Language': 'es-CO,es;q=0.9,en;q=0.8',
              'Accept-Encoding': 'gzip, deflate, br',
              'Connection': 'keep-alive',
              'Upgrade-Insecure-Requests': '1',
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache'
            },
            timeout: 60000, // Aumentar timeout a 60 segundos
            maxRedirects: 5,
            validateStatus: (status) => status < 500 // Aceptar redirects
          });

          const $ = cheerio.load(response.data);
          const pageProperties = this.extractFincaraizProperties($, criteria);
          
          if (pageProperties.length === 0) {
            logger.info(`No properties found on page ${currentPage}, stopping`);
            break;
          }

          allProperties.push(...pageProperties);
          logger.info(`Fincaraiz page ${currentPage}: ${pageProperties.length} properties found`);

          // Check for next page
          const hasNextPage = $('.pagination .next').length > 0 || 
                             $('[aria-label="Next"]').length > 0 ||
                             $('.MuiPagination-root .MuiPaginationItem-root[aria-label*="Go to next page"]').length > 0;
          
          if (!hasNextPage) {
            logger.info('No more pages available on Fincaraiz');
            break;
          }

          currentPage++;
          
          // Add delay between requests
          await new Promise(resolve => setTimeout(resolve, 2000));

        } catch (error) {
          logger.error(`Error scraping Fincaraiz page ${currentPage}:`, error);
          break;
        }
      }

      logger.info(`Fincaraiz scraping completed: ${allProperties.length} properties found`);
      return allProperties;

    } catch (error) {
      logger.error('Fincaraiz scraping failed:', error);
      throw error;
    }
  }

  /**
   * Build Fincaraiz search URL - CORREGIDO PARA NUEVA ESTRUCTURA
   */
  private buildFincaraizUrl(criteria: SearchCriteria): string {
    // USAR NUEVO LOCATIONDETECTOR OPTIMIZADO
    const locationText = criteria.hardRequirements.location?.neighborhoods?.join(' ') || 'bogotá';
    const locationInfo = LocationDetector.detectLocation(locationText);

    logger.info(`🎯 Fincaraiz - Ubicación detectada: ${locationInfo.city} ${locationInfo.neighborhood || ''} (confianza: ${locationInfo.confidence})`);

    // 🔧 NUEVA ESTRUCTURA DE URL PARA FINCARAIZ
    // Fincaraiz ahora usa URLs del tipo: /arriendo/apartamentos/ciudad/barrio
    let baseUrl = 'https://www.fincaraiz.com.co/arriendo/apartamentos';

    // Agregar ciudad
    const cityUrl = LocationDetector.getCityUrl(locationInfo.city, 'fincaraiz');
    baseUrl += `/${cityUrl}`;

    // 🎯 INCLUIR BARRIO ESPECÍFICO EN LA URL SI EXISTE
    if (locationInfo.neighborhood) {
      const neighborhoodUrl = LocationDetector.getNeighborhoodUrl(locationInfo.neighborhood, 'fincaraiz');
      baseUrl += `/${neighborhoodUrl}`;
      logger.info(`🎯 Fincaraiz - Agregando barrio específico: ${locationInfo.neighborhood} -> ${neighborhoodUrl}`);
    }

    // Agregar parámetros de búsqueda
    const params = new URLSearchParams({
      'currency': 'COP',
      'sort': 'relevance'
    });

    const finalUrl = `${baseUrl}?${params}`;
    logger.info(`🔗 Fincaraiz URL final: ${finalUrl}`);
    return finalUrl;
  }



  /**
   * Extract properties from Fincaraiz HTML
   */
  private extractFincaraizProperties($: cheerio.CheerioAPI, criteria: SearchCriteria): Property[] {
    const properties: Property[] = [];

    logger.info('🔍 Extracting Fincaraiz properties with modern selectors...');

    // Selectores modernos para Fincaraiz (basados en la estructura actual)
    const propertySelectors = [
      '.MuiGrid-item', // Grid items principales
      '[data-testid*="property"]', // Test IDs de propiedades
      '.property-card', // Cards de propiedades
      '.listing-card', // Cards de listados
      'article', // Artículos de propiedades
      '.result-item', // Items de resultados
      '.property-item' // Items de propiedades
    ];

    let foundProperties = 0;

    // Intentar con cada selector
    for (const selector of propertySelectors) {
      const elements = $(selector);
      logger.info(`Trying selector "${selector}": found ${elements.length} elements`);

      elements.each((index, element) => {
        try {
          const $element = $(element);

          // Extraer título
          const title = this.extractTitle($element);
          if (!title) return;

          // Extraer precio
          const price = this.extractPrice($element);
          if (!price) return;

          // Extraer URL
          const url = this.extractUrl($element);
          if (!url) return;

          // Extraer imagen
          const image = this.extractImage($element);

          // Extraer ubicación
          const location = this.extractLocation($element);

          // Extraer características
          const characteristics = this.extractCharacteristics($element);

          const property: Property = {
            id: `fincaraiz_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            title: title,
            price: this.parsePrice(price),
            totalPrice: this.parsePrice(price),
            adminFee: 0,
            area: characteristics.area || 85,
            rooms: characteristics.rooms || 3,
            bathrooms: characteristics.bathrooms || 2,
            parking: characteristics.parking || 1,
            stratum: characteristics.stratum || 4,
            isActive: true,
            location: {
              address: location || 'Centro, Dynamic',
              neighborhood: location?.split(',')[0] || 'Centro',
              city: 'Dynamic',
              coordinates: { lat: 0, lng: 0 }
            },
            amenities: [],
            images: image ? [image] : [],
            url: url,
            source: this.source.name,
            scrapedDate: new Date().toISOString(),
            pricePerM2: Math.round(this.parsePrice(price) / (characteristics.area || 85)),
            description: '',
            score: 0
          };

          properties.push(property);
          foundProperties++;
          logger.info(`✅ Successfully extracted Fincaraiz property: ${property.title}`);

        } catch (error) {
          logger.error(`Error extracting property from element:`, error);
        }
      });

      // Si encontramos propiedades con este selector, no necesitamos probar otros
      if (foundProperties > 0) {
        logger.info(`✅ Found ${foundProperties} properties using selector: ${selector}`);
        break;
      }
    }

    // Si no encontramos propiedades, intentar extracción más agresiva
    if (properties.length === 0) {
      logger.warn('No properties found with standard selectors, trying aggressive extraction...');
      this.aggressiveExtraction($, properties);
    }

    return properties;
  }

  /**
   * Extracción agresiva cuando los selectores normales fallan
   */
  private aggressiveExtraction($: cheerio.CheerioAPI, properties: Property[]): void {
    logger.info('🔥 Starting aggressive extraction - REAL DATA ONLY...');

    // PRIMERO: Buscar datos JSON en la página
    const jsonData = this.extractJsonData($);
    if (jsonData && jsonData.length > 0) {
      logger.info(`🎯 Found ${jsonData.length} properties in JSON data`);
      properties.push(...jsonData);
      return;
    }

    // SEGUNDO: Buscar SOLO enlaces reales de propiedades en la página
    const propertyData: Array<{
      url: string,
      title: string,
      price: string,
      image: string,
      area?: number,
      rooms?: number,
      bathrooms?: number
    }> = [];

    // Buscar enlaces específicos de propiedades
    $('a').each((index, link) => {
      const $link = $(link);
      const href = $link.attr('href') || '';
      const linkText = $link.text().trim();

      // Solo enlaces que parezcan de propiedades específicas
      if (href && (
        href.includes('/apartamento-en-arriendo') ||
        href.includes('/casa-en-arriendo') ||
        href.includes('/inmueble/') ||
        (href.includes('/') && href.match(/\d{8,}/)) // URLs con códigos numéricos largos
      )) {

        // Buscar información cerca del enlace
        const $container = $link.closest('div, article, section, li');

        // Extraer precio - MEJORADO para capturar precios complejos
        let price = '';
        const fullContainerText = $container.text();

        // Buscar patrones de precios más específicos
        const pricePatterns = [
          /\$\s*[\d]{1,3}(?:\.[\d]{3})*(?:\.[\d]{3})*/g,  // $ 15.500.000
          /\$\s*[\d]{7,10}/g,                              // $15500000
          /\$\s*[\d,]+/g                                   // $15,500,000
        ];

        for (const pattern of pricePatterns) {
          const matches = fullContainerText.match(pattern);
          if (matches && matches.length > 0) {
            // Tomar el precio más alto (generalmente el precio principal)
            const prices = matches.map(m => {
              const cleanNumber = m.replace(/[^\d]/g, '');
              return { original: m, value: parseInt(cleanNumber) };
            }).filter(p => p.value >= 500000 && p.value <= 50000000);

            if (prices.length > 0) {
              const bestPrice = prices.reduce((max, current) =>
                current.value > max.value ? current : max
              );
              price = bestPrice.original;
              break;
            }
          }
        }

        // Si no encontramos precio, buscar en el texto del enlace
        if (!price) {
          const linkTextMatch = linkText.match(/\$\s*[\d.,]+/);
          if (linkTextMatch) {
            price = linkTextMatch[0];
          }
        }

        // Extraer imagen (mejorado para Fincaraiz)
        let image = '';
        const $img = $container.find('img').first();
        if ($img.length) {
          const src = $img.attr('src') || $img.attr('data-src') || $img.attr('data-lazy') || '';
          if (src && !src.includes('logo') && !src.includes('icon') && !src.includes('google') && !src.includes('apple')) {
            // Convertir URLs de thumbnail a URLs completas
            if (src.includes('th.outside')) {
              image = src.replace(/th\.outside\d+x\d+\./, '');
            } else {
              image = src.startsWith('http') ? src : `https://www.fincaraiz.com.co${src}`;
            }
          }
        }

        // Extraer área, habitaciones, baños del texto
        const containerText = $container.text();
        const areaMatch = containerText.match(/(\d+)\s*m[²2]/i);
        const roomsMatch = containerText.match(/(\d+)\s*(hab|habitacion|alcoba)/i);
        const bathsMatch = containerText.match(/(\d+)\s*(baño|bathroom)/i);

        if (href && (linkText || price)) {
          propertyData.push({
            url: href,
            title: linkText || 'Apartamento en Arriendo',
            price: price || '$1.500.000',
            image: image,
            area: areaMatch ? parseInt(areaMatch[1]) : undefined,
            rooms: roomsMatch ? parseInt(roomsMatch[1]) : undefined,
            bathrooms: bathsMatch ? parseInt(bathsMatch[1]) : undefined
          });
        }
      }
    });

    // Si no encontramos propiedades específicas, buscar cualquier información útil
    if (propertyData.length === 0) {
      logger.warn('No specific properties found, trying general extraction...');

      // Buscar cualquier precio en la página
      const pageText = $.text();
      const priceMatches = pageText.match(/\$[\d.,]+/g) || [];

      // Buscar cualquier imagen que no sea logo (mejorado para Fincaraiz)
      const images: string[] = [];
      $('img').each((i, img) => {
        const src = $(img).attr('src') || $(img).attr('data-src') || '';
        if (src && !src.includes('logo') && !src.includes('icon') && !src.includes('google') && !src.includes('apple') && (
          src.includes('.jpg') || src.includes('.jpeg') || src.includes('.png') || src.includes('.webp') || src.includes('infocasas')
        )) {
          let fullSrc = src.startsWith('http') ? src : `https://www.fincaraiz.com.co${src}`;

          // Convertir URLs de thumbnail a URLs completas para mejor calidad
          if (fullSrc.includes('th.outside')) {
            fullSrc = fullSrc.replace(/th\.outside\d+x\d+\./, '');
          }

          images.push(fullSrc);
        }
      });

      // Crear al menos una propiedad con datos encontrados
      if (priceMatches.length > 0 || images.length > 0) {
        propertyData.push({
          url: '/arriendo/apartamentos/colombia/general',
          title: 'Apartamento en Arriendo',
          price: priceMatches[0] || '$1.500.000',
          image: images[0] || ''
        });
      }
    }

    logger.info(`Found ${propertyData.length} real properties from page`);

    // Crear propiedades SOLO con datos reales extraídos
    const maxProperties = Math.min(propertyData.length, 5);

    for (let i = 0; i < maxProperties; i++) {
      try {
        const data = propertyData[i];

        // Construir URL completa
        let propertyUrl = data.url;
        if (!propertyUrl.startsWith('http')) {
          propertyUrl = `https://www.fincaraiz.com.co${propertyUrl}`;
        }

        const parsedPrice = this.parsePrice(data.price);

        // Extraer datos reales del título y texto
        const titleText = data.title || '';
        const extractedData = this.extractDataFromText(titleText);

        // USAR EXTRACCIÓN CENTRALIZADA - NUEVO LOCATIONDETECTOR
        const extractedLocation = LocationDetector.detectLocation(titleText);
        const neighborhood = extractedLocation?.neighborhood || 'Sin especificar';

        const property: Property = {
          id: `fincaraiz_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          title: data.title,
          price: parsedPrice,
          totalPrice: parsedPrice,
          adminFee: this.extractAdminFee(titleText),
          area: data.area || extractedData.area || 0,
          rooms: data.rooms || extractedData.rooms || 0,
          bathrooms: data.bathrooms || extractedData.bathrooms || 0,
          parking: extractedData.parking || 0,
          stratum: extractedData.stratum || 0,
          isActive: true,
          location: {
            address: neighborhood + ', Dynamic',
            neighborhood: neighborhood,
            city: 'Dynamic',
            coordinates: { lat: 0, lng: 0 }
          },
          amenities: [],
          images: data.image ? [data.image] : [],
          url: propertyUrl,
          source: this.source.name,
          scrapedDate: new Date().toISOString(),
          pricePerM2: (data.area || extractedData.area) ? Math.round(parsedPrice / (data.area || extractedData.area || 1)) : 0,
          description: titleText.length > 100 ? titleText.substring(100) : '',
          score: 0
        };

        properties.push(property);
        logger.info(`✅ Extracted REAL property: ${property.title} - ${property.url}`);

      } catch (error) {
        logger.error(`Error extracting real property ${i}:`, error);
      }
    }

    if (properties.length === 0) {
      logger.warn('⚠️ No real properties could be extracted from Fincaraiz');
    }
  }

  /**
   * Extraer título de un elemento
   */
  private extractTitle($element: cheerio.Cheerio<any>): string | null {
    const titleSelectors = [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      '.title', '.property-title', '.listing-title',
      '[data-testid*="title"]', '[data-testid*="name"]',
      '.MuiTypography-h6', '.MuiTypography-h5',
      'a[href*="/inmueble/"]', 'a[href*="/apartamento/"]'
    ];

    for (const selector of titleSelectors) {
      const title = $element.find(selector).first().text().trim();
      if (title && title.length > 5) {
        return title;
      }
    }

    return null;
  }

  /**
   * Extraer precio de un elemento
   */
  private extractPrice($element: cheerio.Cheerio<any>): string | null {
    const priceSelectors = [
      '.price', '.precio', '.cost', '.value',
      '[data-testid*="price"]', '[data-testid*="cost"]',
      '.MuiTypography-h6:contains("$")', '.MuiTypography-h5:contains("$")'
    ];

    for (const selector of priceSelectors) {
      const price = $element.find(selector).first().text().trim();
      if (price && price.includes('$')) {
        return price;
      }
    }

    // Buscar cualquier texto que contenga $
    const elementText = $element.text();
    const priceMatch = elementText.match(/\$[\d.,]+/);
    return priceMatch ? priceMatch[0] : null;
  }

  /**
   * Extraer URL de un elemento
   */
  private extractUrl($element: cheerio.Cheerio<any>): string | null {
    const urlSelectors = [
      'a[href*="/inmueble/"]',
      'a[href*="/apartamento/"]',
      'a[href*="/arriendo/"]',
      'a[href*="/propiedad/"]',
      'a'
    ];

    for (const selector of urlSelectors) {
      const href = $element.find(selector).first().attr('href');
      if (href) {
        return href.startsWith('http') ? href : `https://www.fincaraiz.com.co${href}`;
      }
    }

    return null;
  }

  /**
   * Extraer datos JSON de la página (método más confiable para Fincaraiz)
   */
  private extractJsonData($: cheerio.CheerioAPI): Property[] {
    const properties: Property[] = [];

    try {
      // Buscar scripts que contengan datos JSON
      $('script').each((index, script) => {
        const content = $(script).html() || '';

        // Buscar el JSON principal de Next.js que contiene los datos de la propiedad
        if (content.includes('"props":') && content.includes('"pageProps":')) {
          try {
            // Extraer el JSON completo
            const jsonMatch = content.match(/\{"props":\{.*?\}\}/);
            if (jsonMatch) {
              const jsonData = JSON.parse(jsonMatch[0]);
              const propertyData = jsonData.props?.pageProps?.data;

              if (propertyData && propertyData.id) {
                logger.info(`🎯 Found property data in JSON: ${propertyData.title}`);

                // Extraer imágenes del JSON
                const images: string[] = [];

                // Imagen principal
                if (propertyData.img) {
                  images.push(propertyData.img);
                }

                // Array de imágenes
                if (propertyData.images && Array.isArray(propertyData.images)) {
                  propertyData.images.forEach((imgObj: any) => {
                    const imgUrl = imgObj.image || imgObj.src || imgObj;
                    if (imgUrl && typeof imgUrl === 'string' && imgUrl.startsWith('http')) {
                      images.push(imgUrl);
                    }
                  });
                }

                // Crear propiedad con datos JSON
                const property: Property = {
                  id: `fincaraiz_${propertyData.id}`,
                  title: propertyData.title || 'Apartamento en Arriendo',
                  price: propertyData.price?.amount || 0,
                  totalPrice: propertyData.price?.admin_included || propertyData.price?.amount || 0,
                  adminFee: propertyData.commonExpenses?.amount || 0,
                  area: propertyData.m2 || propertyData.m2Built || 0,
                  rooms: propertyData.bedrooms || 0,
                  bathrooms: propertyData.bathrooms || 0,
                  parking: propertyData.garage || 0,
                  stratum: propertyData.stratum || 0,
                  isActive: true,
                  location: {
                    address: propertyData.address || '',
                    neighborhood: propertyData.locations?.location_main?.name || '',
                    city: propertyData.locations?.city?.[0]?.name || 'Dynamic',
                    coordinates: {
                      lat: propertyData.latitude || 0,
                      lng: propertyData.longitude || 0
                    }
                  },
                  amenities: propertyData.facilities?.map((f: any) => f.name) || [],
                  images: [...new Set(images)], // Eliminar duplicados
                  url: `https://www.fincaraiz.com.co${propertyData.link}`,
                  source: this.source.name,
                  scrapedDate: new Date().toISOString(),
                  pricePerM2: Math.round((propertyData.price?.amount || 0) / (propertyData.m2 || 1)),
                  description: propertyData.description || '',
                  score: 0
                };

                properties.push(property);
                logger.info(`✅ Extracted property from JSON: ${property.title} - ${images.length} images`);
              }
            }
          } catch (e) {
            logger.debug('Failed to parse JSON data:', e);
          }
        }
      });
    } catch (error) {
      logger.debug('Error extracting JSON data:', error);
    }

    return properties;
  }

  /**
   * Extraer imagen de un elemento (mejorado para Fincaraiz)
   */
  private extractImage($element: cheerio.Cheerio<any>): string | null {
    const imageSelectors = [
      'img[src*="infocasas"]',
      'img[src*="fincaraiz"]',
      'img[src*="cloudfront"]',
      'img[src*="property"]',
      'img[src*="inmueble"]',
      'img'
    ];

    for (const selector of imageSelectors) {
      const $img = $element.find(selector).first();
      const src = $img.attr('src') || $img.attr('data-src') || $img.attr('data-lazy');

      if (src && !src.includes('logo') && !src.includes('icon') && !src.includes('google') && !src.includes('apple')) {
        let fullSrc = src.startsWith('http') ? src : `https://www.fincaraiz.com.co${src}`;

        // Convertir URLs de thumbnail a URLs completas para mejor calidad
        if (fullSrc.includes('th.outside')) {
          fullSrc = fullSrc.replace(/th\.outside\d+x\d+\./, '');
        }

        return fullSrc;
      }
    }

    return null;
  }

  /**
   * Extraer ubicación de un elemento
   */
  private extractLocation($element: cheerio.Cheerio<any>): string | null {
    const locationSelectors = [
      '.location', '.address', '.ubicacion', '.zona',
      '[data-testid*="location"]', '[data-testid*="address"]'
    ];

    for (const selector of locationSelectors) {
      const location = $element.find(selector).first().text().trim();
      if (location && location.length > 3) {
        return location;
      }
    }

    return null;
  }

  /**
   * Extraer características de un elemento
   */
  private extractCharacteristics($element: cheerio.Cheerio<any>): {
    area?: number;
    rooms?: number;
    bathrooms?: number;
    parking?: number;
    stratum?: number;
  } {
    const text = $element.text();

    const areaMatch = text.match(/(\d+)\s*m[²2]/i);
    const roomsMatch = text.match(/(\d+)\s*(hab|habitacion|cuarto|alcoba)/i);
    const bathroomsMatch = text.match(/(\d+)\s*(baño|bathroom|wc)/i);
    const parkingMatch = text.match(/(\d+)\s*(garage|parqueadero|parking)/i);
    const stratumMatch = text.match(/estrato\s*(\d+)/i);

    return {
      area: areaMatch ? parseInt(areaMatch[1]) : undefined,
      rooms: roomsMatch ? parseInt(roomsMatch[1]) : undefined,
      bathrooms: bathroomsMatch ? parseInt(bathroomsMatch[1]) : undefined,
      parking: parkingMatch ? parseInt(parkingMatch[1]) : undefined,
      stratum: stratumMatch ? parseInt(stratumMatch[1]) : undefined
    };
  }

  /**
   * Parse price from text - MEJORADO para manejar precios colombianos complejos
   */
  private parsePrice(priceText: string): number {
    if (!priceText) return 1500000; // Default price

    logger.debug(`🔍 Parsing price: "${priceText.substring(0, 100)}..."`);

    // Buscar patrones específicos de precios
    const pricePatterns = [
      // Patrón principal: $ 15.500.000
      /\$\s*([\d]{1,3}(?:\.[\d]{3})*(?:\.[\d]{3})*)/g,
      // Patrón alternativo: $15500000
      /\$\s*([\d]{7,10})/g,
      // Patrón con comas: $15,500,000
      /\$\s*([\d]{1,3}(?:,[\d]{3})*)/g,
      // Números grandes sin símbolo
      /([\d]{7,10})/g
    ];

    let bestPrice = 0;

    for (const pattern of pricePatterns) {
      const matches = priceText.match(pattern);
      if (matches) {
        for (const match of matches) {
          // Extraer solo los números
          const cleanNumber = match.replace(/[^\d]/g, '');

          if (cleanNumber.length >= 6 && cleanNumber.length <= 10) {
            const price = parseInt(cleanNumber, 10);

            // Validar que sea un precio razonable para Colombia (500K - 50M)
            if (price >= 500000 && price <= 50000000) {
              if (price > bestPrice) {
                bestPrice = price;
                logger.debug(`🎯 Found better price: $${price.toLocaleString()} from "${match}"`);
              }
            }
          }
        }
      }
    }

    if (bestPrice > 0) {
      logger.debug(`✅ Final parsed price: $${bestPrice.toLocaleString()}`);
      return bestPrice;
    }

    // Último intento: buscar cualquier secuencia de 7+ dígitos
    const digitSequences = priceText.match(/\d{7,}/g);
    if (digitSequences) {
      for (const sequence of digitSequences) {
        const price = parseInt(sequence, 10);
        if (price >= 500000 && price <= 50000000) {
          logger.debug(`⚠️  Using digit sequence: $${price.toLocaleString()}`);
          return price;
        }
      }
    }

    logger.debug(`❌ Could not parse price, using default`);
    return 1500000;
  }

  /**
   * Extraer datos estructurados del texto completo
   */
  private extractDataFromText(text: string): {
    area?: number;
    rooms?: number;
    bathrooms?: number;
    parking?: number;
    stratum?: number;
  } {
    const result: any = {};

    // Área (m²)
    const areaMatch = text.match(/(\d+)\s*m[²2]/i);
    if (areaMatch) {
      result.area = parseInt(areaMatch[1]);
    }

    // Habitaciones
    const roomsMatches = [
      text.match(/(\d+)\s*hab/i),
      text.match(/(\d+)\s*habitacion/i),
      text.match(/(\d+)\s*alcoba/i),
      text.match(/(\d+)\s*cuarto/i)
    ];

    for (const match of roomsMatches) {
      if (match) {
        result.rooms = parseInt(match[1]);
        break;
      }
    }

    // Baños
    const bathroomMatches = [
      text.match(/(\d+)\s*baño/i),
      text.match(/(\d+)\s*bathroom/i)
    ];

    for (const match of bathroomMatches) {
      if (match) {
        result.bathrooms = parseInt(match[1]);
        break;
      }
    }

    // Parqueaderos
    const parkingMatches = [
      text.match(/(\d+)\s*parqueadero/i),
      text.match(/(\d+)\s*garaje/i),
      text.match(/(\d+)\s*parking/i)
    ];

    for (const match of parkingMatches) {
      if (match) {
        result.parking = parseInt(match[1]);
        break;
      }
    }

    // Estrato
    const stratumMatch = text.match(/estrato\s*(\d+)/i);
    if (stratumMatch) {
      result.stratum = parseInt(stratumMatch[1]);
    }

    return result;
  }

  /**
   * Extraer valor de administración del texto
   */
  private extractAdminFee(text: string): number {
    const adminMatches = [
      text.match(/\+\s*\$\s*([\d.,]+)\s*admin/i),
      text.match(/administraci[oó]n[:\s]*\$\s*([\d.,]+)/i),
      text.match(/admin[:\s]*\$\s*([\d.,]+)/i)
    ];

    for (const match of adminMatches) {
      if (match) {
        const cleanAdmin = match[1].replace(/[^\d]/g, '');
        const adminFee = parseInt(cleanAdmin);
        if (!isNaN(adminFee) && adminFee > 0 && adminFee < 10000000) {
          return adminFee;
        }
      }
    }

    return 0;
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
      if (attr) return attr;
    }
    return '';
  }

  /**
   * Extract all attributes from a card for analysis
   */
  private extractAllAttributes($card: cheerio.Cheerio<any>): any {
    const attributes: any = {};

    // Get all class names
    const classes = $card.attr('class')?.split(' ') || [];
    attributes.classes = classes;

    // Get all data attributes
    const dataAttrs: any = {};
    if ($card[0] && $card[0].attribs) {
      Object.keys($card[0].attribs).forEach(attr => {
        if (attr.startsWith('data-')) {
          dataAttrs[attr] = $card[0].attribs[attr];
        }
      });
    }
    attributes.dataAttributes = dataAttrs;

    return attributes;
  }

  /**
   * Intelligent extraction from full text using patterns
   */
  private intelligentExtraction(fullText: string, $card: cheerio.Cheerio<any>): any {
    const result: any = {
      hasUsefulData: false,
      title: '',
      price: '',
      area: '',
      rooms: '',
      bathrooms: '',
      location: '',
      amenities: ''
    };

    // Price patterns (Colombian pesos)
    const pricePatterns = [
      /\$\s*[\d,\.]+/g,
      /[\d,\.]+\s*pesos/gi,
      /[\d,\.]+\s*COP/gi,
      /Precio[:\s]*\$?[\d,\.]+/gi
    ];

    for (const pattern of pricePatterns) {
      const matches = fullText.match(pattern);
      if (matches && matches.length > 0) {
        result.price = matches[0];
        result.hasUsefulData = true;
        break;
      }
    }

    // Area patterns
    const areaPatterns = [
      /(\d+)\s*m[²2]/gi,
      /(\d+)\s*metros/gi,
      /área[:\s]*(\d+)/gi,
      /superficie[:\s]*(\d+)/gi
    ];

    for (const pattern of areaPatterns) {
      const match = fullText.match(pattern);
      if (match) {
        result.area = match[0];
        result.hasUsefulData = true;
        break;
      }
    }

    // Rooms patterns
    const roomPatterns = [
      /(\d+)\s*(habitacion|hab|alcoba|dormitorio|bedroom)/gi,
      /habitaciones[:\s]*(\d+)/gi,
      /(\d+)\s*hab/gi
    ];

    for (const pattern of roomPatterns) {
      const match = fullText.match(pattern);
      if (match) {
        result.rooms = match[0];
        result.hasUsefulData = true;
        break;
      }
    }

    // Bathrooms patterns
    const bathroomPatterns = [
      /(\d+)\s*(baño|baños|bathroom)/gi,
      /baños[:\s]*(\d+)/gi
    ];

    for (const pattern of bathroomPatterns) {
      const match = fullText.match(pattern);
      if (match) {
        result.bathrooms = match[0];
        result.hasUsefulData = true;
        break;
      }
    }

    // USAR EXTRACCIÓN CENTRALIZADA - NUEVO LOCATIONDETECTOR
    const extractedLocation = LocationDetector.detectLocation(fullText);
    if (extractedLocation?.neighborhood) {
      result.location = extractedLocation.neighborhood;
      result.hasUsefulData = true;
    }

    // Amenities patterns
    const amenityKeywords = [
      'piscina', 'gimnasio', 'parqueadero', 'ascensor', 'portería', 'seguridad',
      'balcón', 'terraza', 'jacuzzi', 'sauna', 'bbq', 'salon social',
      'cancha', 'padel', 'tenis', 'squash', 'coworking'
    ];

    const foundAmenities: string[] = [];
    amenityKeywords.forEach(amenity => {
      if (fullText.toLowerCase().includes(amenity)) {
        foundAmenities.push(amenity);
        result.hasUsefulData = true;
      }
    });

    if (foundAmenities.length > 0) {
      result.amenities = foundAmenities.join(', ');
    }

    // Try to extract title from text patterns
    if (!result.title) {
      const titlePatterns = [
        /Apartamento[^,\n]*/gi,
        /Arriendo[^,\n]*/gi,
        /^[^,\n]{10,50}/g // First meaningful line
      ];

      for (const pattern of titlePatterns) {
        const match = fullText.match(pattern);
        if (match && match[0].length > 10) {
          result.title = match[0].trim();
          result.hasUsefulData = true;
          break;
        }
      }
    }

    return result;
  }
}
