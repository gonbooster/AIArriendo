import { Property, ScrapingSource } from '../types';
import { logger } from '../../utils/logger';

/**
 * Parser para convertir datos raw en objetos Property
 */
export class PropertyParser {
  constructor(private source: ScrapingSource) {}

  /**
   * Parsea una propiedad raw en un objeto Property
   */
  parseProperty(rawProperty: any): Property | null {
    try {
      if (!rawProperty) return null;

      // Aliases para campos comunes que llegan con distinto nombre según scraper
      const price = this.parsePrice(rawProperty.price ?? rawProperty.totalPrice ?? rawProperty.priceText);
      const area = this.parseArea(rawProperty.area ?? rawProperty.areaText) || 0;
      const adminFee = this.parsePrice(rawProperty.adminFee);
      const totalPrice = adminFee > 0 ? price + adminFee : price;

      const roomsVal = this.parseRooms(rawProperty.rooms ?? rawProperty.roomsText);
      const bathsVal = this.parseBathrooms(rawProperty.bathrooms ?? rawProperty.bathroomsText);
      const titleVal = this.parseTitle(rawProperty.title);

      const property: Property = {
        id: this.generateId(rawProperty),
        title: titleVal,
        price,
        adminFee: adminFee || 0,
        totalPrice,
        area,
        rooms: roomsVal,
        bathrooms: bathsVal,
        location: this.parseLocation(rawProperty.location),
        amenities: this.parseAmenities(rawProperty.amenities),
        images: this.parseImages(rawProperty.images),
        url: this.parseUrl(rawProperty.url),
        source: this.source.name,
        scrapedDate: new Date().toISOString(),
        pricePerM2: area > 0 ? Math.round(price / area) : 0,
        isActive: true,
        description: typeof rawProperty.description === 'string' ? rawProperty.description : ''
      };

      return property;

    } catch (error) {
      logger.warn(`Error parsing property from ${this.source.name}:`, error);
      return null;
    }
  }

  /**
   * Genera ID único para la propiedad
   */
  private generateId(rawProperty: any): string {
    const timestamp = Date.now();
    const sourceId = this.source.id;
    const hash = this.simpleHash(rawProperty.title || rawProperty.url || '');
    return `${sourceId}_${timestamp}_${hash}`;
  }

  /**
   * Parsea título
   */
  private parseTitle(title: any): string {
    if (!title) return '';
    return String(title).trim().substring(0, 200);
  }

  /**
   * Parsea precio
   */
  private parsePrice(price: any): number {
    if (!price) return 0;
    
    const priceStr = String(price).replace(/[^\d]/g, '');
    return parseInt(priceStr) || 0;
  }

  /**
   * Parsea área
   */
  private parseArea(area: any): number {
    if (!area) return 0;
    
    const areaStr = String(area);
    const match = areaStr.match(/(\d+(?:\.\d+)?)/);
    return match ? parseFloat(match[1]) : 0;
  }

  /**
   * Parsea habitaciones
   */
  private parseRooms(rooms: any): number {
    if (!rooms) return 0;
    
    const roomsStr = String(rooms);
    const match = roomsStr.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }

  /**
   * Parsea baños
   */
  private parseBathrooms(bathrooms: any): number {
    if (!bathrooms) return 0;
    
    const bathroomsStr = String(bathrooms);
    const match = bathroomsStr.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }

  /**
   * Parsea ubicación
   */
  private parseLocation(location: any): any {
    if (!location) {
      return {
        address: '',
        neighborhood: '',
        city: 'Bogotá',
        coordinates: { lat: 0, lng: 0 }
      };
    }

    if (typeof location === 'string') {
      return {
        address: location,
        neighborhood: this.extractNeighborhood(location),
        city: 'Bogotá',
        coordinates: { lat: 0, lng: 0 }
      };
    }

    return {
      address: location.address || '',
      neighborhood: location.neighborhood || this.extractNeighborhood(location.address || ''),
      city: location.city || 'Bogotá',
      coordinates: location.coordinates || { lat: 0, lng: 0 }
    };
  }

  /**
   * Extrae barrio de una dirección
   */
  private extractNeighborhood(address: string): string {
    if (!address) return '';
    
    const parts = address.split(',');
    if (parts.length >= 2) {
      return parts[1].trim();
    }
    
    return address.trim();
  }

  /**
   * Parsea amenidades
   */
  private parseAmenities(amenities: any): string[] {
    if (!amenities) return [];
    
    if (Array.isArray(amenities)) {
      return amenities.map(a => String(a).trim()).filter(a => a.length > 0);
    }
    
    if (typeof amenities === 'string') {
      return amenities.split(',').map(a => a.trim()).filter(a => a.length > 0);
    }
    
    return [];
  }

  /**
   * Parsea imágenes
   */
  private parseImages(images: any): string[] {
    if (!images) return [];
    
    if (Array.isArray(images)) {
      return images.map(img => String(img).trim()).filter(img => img.length > 0);
    }
    
    if (typeof images === 'string') {
      return [images.trim()].filter(img => img.length > 0);
    }
    
    return [];
  }

  /**
   * Parsea URL
   */
  private parseUrl(url: any): string {
    if (!url) return '';
    
    const urlStr = String(url).trim();
    
    // Convertir URLs relativas a absolutas
    if (urlStr.startsWith('/')) {
      return `${this.source.baseUrl}${urlStr}`;
    }
    
    if (!urlStr.startsWith('http')) {
      return `${this.source.baseUrl}/${urlStr}`;
    }
    
    return urlStr;
  }

  /**
   * Hash simple para generar IDs
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }
}
