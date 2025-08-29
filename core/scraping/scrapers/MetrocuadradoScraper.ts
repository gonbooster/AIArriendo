import { BaseScraper } from '../BaseScraper';
import { Property, SearchCriteria, ScrapingSource } from '../../types';
import { RateLimiter } from '../RateLimiter';
import { logger } from '../../../utils/logger';
import * as cheerio from 'cheerio';
import axios from 'axios';
import puppeteer from 'puppeteer';

export class MetrocuadradoScraper extends BaseScraper {
  constructor(source: ScrapingSource, rateLimiter: RateLimiter) {
    super(source, rateLimiter);
  }

  /**
   * Scrape Metrocuadrado specifically
   */
  async scrape(criteria: SearchCriteria, maxPages: number = 10): Promise<Property[]> {
    logger.info('Starting Metrocuadrado scraping');

    try {
      const searchUrl = this.buildMetrocuadradoUrl(criteria);
      logger.info(`Metrocuadrado URL: ${searchUrl}`);

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
              'Referer': 'https://www.metrocuadrado.com/',
              'Connection': 'keep-alive'
            },
            timeout: 30000
          });

          const $ = cheerio.load(response.data);
          let pageProperties = this.extractMetrocuadradoPropertiesFromCards($, criteria);

          if (pageProperties.length === 0 && currentPage === 1) {
            logger.warn('No cards found on Metrocuadrado static HTML. Trying headless...');
            try {
              const headlessProps = await this.scrapeMetrocuadradoHeadless(pageUrl, criteria);
              if (headlessProps.length > 0) pageProperties = headlessProps;
            } catch (e) {
              logger.warn('Headless fallback for Metrocuadrado failed:', e);
            }
          }

          if (pageProperties.length === 0) {
            // As ultimate fallback, try simple price pattern extraction
            const fallbackProps = this.extractMetrocuadradoProperties($, criteria);
            if (fallbackProps.length > 0) pageProperties = fallbackProps;
          }

          if (pageProperties.length === 0) {
            logger.info(`No properties found on Metrocuadrado page ${currentPage}, stopping`);
            break;
          }

          allProperties.push(...pageProperties);
          logger.info(`Metrocuadrado page ${currentPage}: ${pageProperties.length} properties found`);

          // Check for next page
          const hasNextPage = $('.pagination .next').length > 0 ||
                             $('.pager .next').length > 0 ||
                             $('[aria-label="Next"]').length > 0;

          if (!hasNextPage) {
            logger.info('No more pages available on Metrocuadrado');
            break;
          }

          currentPage++;

          // Add delay between requests
          await new Promise(resolve => setTimeout(resolve, 2500));

        } catch (error) {
          logger.error(`Error scraping Metrocuadrado page ${currentPage}:`, error);
          break;
        }
      }

      logger.info(`Metrocuadrado scraping completed: ${allProperties.length} properties found`);
      return allProperties;

    } catch (error) {
      logger.error('Metrocuadrado scraping failed:', error);
      throw error;
    }
  }

  /**
   * Build Metrocuadrado search URL
   */
  private buildMetrocuadradoUrl(criteria: SearchCriteria): string {
    // Metrocuadrado uses a different URL structure
    let baseUrl = 'https://www.metrocuadrado.com/apartamentos/arriendo/bogota/';

    // Add neighborhood filter if specified
    if (criteria.hardRequirements.location?.neighborhoods?.length) {
      const neighborhood = criteria.hardRequirements.location.neighborhoods[0];
      // Map neighborhood names to Metrocuadrado zone names
      const neighborhoodMap: Record<string, string> = {
        'usaquen': 'usaquen',
        'usaquén': 'usaquen',
        'cedritos': 'cedritos',
        'chapinero': 'chapinero',
        'zona rosa': 'zona-rosa',
        'chico': 'chico',
        'rosales': 'rosales',
        'la candelaria': 'la-candelaria',
        'centro': 'centro',
        'santa barbara': 'santa-barbara',
        'country club': 'country-club'
      };

      const mappedNeighborhood = neighborhoodMap[neighborhood.toLowerCase()];
      if (mappedNeighborhood) {
        baseUrl += `${mappedNeighborhood}/`;
      }
    }

    const params = new URLSearchParams({
      'orden': 'relevancia'
      // NO MORE FILTERS - GET EVERYTHING
    });

    return `${baseUrl}?${params}`;
  }

  /**
   * Extract properties from Metrocuadrado HTML
   */
  private extractMetrocuadradoProperties($: cheerio.CheerioAPI, criteria: SearchCriteria): Property[] {
    // IMPORTANT: Disable simple text-based fallback to avoid non-real items.
    // We only return real cards (static) or headless results.
    logger.info('🔍 Metrocuadrado: Simple fallback disabled to enforce REAL results only');
    return [];
  }


  // Extract cards reales con cheerio
  private extractMetrocuadradoPropertiesFromCards($: cheerio.CheerioAPI, criteria: SearchCriteria): Property[] {
    const properties: Property[] = [];

    const selectors = [
      '.resultado-busqueda .inmueble',
      '.listing-card',
      '.result-item',
      '[class*="resultado"], [class*="listing"]',
      'article',
      'li',
      '[class*="card"]',
      '[data-testid*="card"]'
    ];

    let cards: cheerio.Cheerio<any> = $();
    for (const sel of selectors) {
      cards = $(sel);
      if (cards.length > 0) {
        logger.info(`Metrocuadrado: found ${cards.length} cards with selector ${sel}`);
        break;
      }
    }

    if (cards.length === 0) return [];

    cards.each((idx, el) => {
      const $c = $(el);
      const title = $c.find('.listing-title, .title, h3, h4').first().text().trim();
      const priceText = $c.find('.price, .valor, .listing-price').first().text().trim();
      const url = $c.find('a[href]').first().attr('href') || '';
      const img = $c.find('img').first().attr('src') || '';
      const loc = $c.find('.location, .barrio, .address').first().text().trim();

      const price = parseInt((priceText || '').replace(/[^\d]/g, '')) || 0;
      if (!title || price <= 0) return;

      const prop: Property = {
        id: `metrocuadrado_${Date.now()}_${idx}`,
        title,
        price,
        adminFee: 0,
        totalPrice: price,
        area: 0,
        rooms: 0,
        bathrooms: 0,
        location: { address: loc, neighborhood: '', city: 'Bogotá' },
        images: img ? [img] : [],
        url: url.startsWith('http') ? url : `https://www.metrocuadrado.com${url}`,
        source: 'Metrocuadrado',
        description: '',
        amenities: [],
        scrapedDate: new Date().toISOString(),
        pricePerM2: 0,
        isActive: true
      };

      if (price <= criteria.hardRequirements.maxTotalPrice) {
        properties.push(prop);
      }
    });

    return properties;
  }

  private async scrapeMetrocuadradoHeadless(pageUrl: string, criteria: SearchCriteria): Promise<Property[]> {
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage'] });
    const page = await browser.newPage();
    try {
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForSelector('body', { timeout: 10000 }).catch(()=>{});
      // scroll para forzar render
      await page.evaluate(async () => {
        await new Promise<void>((resolve) => {
          let total = 0;
          const step = () => {
            (globalThis as any).scrollBy(0, 1200);
            total += 1200;
            if (total < 8000) setTimeout(step, 300); else resolve();
          };
          step();
        });
      });
      await page.waitForSelector('.listing-card, .result-item, [class*="resultado"], article, li, [class*="card"], [data-testid*="card"]', { timeout: 15000 }).catch(()=>{});

      const items = await page.evaluate(() => {
        const out: Array<{title:string; priceText:string; url:string; img:string; loc:string;}> = [];
        const doc: any = (globalThis as any).document;
        const cards = doc ? Array.from(doc.querySelectorAll('.listing-card, .result-item, [class*="resultado"], article, li, [class*="card"], [data-testid*="card"]')) : [];
        cards.forEach((el: any) => {
          const title = el.querySelector('.listing-title, .title, h3, h4')?.textContent?.trim() || '';
          const priceText = el.querySelector('.price, .valor, .listing-price, [class*="price"]')?.textContent?.trim() || '';
          const linkEl: any = el.querySelector('a[href]');
          const link = linkEl ? (linkEl.href || linkEl.getAttribute('href')) : '';
          const imgEl: any = el.querySelector('img');
          let img = '';
          if (imgEl) {
            img = imgEl.getAttribute?.('data-src') || imgEl.getAttribute?.('data-lazy') || imgEl.getAttribute?.('src') || '';
            if (!img) {
              const srcset = imgEl.getAttribute?.('srcset') || '';
              if (srcset) img = srcset.split(',')[0]?.trim().split(' ')[0] || '';
            }
          }
          const loc = el.querySelector('.location, .barrio, .address')?.textContent?.trim() || '';
          if ((title || priceText) && link) out.push({ title, priceText, url: link, img, loc });
        });
        return out;
      });

      const props: Property[] = [];
      items.forEach((it, idx) => {
        const price = parseInt((it.priceText || '').replace(/[^\d]/g, '')) || 0;
        if (!price) return;
        const p: Property = {
          id: `m2_headless_${Date.now()}_${idx}`,
          title: it.title || 'Apartamento en arriendo',
          price,
          adminFee: 0,
          totalPrice: price,
          area: 0,
          rooms: 0,
          bathrooms: 0,
          location: { address: it.loc, neighborhood: '', city: 'Bogotá' },
          images: it.img ? [it.img] : [],
          url: it.url,
          source: 'Metrocuadrado',
          description: '',
          amenities: [],
          scrapedDate: new Date().toISOString(),
          pricePerM2: 0,
          isActive: true
        };
        if (price <= criteria.hardRequirements.maxTotalPrice) props.push(p);
      });

      return props;
    } finally {
      await page.close();
      await browser.close();
    }
  }

  }
