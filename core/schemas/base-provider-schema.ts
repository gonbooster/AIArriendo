/**
 * Base interfaces for provider schemas
 */

// Standard input from our web frontend
export interface WebSearchCriteria {
  operation: 'arriendo' | 'venta';
  propertyTypes: string[];
  minRooms?: number;
  maxRooms?: number;
  minBathrooms?: number;
  maxBathrooms?: number;
  minParking?: number;
  maxParking?: number;
  minArea?: number;
  maxArea?: number;
  minPrice?: number;
  maxPrice?: number;
  allowAdminOverage?: boolean;
  minStratum?: number;
  maxStratum?: number;
  location?: {
    city?: string;
    neighborhoods?: string[];
  };
  preferences?: {
    wetAreas?: string[];
    sports?: string[];
    amenities?: string[];
  };
}

// Standard output format (normalized Property)
export interface StandardProperty {
  id: string;
  title: string;
  price: number;
  adminFee: number;
  totalPrice: number;
  area: number;
  rooms: number;
  bathrooms: number;
  parking?: number;
  propertyType: string;
  location: {
    address: string;
    neighborhood: string;
    city: string;
    coordinates?: { lat: number; lng: number };
  };
  amenities: string[];
  images: string[];
  url: string;
  source: string;
  scrapedDate: string;
  pricePerM2: number;
  description: string;
  isActive: boolean;
}

// Base provider schema interface
export interface ProviderSchema {
  id: string;
  name: string;
  
  // Input mapping: how to convert WebSearchCriteria to provider-specific URL/params
  inputMapping: {
    supportsUrlFiltering: boolean;
    supportedFilters: string[];
    urlBuilder: (criteria: WebSearchCriteria) => string;
    requiresPostFiltering: string[];
  };
  
  // Extraction config: how to extract data from HTML
  extraction: {
    method: 'axios' | 'puppeteer';
    selectors: {
      propertyCard: string;
      title: string[];
      price: string[];
      area: string[];
      rooms: string[];
      bathrooms: string[];
      parking?: string[];
      propertyType?: string[];
      location: string[];
      images: string[];
      link: string[];
      nextPage?: string[];
    };
    regexPatterns?: {
      title?: RegExp[];
      price?: RegExp[];
      area?: RegExp[];
      rooms?: RegExp[];
      bathrooms?: RegExp[];
      parking?: RegExp[];
      location?: RegExp[];
    };
  };
  
  // Output mapping: how to convert raw extracted data to StandardProperty
  outputMapping: {
    fieldMappings: Record<string, string>;
    transformations: Record<string, (value: any) => any>;
    defaults: Partial<StandardProperty>;
  };
  
  // Rate limiting and performance
  performance: {
    requestsPerMinute: number;
    delayBetweenRequests: number;
    maxConcurrentRequests: number;
    timeoutMs: number;
    maxPages: number;
  };
}
