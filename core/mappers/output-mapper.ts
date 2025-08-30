import { StandardProperty, ProviderSchema } from '../schemas/base-provider-schema';
import { InputMapper } from './input-mapper';

/**
 * Universal Output Mapper
 * Normalizes raw scraped data from all providers to StandardProperty format
 */

export interface RawPropertyData {
  [key: string]: any;
}

export class OutputMapper {
  /**
   * Convert raw scraped data to StandardProperty using provider schema
   */
  static mapToStandardProperty(
    rawData: RawPropertyData,
    providerId: string
  ): StandardProperty | null {
    try {
      const schema = InputMapper.getProviderSchema(providerId);
      
      // Apply field mappings
      const mappedData = this.applyFieldMappings(rawData, schema);
      
      // Apply transformations
      const transformedData = this.applyTransformations(mappedData, schema);
      
      // Apply defaults
      const finalData = this.applyDefaults(transformedData, schema);
      
      // Validate required fields
      if (!this.validateRequiredFields(finalData)) {
        return null;
      }
      
      // Generate final StandardProperty
      return this.buildStandardProperty(finalData, schema);
      
    } catch (error) {
      console.warn(`Error mapping property from ${providerId}:`, error);
      return null;
    }
  }
  
  /**
   * Apply field mappings from schema
   */
  private static applyFieldMappings(
    rawData: RawPropertyData,
    schema: ProviderSchema
  ): RawPropertyData {
    const mapped: RawPropertyData = {};
    
    // Copy unmapped fields first
    Object.keys(rawData).forEach(key => {
      mapped[key] = rawData[key];
    });
    
    // Apply explicit mappings
    Object.entries(schema.outputMapping.fieldMappings).forEach(([sourceField, targetPath]) => {
      if (rawData[sourceField] !== undefined) {
        this.setNestedValue(mapped, targetPath, rawData[sourceField]);
      }
    });
    
    return mapped;
  }
  
  /**
   * Apply transformations from schema
   */
  private static applyTransformations(
    data: RawPropertyData,
    schema: ProviderSchema
  ): RawPropertyData {
    const transformed = { ...data };
    
    Object.entries(schema.outputMapping.transformations).forEach(([field, transformer]) => {
      if (transformed[field] !== undefined) {
        const result = transformer(transformed[field]);
        if (result === null) {
          // Transformation returned null, skip this property
          return null;
        }
        transformed[field] = result;
      }
    });
    
    return transformed;
  }
  
  /**
   * Apply default values from schema
   */
  private static applyDefaults(
    data: RawPropertyData,
    schema: ProviderSchema
  ): RawPropertyData {
    const withDefaults = { ...data };
    
    Object.entries(schema.outputMapping.defaults).forEach(([field, defaultValue]) => {
      if (withDefaults[field] === undefined || withDefaults[field] === null || withDefaults[field] === '') {
        withDefaults[field] = defaultValue;
      }
    });
    
    return withDefaults;
  }
  
  /**
   * Validate that required fields are present
   */
  private static validateRequiredFields(data: RawPropertyData): boolean {
    const requiredFields = ['title', 'price'];
    
    return requiredFields.every(field => {
      const value = data[field];
      return value !== undefined && value !== null && value !== '';
    });
  }
  
  /**
   * Build final StandardProperty object
   */
  private static buildStandardProperty(
    data: RawPropertyData,
    schema: ProviderSchema
  ): StandardProperty {
    // Generate unique ID
    const id = this.generatePropertyId(data, schema.id);
    
    // Extract and normalize location
    const location = this.normalizeLocation(data.location || data.address);
    
    // Calculate derived fields
    const area = this.normalizeNumber(data.area);
    const price = this.normalizeNumber(data.price);
    const adminFee = this.normalizeNumber(data.adminFee);
    const totalPrice = adminFee > 0 ? price + adminFee : price;
    const pricePerM2 = area > 0 ? Math.round(price / area) : 0;
    
    return {
      id,
      title: this.normalizeString(data.title),
      price,
      adminFee,
      totalPrice,
      area,
      rooms: this.normalizeNumber(data.rooms),
      bathrooms: this.normalizeNumber(data.bathrooms),
      parking: this.normalizeNumber(data.parking),
      propertyType: this.normalizeString(data.propertyType) || 'Apartamento',
      location,
      amenities: this.normalizeArray(data.amenities),
      images: this.normalizeImageArray(data.images),
      url: this.normalizeUrl(data.url),
      source: schema.name,
      scrapedDate: new Date().toISOString(),
      pricePerM2,
      description: this.normalizeString(data.description),
      isActive: true
    };
  }
  
  /**
   * Generate unique property ID
   */
  private static generatePropertyId(data: RawPropertyData, providerId: string): string {
    const timestamp = Date.now();
    const hash = this.simpleHash(data.title || data.url || '');
    return `${providerId}_${timestamp}_${hash}`;
  }
  
  /**
   * Simple hash function for generating IDs
   */
  private static simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }
  
  /**
   * Normalize location object
   */
  private static normalizeLocation(location: any): StandardProperty['location'] {
    if (!location) {
      return {
        address: '',
        neighborhood: '',
        city: '', // No hardcodear ciudad
        coordinates: { lat: 0, lng: 0 }
      };
    }

    if (typeof location === 'string') {
      return {
        address: location,
        neighborhood: this.extractNeighborhood(location),
        city: this.extractCity(location), // Extraer ciudad dinámicamente
        coordinates: { lat: 0, lng: 0 }
      };
    }
    
    return {
      address: this.normalizeString(location.address),
      neighborhood: this.normalizeString(location.neighborhood) || this.extractNeighborhood(location.address || ''),
      city: this.normalizeString(location.city) || this.extractCity(location.address || ''),
      coordinates: location.coordinates || { lat: 0, lng: 0 }
    };
  }
  
  /**
   * Extract neighborhood from address string
   */
  private static extractNeighborhood(address: string): string {
    if (!address) return '';
    
    // Common neighborhood patterns in Colombian addresses
    const patterns = [
      /(?:barrio|sector|zona)\s+([^,]+)/i,
      /([^,]+),\s*bogot[aá]/i,
      /([^,]+),\s*[^,]*$/
    ];
    
    for (const pattern of patterns) {
      const match = address.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    return '';
  }

  /**
   * Extract city from address string
   */
  private static extractCity(address: string): string {
    if (!address) return '';

    const addressLower = address.toLowerCase();

    // Common Colombian cities
    const cities = [
      'bogotá', 'bogota', 'medellín', 'medellin', 'cali', 'barranquilla',
      'cartagena', 'bucaramanga', 'pereira', 'ibagué', 'ibague', 'manizales',
      'villavicencio', 'pasto', 'montería', 'monteria', 'valledupar',
      'neiva', 'soledad', 'armenia', 'soacha', 'popayán', 'popayan'
    ];

    for (const city of cities) {
      if (addressLower.includes(city)) {
        return city.charAt(0).toUpperCase() + city.slice(1);
      }
    }

    return '';
  }

  /**
   * Normalize string values
   */
  private static normalizeString(value: any): string {
    if (!value) return '';
    return String(value).trim().substring(0, 500);
  }
  
  /**
   * Normalize number values
   */
  private static normalizeNumber(value: any): number {
    if (!value) return 0;
    const num = typeof value === 'number' ? value : parseInt(String(value).replace(/[^\d]/g, ''));
    return isNaN(num) ? 0 : num;
  }
  
  /**
   * Normalize array values
   */
  private static normalizeArray(value: any): string[] {
    if (!value) return [];
    if (Array.isArray(value)) return value.map(v => String(v).trim()).filter(Boolean);
    return [String(value).trim()].filter(Boolean);
  }
  
  /**
   * Normalize image array
   */
  private static normalizeImageArray(value: any): string[] {
    const images = this.normalizeArray(value);
    return images
      .filter(img => img.startsWith('http') || img.startsWith('/'))
      .map(img => this.normalizeUrl(img))
      .filter(Boolean);
  }
  
  /**
   * Normalize URL values
   */
  private static normalizeUrl(value: any): string {
    if (!value) return '';
    const url = String(value).trim();

    // Already absolute URL
    if (url.startsWith('http')) {
      return url;
    }

    // Make relative URLs absolute
    if (url.startsWith('/')) {
      return `https://www.example.com${url}`; // This should be provider-specific
    }

    return url;
  }
  
  /**
   * Set nested object value by dot notation
   */
  private static setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {};
      return current[key];
    }, obj);
    target[lastKey] = value;
  }
  
  /**
   * Batch convert multiple raw properties
   */
  static mapMultipleProperties(
    rawProperties: RawPropertyData[],
    providerId: string
  ): StandardProperty[] {
    return rawProperties
      .map(raw => this.mapToStandardProperty(raw, providerId))
      .filter((property): property is StandardProperty => property !== null);
  }
}
