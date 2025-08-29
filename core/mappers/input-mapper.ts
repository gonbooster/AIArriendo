import { WebSearchCriteria, ProviderSchema } from '../schemas/base-provider-schema';
import { FincaraizSchema } from '../schemas/fincaraiz-schema';
import { MetrocuadradoSchema } from '../schemas/metrocuadrado-schema';
import { MercadoLibreSchema } from '../schemas/mercadolibre-schema';
import { CiencuadrasSchema } from '../schemas/ciencuadras-schema';
import { ProperatiSchema } from '../schemas/properati-schema';
import { TrovitSchema } from '../schemas/trovit-schema';
import { PadsSchema } from '../schemas/pads-schema';

/**
 * Universal Input Mapper
 * Converts web frontend criteria to provider-specific URLs and configurations
 */

// Registry of all provider schemas
const PROVIDER_SCHEMAS: Record<string, ProviderSchema> = {
  fincaraiz: FincaraizSchema,
  metrocuadrado: MetrocuadradoSchema,
  mercadolibre: MercadoLibreSchema,
  ciencuadras: CiencuadrasSchema,
  properati: ProperatiSchema,
  trovit: TrovitSchema,
  pads: PadsSchema
};

export interface ProviderSearchConfig {
  providerId: string;
  searchUrl: string;
  method: 'axios' | 'puppeteer';
  postFilters: WebSearchCriteria;
  performance: {
    requestsPerMinute: number;
    delayBetweenRequests: number;
    maxConcurrentRequests: number;
    timeoutMs: number;
    maxPages: number;
  };
}

export class InputMapper {
  /**
   * Convert web criteria to provider-specific search configurations
   */
  static mapCriteriaToProviders(
    criteria: WebSearchCriteria,
    providerIds?: string[]
  ): ProviderSearchConfig[] {
    const targetProviders = providerIds || Object.keys(PROVIDER_SCHEMAS);
    
    return targetProviders.map(providerId => {
      const schema = PROVIDER_SCHEMAS[providerId];
      if (!schema) {
        throw new Error(`Unknown provider: ${providerId}`);
      }
      
      return this.mapCriteriaToProvider(criteria, schema);
    });
  }
  
  /**
   * Convert web criteria to single provider configuration
   */
  static mapCriteriaToProvider(
    criteria: WebSearchCriteria,
    schema: ProviderSchema
  ): ProviderSearchConfig {
    // Build search URL using provider's URL builder
    const searchUrl = schema.inputMapping.urlBuilder(criteria);
    
    // Determine which filters need post-processing
    const postFilters = this.extractPostFilters(criteria, schema);
    
    return {
      providerId: schema.id,
      searchUrl,
      method: schema.extraction.method,
      postFilters,
      performance: schema.performance
    };
  }
  
  /**
   * Extract filters that need to be applied after scraping
   */
  private static extractPostFilters(
    criteria: WebSearchCriteria,
    schema: ProviderSchema
  ): WebSearchCriteria {
    const postFilters: Partial<WebSearchCriteria> = {};
    
    // Check each filter to see if it needs post-processing
    schema.inputMapping.requiresPostFiltering.forEach(filterKey => {
      const value = this.getNestedValue(criteria, filterKey);
      if (value !== undefined) {
        this.setNestedValue(postFilters, filterKey, value);
      }
    });
    
    return postFilters as WebSearchCriteria;
  }
  
  /**
   * Get nested object value by dot notation key
   */
  private static getNestedValue(obj: any, key: string): any {
    return key.split('.').reduce((current, prop) => current?.[prop], obj);
  }
  
  /**
   * Set nested object value by dot notation key
   */
  private static setNestedValue(obj: any, key: string, value: any): void {
    const keys = key.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, prop) => {
      if (!current[prop]) current[prop] = {};
      return current[prop];
    }, obj);
    target[lastKey] = value;
  }
  
  /**
   * Get provider schema by ID
   */
  static getProviderSchema(providerId: string): ProviderSchema {
    const schema = PROVIDER_SCHEMAS[providerId];
    if (!schema) {
      throw new Error(`Unknown provider: ${providerId}`);
    }
    return schema;
  }
  
  /**
   * Get all available provider IDs
   */
  static getAvailableProviders(): string[] {
    return Object.keys(PROVIDER_SCHEMAS);
  }
  
  /**
   * Validate criteria against provider capabilities
   */
  static validateCriteria(
    criteria: WebSearchCriteria,
    providerId: string
  ): { isValid: boolean; warnings: string[] } {
    const schema = this.getProviderSchema(providerId);
    const warnings: string[] = [];
    
    // Check if provider supports URL filtering for requested filters
    const requestedFilters = this.extractRequestedFilters(criteria);
    const unsupportedFilters = requestedFilters.filter(
      filter => !schema.inputMapping.supportedFilters.includes(filter) &&
                !schema.inputMapping.requiresPostFiltering.includes(filter)
    );
    
    if (unsupportedFilters.length > 0) {
      warnings.push(
        `Provider ${providerId} does not support filters: ${unsupportedFilters.join(', ')}`
      );
    }
    
    // Check if too many post-filters (might be slow)
    const postFilterCount = schema.inputMapping.requiresPostFiltering.filter(
      filter => this.getNestedValue(criteria, filter) !== undefined
    ).length;
    
    if (postFilterCount > 5) {
      warnings.push(
        `Provider ${providerId} requires post-filtering for ${postFilterCount} criteria, which may be slow`
      );
    }
    
    return {
      isValid: true, // We can always try, but with warnings
      warnings
    };
  }
  
  /**
   * Extract all requested filter keys from criteria
   */
  private static extractRequestedFilters(criteria: WebSearchCriteria): string[] {
    const filters: string[] = [];
    
    if (criteria.operation) filters.push('operation');
    if (criteria.propertyTypes?.length) filters.push('propertyTypes');
    if (criteria.minRooms) filters.push('minRooms');
    if (criteria.maxRooms) filters.push('maxRooms');
    if (criteria.minBathrooms) filters.push('minBathrooms');
    if (criteria.maxBathrooms) filters.push('maxBathrooms');
    if (criteria.minParking) filters.push('minParking');
    if (criteria.maxParking) filters.push('maxParking');
    if (criteria.minArea) filters.push('minArea');
    if (criteria.maxArea) filters.push('maxArea');
    if (criteria.minPrice) filters.push('minPrice');
    if (criteria.maxPrice) filters.push('maxPrice');
    if (criteria.location?.city) filters.push('location.city');
    if (criteria.location?.neighborhoods?.length) filters.push('neighborhoods');
    if (criteria.preferences?.amenities?.length) filters.push('amenities');
    
    return filters;
  }
}
