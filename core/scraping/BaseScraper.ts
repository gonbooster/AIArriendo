import puppeteer, { Browser, Page } from 'puppeteer';
import * as cheerio from 'cheerio';
import axios from 'axios';
import { ScrapingSource, Property, SearchCriteria, RateLimit } from '../types';
import { RateLimiter } from './RateLimiter';
import { PropertyParser } from './PropertyParser';
import { UserAgentRotator } from './UserAgentRotator';
import { URL_BUILDERS } from '../../config/scraping-sources';
import { logger } from '../../utils/logger';

export class BaseScraper {
  protected source: ScrapingSource;
  protected rateLimiter: RateLimiter;
  protected parser: PropertyParser;
  protected userAgentRotator: UserAgentRotator;
  protected browser: Browser | null = null;

  constructor(source: ScrapingSource, rateLimiter: RateLimiter) {
    this.source = source;
    this.rateLimiter = rateLimiter;
    this.parser = new PropertyParser(source);
    this.userAgentRotator = new UserAgentRotator();
  }

  /**
   * Main scraping method
   */
  async scrape(criteria: SearchCriteria, maxPages: number = 10): Promise<Property[]> {
    logger.info(`Starting scraping for ${this.source.name}`);
    
    try {
      // Build search URL
      const searchUrl = this.buildSearchUrl(criteria);
      logger.info(`Search URL: ${searchUrl}`);

      // Choose scraping method based on source complexity
      const properties = await this.shouldUseBrowser() 
        ? await this.scrapeWithBrowser(searchUrl, criteria, maxPages)
        : await this.scrapeWithAxios(searchUrl, criteria, maxPages);

      logger.info(`Scraping completed for ${this.source.name}: ${properties.length} properties found`);
      return properties;

    } catch (error) {
      logger.error(`Scraping failed for ${this.source.name}:`, error);
      throw error;
    }
  }

  /**
   * Scrape using Puppeteer (for complex sites)
   */
  private async scrapeWithBrowser(
    searchUrl: string, 
    criteria: SearchCriteria, 
    maxPages: number
  ): Promise<Property[]> {
    await this.initBrowser();
    const page = await this.browser!.newPage();
    
    try {
      // Configure page
      await this.configurePage(page);
      
      const allProperties: Property[] = [];
      let currentPage = 1;

      while (currentPage <= maxPages) {
        // Rate limiting
        await this.rateLimiter.waitForSlot();

        // Navigate to page
        const pageUrl = this.buildPageUrl(searchUrl, currentPage);
        await page.goto(pageUrl, { 
          waitUntil: 'networkidle2', 
          timeout: 30000 
        });

        // Wait for content to load
        await this.waitForContent(page);

        // Extract properties from current page
        const pageProperties = await this.extractPropertiesFromPage(page, criteria);
        
        if (pageProperties.length === 0) {
          logger.info(`No properties found on page ${currentPage}, stopping`);
          break;
        }

        allProperties.push(...pageProperties);
        logger.info(`Page ${currentPage}: ${pageProperties.length} properties found`);

        // Check if there's a next page
        const hasNextPage = await this.hasNextPage(page);
        if (!hasNextPage) {
          logger.info('No more pages available');
          break;
        }

        currentPage++;
      }

      return allProperties;

    } finally {
      await page.close();
      await this.closeBrowser();
    }
  }

  /**
   * Scrape using Axios (for simple sites)
   */
  private async scrapeWithAxios(
    searchUrl: string, 
    criteria: SearchCriteria, 
    maxPages: number
  ): Promise<Property[]> {
    const allProperties: Property[] = [];
    let currentPage = 1;

    while (currentPage <= maxPages) {
      // Rate limiting
      await this.rateLimiter.waitForSlot();

      try {
        // Build page URL
        const pageUrl = this.buildPageUrl(searchUrl, currentPage);
        
        // Make request with enhanced headers
        const response = await axios.get(pageUrl, {
          headers: {
            'User-Agent': this.userAgentRotator.getRandom(),
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'es-CO,es;q=0.9,en;q=0.8',
            'Connection': 'keep-alive',
            'Referer': this.source.baseUrl
          },
          timeout: 30000,
          maxRedirects: 5
        });

        // Random delay between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * (3500 - 1500 + 1)) + 1500));

        // Parse HTML
        const $ = cheerio.load(response.data);
        
        // Extract properties
        const pageProperties = this.extractPropertiesFromCheerio($, criteria);
        
        if (pageProperties.length === 0) {
          logger.info(`No properties found on page ${currentPage}, stopping`);
          break;
        }

        allProperties.push(...pageProperties);
        logger.info(`Page ${currentPage}: ${pageProperties.length} properties found`);

        // Check for next page
        const hasNextPage = this.hasNextPageCheerio($);
        if (!hasNextPage) {
          logger.info('No more pages available');
          break;
        }

        currentPage++;

      } catch (error) {
        logger.error(`Error scraping page ${currentPage}:`, error);
        break;
      }
    }

    return allProperties;
  }

  /**
   * Extract properties from Puppeteer page
   */
  private async extractPropertiesFromPage(
    page: Page,
    criteria: SearchCriteria
  ): Promise<Property[]> {
    // TODO: Implement proper scraping with puppeteer
    // For now, return empty array to avoid DOM errors
    return [];

    /*
      propertyCards.forEach((card, index) => {
        try {
          const property = {
            title: card.querySelector(selectors.title)?.textContent?.trim() || '',
            priceText: card.querySelector(selectors.price)?.textContent?.trim() || '',
            areaText: card.querySelector(selectors.area)?.textContent?.trim() || '',
            roomsText: card.querySelector(selectors.rooms)?.textContent?.trim() || '',
            bathroomsText: card.querySelector(selectors.bathrooms)?.textContent?.trim() || '',
            location: card.querySelector(selectors.location)?.textContent?.trim() || '',
            amenitiesText: card.querySelector(selectors.amenities)?.textContent?.trim() || '',
            imageUrl: card.querySelector(selectors.images)?.getAttribute('src') || '',
            url: card.querySelector(selectors.link)?.getAttribute('href') || '',
            source: sourceName
          };

          if (property.title && property.priceText) {
            properties.push(property);
          }
        } catch (error) {
          console.log(`Error processing property ${index}:`, error);
        }
      });

      return properties;
    }, this.source.selectors, this.source.name);
    */
  }

  /**
   * Extract properties from Cheerio
   */
  private extractPropertiesFromCheerio(
    $: cheerio.CheerioAPI, 
    criteria: SearchCriteria
  ): Property[] {
    const properties: Property[] = [];
    const propertyCards = $(this.source.selectors.propertyCard);

    propertyCards.each((index, card) => {
      try {
        const $card = $(card);
        
        const rawProperty = {
          title: $card.find(this.source.selectors.title).text().trim(),
          priceText: $card.find(this.source.selectors.price).text().trim(),
          areaText: $card.find(this.source.selectors.area).text().trim(),
          roomsText: $card.find(this.source.selectors.rooms).text().trim(),
          bathroomsText: $card.find(this.source.selectors.bathrooms || '').text().trim(),
          location: $card.find(this.source.selectors.location).text().trim(),
          amenitiesText: $card.find(this.source.selectors.amenities || '').text().trim(),
          imageUrl: ($card.find(this.source.selectors.images).attr('src') || $card.find(this.source.selectors.images).attr('data-src') || ((): string => { const ss = $card.find(this.source.selectors.images).attr('srcset'); if (!ss) return ''; const first = ss.split(',')[0]?.trim().split(' ')[0]; return first || ''; })() || ''),
          url: $card.find(this.source.selectors.link).attr('href') || '',
          source: this.source.name
        };

        if (rawProperty.title && rawProperty.priceText) {
          const property = this.parser.parseProperty(rawProperty);
          if (property) {
            properties.push(property);
          }
        }
      } catch (error) {
        logger.warn(`Error processing property ${index}:`, error);
      }
    });

    return properties;
  }

  /**
   * Build search URL for the source
   */
  private buildSearchUrl(criteria: SearchCriteria): string {
    const urlBuilder = URL_BUILDERS[this.source.id as keyof typeof URL_BUILDERS];
    if (urlBuilder) {
      return urlBuilder(criteria);
    }
    
    // Fallback to base URL
    return this.source.baseUrl;
  }

  /**
   * Build URL for specific page
   */
  private buildPageUrl(baseUrl: string, page: number): string {
    if (page === 1) return baseUrl;
    
    const separator = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${separator}page=${page}`;
  }

  /**
   * Determine if browser is needed for this source
   */
  private shouldUseBrowser(): boolean {
    // Use browser for complex sites that require JavaScript
    const browserRequiredSources = ['facebook_marketplace', 'trovit'];
    return browserRequiredSources.includes(this.source.id);
  }

  /**
   * Initialize Puppeteer browser
   */
  private async initBrowser(): Promise<void> {
    if (this.browser) return;

    this.browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });
  }

  /**
   * Configure page settings
   */
  private async configurePage(page: Page): Promise<void> {
    // Set user agent
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    );

    // Set viewport
    await page.setViewport({ width: 1366, height: 768 });

    // Block unnecessary resources
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const resourceType = req.resourceType();
      if (['stylesheet', 'font', 'image'].includes(resourceType)) {
        req.abort();
      } else {
        req.continue();
      }
    });
  }

  /**
   * Wait for content to load
   */
  private async waitForContent(page: Page): Promise<void> {
    try {
      await page.waitForSelector(this.source.selectors.propertyCard, { 
        timeout: 10000 
      });
    } catch (error) {
      logger.warn(`Timeout waiting for content on ${this.source.name}`);
    }
  }

  /**
   * Check if there's a next page (Puppeteer)
   */
  private async hasNextPage(page: Page): Promise<boolean> {
    if (!this.source.selectors.nextPage) return false;
    
    try {
      const nextButton = await page.$(this.source.selectors.nextPage);
      return nextButton !== null;
    } catch {
      return false;
    }
  }

  /**
   * Check if there's a next page (Cheerio)
   */
  private hasNextPageCheerio($: cheerio.CheerioAPI): boolean {
    if (!this.source.selectors.nextPage) return false;
    
    return $(this.source.selectors.nextPage).length > 0;
  }

  /**
   * Close browser
   */
  private async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
