import axios from 'axios';
import * as cheerio from 'cheerio';
import puppeteer, { Browser, Page } from 'puppeteer';
import { WebSearchCriteria, StandardProperty, ProviderSchema } from '../schemas/base-provider-schema';
import { InputMapper, ProviderSearchConfig } from '../mappers/input-mapper';
import { OutputMapper, RawPropertyData } from '../mappers/output-mapper';
import { logger } from '../../utils/logger';

/**
 * Universal Scraper using new modular architecture
 * Works with any provider schema
 */
export class UniversalScraper {
  private schema: ProviderSchema;
  private config: ProviderSearchConfig;
  private browser: Browser | null = null;

  constructor(providerId: string, criteria: WebSearchCriteria) {
    this.schema = InputMapper.getProviderSchema(providerId);
    this.config = InputMapper.mapCriteriaToProvider(criteria, this.schema);
  }

  /**
   * Main scraping method
   */
  async scrape(maxPages?: number): Promise<StandardProperty[]> {
    const startTime = Date.now();
    logger.info(`🚀 Starting ${this.schema.name} scraping`);
    logger.info(`📍 URL: ${this.config.searchUrl}`);

    try {
      const rawProperties = this.schema.extraction.method === 'puppeteer'
        ? await this.scrapeWithPuppeteer(maxPages)
        : await this.scrapeWithAxios(maxPages);

      logger.info(`📊 Raw properties extracted: ${rawProperties.length}`);

      // Convert to standard format
      const standardProperties = OutputMapper.mapMultipleProperties(rawProperties, this.schema.id);
      
      const duration = Date.now() - startTime;
      logger.info(`✅ ${this.schema.name} completed: ${standardProperties.length} properties in ${duration}ms`);

      return standardProperties;

    } catch (error) {
      logger.error(`❌ ${this.schema.name} scraping failed:`, error);
      return [];
    } finally {
      await this.cleanup();
    }
  }

  /**
   * Scrape using Axios (for simple sites)
   */
  private async scrapeWithAxios(maxPages?: number): Promise<RawPropertyData[]> {
    const allProperties: RawPropertyData[] = [];
    const pagesToScrape = Math.min(maxPages || this.config.performance.maxPages, this.config.performance.maxPages);
    let currentPage = 1;

    while (currentPage <= pagesToScrape) {
      try {
        // Rate limiting
        if (currentPage > 1) {
          await this.delay(this.config.performance.delayBetweenRequests);
        }

        const pageUrl = this.buildPageUrl(currentPage);
        logger.info(`📄 Scraping page ${currentPage}: ${pageUrl}`);

        const response = await axios.get(pageUrl, {
          timeout: this.config.performance.timeoutMs,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'es-CO,es;q=0.9,en;q=0.8'
          }
        });

        const $ = cheerio.load(response.data);
        const pageProperties = this.extractPropertiesFromCheerio($);

        if (pageProperties.length === 0) {
          logger.info(`🛑 No properties found on page ${currentPage}, stopping`);
          break;
        }

        allProperties.push(...pageProperties);
        logger.info(`📋 Page ${currentPage}: ${pageProperties.length} properties extracted`);

        // Check for next page
        if (!this.hasNextPageCheerio($)) {
          logger.info(`🏁 No more pages available after page ${currentPage}`);
          break;
        }

        currentPage++;

      } catch (error) {
        logger.warn(`⚠️ Error on page ${currentPage}:`, error);
        break;
      }
    }

    return allProperties;
  }

  /**
   * Scrape using Puppeteer (for complex sites)
   */
  private async scrapeWithPuppeteer(maxPages?: number): Promise<RawPropertyData[]> {
    const allProperties: RawPropertyData[] = [];
    const pagesToScrape = Math.min(maxPages || this.config.performance.maxPages, this.config.performance.maxPages);

    this.browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const page = await this.browser.newPage();
    await page.setViewport({ width: 1366, height: 800 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

    try {
      let currentPage = 1;

      while (currentPage <= pagesToScrape) {
        try {
          const pageUrl = this.buildPageUrl(currentPage);
          logger.info(`📄 Scraping page ${currentPage}: ${pageUrl}`);

          await page.goto(pageUrl, { 
            waitUntil: 'networkidle2', 
            timeout: this.config.performance.timeoutMs 
          });

          // Wait for content to load
          await page.waitForSelector('body', { timeout: 10000 }).catch(() => {});

          // Special handling for JavaScript-heavy sites like Trovit
          if (this.schema.id === 'trovit') {
            console.log('🔄 Trovit: Waiting for JavaScript content to load...');
            try {
              // Wait for .js-listing elements to have actual content
              await page.waitForFunction(`() => {
                const listings = document.querySelectorAll('.js-listing');
                return listings.length > 0 && listings[0].textContent && listings[0].textContent.length > 100;
              }`, { timeout: 15000 });
              console.log('✅ Trovit: JavaScript content loaded successfully');
            } catch (error) {
              console.log('⚠️ Trovit: Timeout waiting for content, proceeding anyway');
            }
          } else {
            await this.delay(2000);
          }

          const pageProperties = await this.extractPropertiesFromPuppeteer(page);

          if (pageProperties.length === 0) {
            logger.info(`🛑 No properties found on page ${currentPage}, stopping`);
            break;
          }

          allProperties.push(...pageProperties);
          logger.info(`📋 Page ${currentPage}: ${pageProperties.length} properties extracted`);

          // Check for next page
          if (!(await this.hasNextPagePuppeteer(page))) {
            logger.info(`🏁 No more pages available after page ${currentPage}`);
            break;
          }

          currentPage++;

        } catch (error) {
          logger.warn(`⚠️ Error on page ${currentPage}:`, error);
          break;
        }
      }

    } finally {
      await page.close();
    }

    return allProperties;
  }

  /**
   * Extract properties using Cheerio
   */
  private extractPropertiesFromCheerio($: cheerio.CheerioAPI): RawPropertyData[] {
    const properties: RawPropertyData[] = [];
    const cards = $(this.schema.extraction.selectors.propertyCard);

    cards.each((index, card) => {
      try {
        const $card = $(card);
        const rawProperty = this.extractPropertyData($card, index);
        
        if (rawProperty && this.isValidProperty(rawProperty)) {
          properties.push(rawProperty);
        }
      } catch (error) {
        logger.warn(`Error extracting property ${index}:`, error);
      }
    });

    return properties;
  }

  /**
   * Extract properties using Puppeteer
   */
  private async extractPropertiesFromPuppeteer(page: Page): Promise<RawPropertyData[]> {
    const content = await page.content();
    const $ = cheerio.load(content);
    return this.extractPropertiesFromCheerio($);
  }

  /**
   * Extract property data from a card element
   */
  private extractPropertyData($card: cheerio.Cheerio<any>, cardIndex: number = 0): RawPropertyData | null {
    const rawProperty: RawPropertyData = {};

    // Extract using selectors
    Object.entries(this.schema.extraction.selectors).forEach(([field, selectorList]) => {
      if (field === 'propertyCard' || field === 'nextPage') return;
      
      const selectors = Array.isArray(selectorList) ? selectorList : [selectorList];
      for (const selector of selectors) {
        const element = $card.find(selector).first();
        if (element.length > 0) {
          if (field === 'images') {
            rawProperty[field] = element.attr('src') || element.attr('data-src') ||
                                ((): string => {
                                  const srcset = element.attr('srcset');
                                  if (!srcset) return '';
                                  const first = srcset.split(',')[0]?.trim().split(' ')[0];
                                  return first || '';
                                })() || '';
          } else if (field === 'link') {
            rawProperty[field] = element.attr('href') || element.attr('data-url') || '';
          } else {
            rawProperty[field] = element.text().trim();
          }
          break;
        }
      }
    });

    // Apply regex patterns for better extraction
    const fullText = $card.text();
    if (this.schema.extraction.regexPatterns) {
      Object.entries(this.schema.extraction.regexPatterns).forEach(([field, patterns]) => {
        // Always try regex patterns for numeric fields, even if selector found something
        const shouldOverride = ['area', 'rooms', 'bathrooms', 'parking'].includes(field) &&
                              rawProperty[field] && rawProperty[field].length > 10;

        if (!rawProperty[field] || rawProperty[field] === '' || shouldOverride) {
          for (const pattern of patterns) {
            // Reset regex lastIndex to avoid issues with global flag
            pattern.lastIndex = 0;

            // Use exec() instead of match() to properly capture groups with global regex
            const match = pattern.exec(fullText);
            if (match) {
              // For numeric fields, extract just the number
              if (['area', 'rooms', 'bathrooms', 'parking'].includes(field)) {
                const numMatch = match[1] || match[0];
                const cleanNum = numMatch.replace(/[^\d\.]/g, '');
                const parsedNum = field === 'area' ? parseFloat(cleanNum) : parseInt(cleanNum);

                // Validate reasonable ranges
                const isValidArea = field === 'area' && parsedNum >= 20 && parsedNum <= 1000;
                const isValidOther = field !== 'area' && parsedNum > 0 && parsedNum < 20;

                if (parsedNum && (isValidArea || isValidOther)) {
                  rawProperty[field] = field === 'area' ? Math.round(parsedNum).toString() : parsedNum.toString();
                  break;
                }
              } else {
                rawProperty[field] = match[1] || match[0];
                break;
              }
            }
          }
        }
      });
    }

    // Special handling for Ciencuadras: construct URLs from image property IDs
    if (this.schema.id === 'ciencuadras' && rawProperty.images && !rawProperty.link) {
      const imageUrl = rawProperty.images;
      const propertyIdMatch = imageUrl.match(/inmuebles\/images\/(\d+)\//);
      if (propertyIdMatch) {
        const propertyId = propertyIdMatch[1];
        rawProperty.link = `https://www.ciencuadras.com/propiedad/${propertyId}`;
      }
    }

    // Special handling for Properati: AGGRESSIVE URL extraction
    if (this.schema.id === 'properati' && !rawProperty.link) {
      // Method 1: Extract data-url from the property card itself
      const dataUrl = $card.attr('data-url');
      if (dataUrl) {
        rawProperty.link = dataUrl;
      } else {
        // Method 2: Look for data-url in child elements
        const dataUrlElement = $card.find('[data-url]').first();
        if (dataUrlElement.length > 0) {
          rawProperty.link = dataUrlElement.attr('data-url') || '';
        } else {
          // Method 3: Look for links with /detalle/ pattern
          const detalleLink = $card.find('a[href*="/detalle/"]').first();
          if (detalleLink.length > 0) {
            rawProperty.link = detalleLink.attr('href') || '';
          } else {
            // Method 4: Look for any properati.com links
            const properatiLink = $card.find('a[href*="properati.com"]').first();
            if (properatiLink.length > 0) {
              rawProperty.link = properatiLink.attr('href') || '';
            }
          }
        }
      }
    }

    // Special handling for Trovit: Extract data from text content (like PADS)
    if (this.schema.id === 'trovit') {
      const fullText = $card.text().trim();

      // Extract price (numbers like 2.835, 1.900, 16.000)
      if (!rawProperty.price) {
        const priceMatch = fullText.match(/(\d{1,3}(?:\.\d{3})+)/);
        if (priceMatch) {
          rawProperty.price = priceMatch[1];
        }
      }

      // Extract area (90 m², 58 m², 270 m²)
      if (!rawProperty.area) {
        const areaMatch = fullText.match(/(\d+)\s*m[²2]/i);
        if (areaMatch) {
          rawProperty.area = areaMatch[1];
        }
      }

      // Extract rooms (3 Alcoba, 1 alcoba, 3 habitacion)
      if (!rawProperty.rooms) {
        const roomMatch = fullText.match(/(\d+)\s*(?:alcoba|habitacion|dormitorio)/i);
        if (roomMatch) {
          rawProperty.rooms = roomMatch[1];
        }
      }

      // Extract title (first meaningful text before price)
      if (!rawProperty.title) {
        // Simple title extraction - can be improved
        const lines = fullText.split('\n').filter(line => line.trim().length > 10);
        if (lines.length > 0) {
          rawProperty.title = lines[0].trim().substring(0, 100);
        }
      }

      // Extract images from img elements
      if (!rawProperty.images) {
        const $img = $card.find('img').first();
        if ($img.length > 0) {
          rawProperty.images = $img.attr('src') || $img.attr('data-src') || '';
        }
      }

      // Extract property ID and construct link
      if (!rawProperty.link) {
        const html = $card.html() || '';
        // Look for property ID pattern: id="14032-32-7325-9ddf87dd299f-19862e0-9da7-72c8"
        const idMatch = html.match(/id="(14032-[a-f0-9-]+)"/i);
        if (idMatch) {
          const propertyId = idMatch[1];
          rawProperty.link = `https://casas.trovit.com.co/detail/${propertyId}`;
        } else {
          rawProperty.link = 'https://casas.trovit.com.co/'; // Fallback
        }
      }
    }

    // Special handling for Metrocuadrado: extract data from URLs
    if (this.schema.id === 'metrocuadrado' && rawProperty.link) {
      const url = rawProperty.link;

      // Extract rooms from URL if not found
      if ((!rawProperty.rooms || rawProperty.rooms === 'undefined')) {
        const roomsMatch = url.match(/(\d+)-habitaciones/i);
        if (roomsMatch) {
          rawProperty.rooms = roomsMatch[1];
        }
      }

      // Extract bathrooms from URL if not found
      if ((!rawProperty.bathrooms || rawProperty.bathrooms === 'undefined')) {
        const bathroomsMatch = url.match(/(\d+)-banos/i);
        if (bathroomsMatch) {
          rawProperty.bathrooms = bathroomsMatch[1];
        }
      }

      // Extract parking from URL if not found
      if ((!rawProperty.parking || rawProperty.parking === 'undefined')) {
        const parkingMatch = url.match(/(\d+)-garajes/i);
        if (parkingMatch) {
          rawProperty.parking = parkingMatch[1];
        }
      }
    }

    return rawProperty;
  }

  /**
   * Check if property has minimum required data
   */
  private isValidProperty(property: RawPropertyData): boolean {
    return !!(property.title && property.price);
  }

  /**
   * Build URL for specific page
   */
  private buildPageUrl(page: number): string {
    if (page === 1) return this.config.searchUrl;
    
    const url = new URL(this.config.searchUrl);
    url.searchParams.set('page', page.toString());
    return url.toString();
  }

  /**
   * Check if there's a next page (Cheerio)
   */
  private hasNextPageCheerio($: cheerio.CheerioAPI): boolean {
    if (!this.schema.extraction.selectors.nextPage) return false;
    
    const nextPageSelectors = Array.isArray(this.schema.extraction.selectors.nextPage) 
      ? this.schema.extraction.selectors.nextPage 
      : [this.schema.extraction.selectors.nextPage];
    
    return nextPageSelectors.some(selector => $(selector).length > 0);
  }

  /**
   * Check if there's a next page (Puppeteer)
   */
  private async hasNextPagePuppeteer(page: Page): Promise<boolean> {
    if (!this.schema.extraction.selectors.nextPage) return false;
    
    const nextPageSelectors = Array.isArray(this.schema.extraction.selectors.nextPage) 
      ? this.schema.extraction.selectors.nextPage 
      : [this.schema.extraction.selectors.nextPage];
    
    for (const selector of nextPageSelectors) {
      try {
        const element = await page.$(selector);
        if (element) return true;
      } catch (error) {
        // Continue to next selector
      }
    }
    
    return false;
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Cleanup resources
   */
  private async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
