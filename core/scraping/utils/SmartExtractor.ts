/**
 * Smart Extractor with Multiple Fallbacks
 * Maximizes data extraction success rate
 */

import * as cheerio from 'cheerio';

export class SmartExtractor {
  
  /**
   * Extract title with intelligent fallbacks
   */
  static extractTitle($: cheerio.CheerioAPI, $element: cheerio.Cheerio<any>): string {
    // Primary selectors
    const titleSelectors = [
      '.ui-search-item__title',
      '.item-title',
      'h1', 'h2', 'h3', 'h4',
      '[class*="title"]',
      '[class*="name"]',
      'a[href*="apartamento"]',
      'a[href*="arriendo"]'
    ];

    for (const selector of titleSelectors) {
      const title = $element.find(selector).first().text().trim();
      if (title && title.length > 5) {
        return this.cleanTitle(title);
      }
    }

    // Fallback: Extract from URL or attributes
    const href = $element.find('a').first().attr('href') || '';
    if (href.includes('apartamento')) {
      return 'Apartamento en arriendo';
    }

    // Last resort: Generic title
    return 'Propiedad en arriendo';
  }

  /**
   * Extract price with multiple formats
   */
  static extractPrice($: cheerio.CheerioAPI, $element: cheerio.Cheerio<any>): string {
    const priceSelectors = [
      '.price',
      '[class*="price"]',
      '[class*="valor"]',
      '[class*="cost"]',
      '.ui-search-price',
      '.item-price'
    ];

    for (const selector of priceSelectors) {
      const price = $element.find(selector).first().text().trim();
      if (price && this.isValidPrice(price)) {
        return this.cleanPrice(price);
      }
    }

    // Fallback: Search in all text for price patterns
    const allText = $element.text();
    const priceMatch = allText.match(/\$\s*[\d,.]+(\.?\d{3})*\s*(mil|millones?)?/i);
    if (priceMatch) {
      return this.cleanPrice(priceMatch[0]);
    }

    return '';
  }

  /**
   * Extract image with multiple fallback strategies
   */
  static extractImage($: cheerio.CheerioAPI, $element: cheerio.Cheerio<any>): string {
    const imageSelectors = [
      'img[src*="http"]',
      'img[data-src*="http"]',
      'img[data-lazy*="http"]',
      'img[data-original*="http"]',
      '.image img',
      '[class*="image"] img',
      '[class*="photo"] img'
    ];

    for (const selector of imageSelectors) {
      const $img = $element.find(selector).first();
      
      // Try different attributes
      const src = $img.attr('src') || 
                  $img.attr('data-src') || 
                  $img.attr('data-lazy') || 
                  $img.attr('data-original');
      
      if (src && this.isValidImageUrl(src)) {
        return this.normalizeImageUrl(src);
      }
    }

    // Fallback: Check background images
    const bgImage = $element.find('[style*="background-image"]').first().attr('style');
    if (bgImage) {
      const urlMatch = bgImage.match(/url\(['"]?([^'"]+)['"]?\)/);
      if (urlMatch && urlMatch[1]) {
        return this.normalizeImageUrl(urlMatch[1]);
      }
    }

    return '';
  }

  /**
   * Extract area with number parsing
   */
  static extractArea($: cheerio.CheerioAPI, $element: cheerio.Cheerio<any>): number {
    const areaSelectors = [
      '[class*="area"]',
      '[class*="size"]',
      '[class*="m2"]',
      '[class*="metro"]'
    ];

    for (const selector of areaSelectors) {
      const areaText = $element.find(selector).first().text().trim();
      const area = this.parseNumber(areaText);
      if (area > 20 && area < 1000) { // Reasonable range
        return area;
      }
    }

    // Fallback: Search in all text
    const allText = $element.text();
    const areaMatch = allText.match(/(\d+)\s*m[²2]/i);
    if (areaMatch) {
      const area = parseInt(areaMatch[1]);
      if (area > 20 && area < 1000) {
        return area;
      }
    }

    return 80; // Default area
  }

  /**
   * Extract rooms with smart parsing
   */
  static extractRooms($: cheerio.CheerioAPI, $element: cheerio.Cheerio<any>): number {
    const roomSelectors = [
      '[class*="room"]',
      '[class*="hab"]',
      '[class*="bedroom"]',
      '[class*="alcoba"]'
    ];

    for (const selector of roomSelectors) {
      const roomText = $element.find(selector).first().text().trim();
      const rooms = this.parseNumber(roomText);
      if (rooms >= 1 && rooms <= 10) { // Reasonable range
        return rooms;
      }
    }

    // Fallback: Search in all text
    const allText = $element.text();
    const roomMatch = allText.match(/(\d+)\s*(?:hab|habitacion|alcoba|dormitorio|bedroom)/i);
    if (roomMatch) {
      const rooms = parseInt(roomMatch[1]);
      if (rooms >= 1 && rooms <= 10) {
        return rooms;
      }
    }

    return 3; // Default rooms
  }

  // Helper methods
  private static cleanTitle(title: string): string {
    return title
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s$.,()-]/g, '')
      .trim()
      .substring(0, 100);
  }

  private static cleanPrice(price: string): string {
    return price
      .replace(/[^\d$.,\s]/g, '')
      .trim();
  }

  private static cleanLocation(location: string): string {
    return location
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 50);
  }

  private static isValidPrice(price: string): boolean {
    return /\$|\d{3,}/.test(price);
  }

  private static isValidImageUrl(url: string): boolean {
    return url.startsWith('http') && 
           (url.includes('.jpg') || url.includes('.jpeg') || url.includes('.png') || url.includes('.webp'));
  }

  private static normalizeImageUrl(url: string): string {
    if (url.startsWith('//')) {
      return `https:${url}`;
    }
    return url;
  }

  private static parseNumber(text: string): number {
    const match = text.match(/\d+/);
    return match ? parseInt(match[0]) : 0;
  }
}
