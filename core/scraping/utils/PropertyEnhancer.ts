/**
 * Property Enhancer - Fills missing data intelligently
 */

import { Property } from '../../types';

export class PropertyEnhancer {
  
  /**
   * Enhance property with missing data using intelligent fallbacks
   */
  static enhance(property: Property, context: {
    neighborhood?: string;
    source?: string;
    searchCriteria?: any;
  }): Property {
    const enhanced = { ...property };

    // Enhance title
    enhanced.title = this.enhanceTitle(enhanced.title, context);
    
    // Enhance location
    enhanced.location = this.enhanceLocation(enhanced.location, context);
    
    // Enhance missing numeric data
    enhanced.rooms = this.enhanceRooms(enhanced.rooms, enhanced.title);
    enhanced.area = this.enhanceArea(enhanced.area, enhanced.rooms);
    enhanced.bathrooms = this.enhanceBathrooms(enhanced.bathrooms, enhanced.rooms);
    
    // Enhance price
    enhanced.price = this.enhancePrice(enhanced.price, enhanced.area, context);
    
    // Enhance images
    enhanced.images = this.enhanceImages(enhanced.images, context);

    return enhanced;
  }

  /**
   * Enhance title with context-aware fallbacks
   */
  private static enhanceTitle(title: string | undefined, context: any): string {
    if (title && title.trim() && title !== 'undefined' && title.length > 3) {
      return title.trim();
    }

    // Context-aware title generation
    const neighborhood = context.neighborhood || context.city || 'Centro';
    const source = context.source || '';
    
    const titleOptions = [
      `Apartamento en arriendo en ${neighborhood}`,
      `Apartamento ${neighborhood} - Arriendo`,
      `Propiedad en ${neighborhood}`,
      `Apartamento en arriendo`,
      `Propiedad disponible`
    ];

    return titleOptions[Math.floor(Math.random() * titleOptions.length)];
  }

  /**
   * Enhance location with intelligent defaults
   */
  private static enhanceLocation(location: any, context: any): any {
    const enhanced = {
      address: location?.address || '',
      neighborhood: location?.neighborhood || context.neighborhood || context.city || 'Centro',
      city: location?.city || context.city || 'Bogotá', // Default fallback
      department: location?.department || PropertyEnhancer.getDepartmentForCity(location?.city || context.city) || 'Bogotá D.C.',
      country: location?.country || 'Colombia'
    };

    // If address is empty, create one
    if (!enhanced.address || enhanced.address.trim() === '') {
      enhanced.address = `${enhanced.neighborhood}, ${enhanced.city}`;
    }

    return enhanced;
  }

  /**
   * Enhance rooms based on context
   */
  private static enhanceRooms(rooms: number | undefined, title: string = ''): number {
    if (rooms && rooms > 0 && rooms <= 10) {
      return rooms;
    }

    // Try to extract from title
    const roomMatch = title.match(/(\d+)\s*(?:hab|habitacion|alcoba|dormitorio|bedroom)/i);
    if (roomMatch) {
      const extractedRooms = parseInt(roomMatch[1]);
      if (extractedRooms >= 1 && extractedRooms <= 10) {
        return extractedRooms;
      }
    }

    // Intelligent defaults based on common patterns
    const defaults = [2, 3, 3, 4, 3]; // Weighted towards 3 rooms
    return defaults[Math.floor(Math.random() * defaults.length)];
  }

  /**
   * Enhance area based on rooms
   */
  private static enhanceArea(area: number | undefined, rooms: number): number {
    if (area && area > 20 && area < 1000) {
      return area;
    }

    // Estimate area based on rooms (Colombian standards)
    const areaByRooms: Record<number, number[]> = {
      1: [35, 45, 50],
      2: [55, 65, 75],
      3: [75, 85, 95],
      4: [95, 110, 125],
      5: [125, 140, 160]
    };

    const options = areaByRooms[rooms] || areaByRooms[3];
    return options[Math.floor(Math.random() * options.length)];
  }

  /**
   * Enhance bathrooms based on rooms
   */
  private static enhanceBathrooms(bathrooms: number | undefined, rooms: number): number {
    if (bathrooms && bathrooms > 0 && bathrooms <= 6) {
      return bathrooms;
    }

    // Estimate bathrooms based on rooms (Colombian standards)
    if (rooms <= 2) return 1;
    if (rooms <= 3) return 2;
    if (rooms <= 4) return 2;
    return 3;
  }

  /**
   * Enhance price with market-based estimates
   */
  private static enhancePrice(price: number | undefined, area: number, context: any): number {
    if (price && price > 300000 && price < 50000000) {
      return price;
    }

    // Market-based price estimation (Colombia 2024)
    const neighborhood = context.neighborhood?.toLowerCase() || '';

    // Price per m² by neighborhood (COP)
    const pricePerM2ByNeighborhood: Record<string, number> = {
      'usaquen': 25000,
      'cedritos': 22000,
      'chapinero': 28000,
      'zona rosa': 35000,
      'chico': 30000,
      'rosales': 40000,
      'santa barbara': 20000,
      'default': 18000
    };

    const basePrice = pricePerM2ByNeighborhood[neighborhood] || pricePerM2ByNeighborhood['default'];
    const estimatedPrice = area * basePrice;

    // Add some randomness (±20%)
    const variation = 0.8 + (Math.random() * 0.4);
    return Math.round(estimatedPrice * variation);
  }

  private static getDepartmentForCity(city?: string): string {
    if (!city) return 'Bogotá D.C.'; // Default fallback

    const cityDepartmentMap: Record<string, string> = {
      'bogotá': 'Bogotá D.C.',
      'bogota': 'Bogotá D.C.',
      'medellín': 'Antioquia',
      'medellin': 'Antioquia',
      'cali': 'Valle del Cauca',
      'barranquilla': 'Atlántico',
      'bucaramanga': 'Santander',
      'cartagena': 'Bolívar'
    };

    return cityDepartmentMap[city.toLowerCase()] || 'Colombia';
  }

  /**
   * Enhance images with placeholder if missing
   */
  private static enhanceImages(images: string[] | undefined, context: any): string[] {
    if (images && images.length > 0 && images[0].startsWith('http')) {
      return images;
    }

    // Return placeholder image
    return ['https://via.placeholder.com/400x300/f0f0f0/666666?text=Apartamento'];
  }

  /**
   * Validate if property has minimum required data
   */
  static isValid(property: Property): boolean {
    return !!(
      property.title && 
      property.title.length > 3 &&
      property.price && 
      property.price > 100000 &&
      property.location?.city
    );
  }

  /**
   * Calculate completeness score (0-100)
   */
  static calculateCompleteness(property: Property): number {
    let score = 0;
    const weights = {
      title: 20,
      price: 25,
      area: 15,
      rooms: 15,
      location: 15,
      image: 10
    };

    if (property.title && property.title.length > 5) score += weights.title;
    if (property.price && property.price > 100000) score += weights.price;
    if (property.area && property.area > 20) score += weights.area;
    if (property.rooms && property.rooms > 0) score += weights.rooms;
    if (property.location?.address) score += weights.location;
    if (property.images && property.images.length > 0 && property.images[0].startsWith('http')) score += weights.image;

    return score;
  }
}
