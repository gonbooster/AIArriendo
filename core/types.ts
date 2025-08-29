// Core domain types for the application

export interface Property {
  id: string;
  source: string;
  title: string;
  price: number;
  adminFee: number;
  totalPrice: number;
  area: number;
  rooms: number;
  bathrooms?: number;
  parking?: number;
  stratum?: number;
  location: PropertyLocation;
  amenities: string[];
  description: string;
  images: string[];
  url: string;
  contactInfo?: ContactInfo;
  publishedDate?: Date;
  scrapedDate: string;
  pricePerM2: number;
  score?: number;
  preferenceMatches?: string[];
  isActive: boolean;
  metadata?: PropertyMetadata;
}

export interface PropertyLocation {
  address: string;
  neighborhood?: string;
  street?: number;
  carrera?: number;
  coordinates?: Coordinates;
  zone?: string;
  city: string;
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface ContactInfo {
  phone?: string;
  email?: string;
  agent?: string;
  whatsapp?: string;
}

export interface PropertyMetadata {
  parking?: boolean;
  furnished?: boolean;
  pets?: boolean;
  stratum?: number;
  buildingAge?: number;
  floor?: number;
  totalFloors?: number;
}

// Search criteria with clear distinction between hard requirements and preferences
export interface SearchCriteria {
  // HARD REQUIREMENTS (mandatory filters)
  hardRequirements: {
    minRooms: number;
    maxRooms?: number;
    minBathrooms?: number;
    maxBathrooms?: number;
    minParking?: number;
    maxParking?: number;
    minArea: number;
    maxArea?: number;
    minTotalPrice?: number;
    maxTotalPrice: number;
    allowAdminOverage: boolean;
    minStratum?: number;
    maxStratum?: number;
    propertyTypes?: string[];
    operation?: string;
    location: LocationCriteria;
  };
  
  // SOFT PREFERENCES (for scoring/ranking)
  preferences: {
    wetAreas: string[];
    sports: string[];
    amenities: string[];
    weights: PreferenceWeights;
  };
  
  // OPTIONAL FILTERS
  optionalFilters?: {
    sources?: string[];
    neighborhoods?: string[];
    priceRange?: PriceRange;
    furnished?: boolean;
    parking?: boolean;
    pets?: boolean;
  };
}

export interface LocationCriteria {
  minStreet?: number;
  maxStreet?: number;
  minCarrera?: number;
  maxCarrera?: number;
  neighborhoods?: string[];
  zones?: string[];
  city: string;
}

export interface PriceRange {
  min?: number;
  max?: number;
}

export interface PreferenceWeights {
  wetAreas: number;
  sports: number;
  amenities: number;
  location: number;
  pricePerM2: number;
}

// Scraping system types
export interface ScrapingSource {
  id: string;
  name: string;
  baseUrl: string;
  searchUrlTemplate?: string; // Template for search URLs with placeholders
  isActive: boolean;
  priority: number;
  rateLimit: RateLimit;
  selectors: ScrapingSelectors;
  headers?: Record<string, string>;
  cookies?: Record<string, string>;
}

export interface RateLimit {
  requestsPerMinute: number;
  delayBetweenRequests: number;
  maxConcurrentRequests: number;
}

export interface ScrapingSelectors {
  propertyCard: string;
  title: string;
  price: string;
  area: string;
  rooms: string;
  bathrooms?: string;
  location: string;
  amenities?: string;
  images?: string;
  link: string;
  nextPage?: string;
}

export interface ScrapingJob {
  id: string;
  sourceId: string;
  source?: string;
  status: JobStatus;
  startTime?: string;
  endTime?: string;
  propertiesFound: number;
  propertiesProcessed: number;
  errors: ScrapingError[];
  error?: string;
  progress: number;
  metadata?: JobMetadata;
}

export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface ScrapingError {
  type: 'network' | 'parsing' | 'validation' | 'rate_limit';
  message: string;
  timestamp: Date;
  url?: string;
}

export interface JobMetadata {
  pagesScraped: number;
  totalPages?: number;
  duplicatesFound: number;
  averageResponseTime: number;
}

// Search and results
export interface SearchResult {
  properties: Property[];
  total: number;
  page: number;
  limit: number;
  criteria: SearchCriteria;
  summary: SearchSummary;
  executionTime: number;
}

export interface SearchSummary {
  totalFound: number;
  hardMatches: number;
  averagePrice: number;
  averagePricePerM2: number;
  averageArea: number;
  sourceBreakdown: Record<string, number>;
  sources: Record<string, number>;
  neighborhoodBreakdown: Record<string, number>;
  priceDistribution: PriceDistribution[];
}

export interface PriceDistribution {
  range: string;
  count: number;
  percentage: number;
}

// API responses
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  pagination?: Pagination;
  metadata?: ResponseMetadata;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface ResponseMetadata {
  executionTime: number;
  cacheHit?: boolean;
  version: string;
}

// Configuration
export interface AppConfig {
  server: ServerConfig;
  database: DatabaseConfig;
  redis: RedisConfig;
  scraping: ScrapingConfig;
  search: SearchConfig;
}

export interface ServerConfig {
  port: number;
  host: string;
  rateLimit: RateLimitConfig;
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

export interface DatabaseConfig {
  uri: string;
  options: Record<string, any>;
}

export interface RedisConfig {
  uri: string;
  keyPrefix: string;
}

export interface ScrapingConfig {
  maxConcurrentJobs: number;
  jobTimeout: number;
  retryAttempts: number;
  sources: ScrapingSource[];
}

export interface SearchConfig {
  defaultLimit: number;
  maxLimit: number;
  cacheTimeout: number;
  scoring: ScoringConfig;
}

export interface ScoringConfig {
  weights: PreferenceWeights;
  penalties: {
    priceOverBudget: number;
    areaUnderMinimum: number;
    locationMismatch: number;
  };
}

export interface DashboardStats {
  totalProperties: number;
  activeScrapingJobs: number;
  averagePrice: number;
  averagePricePerM2: number;
  sourceStats: Array<{
    source: string;
    count: number;
    lastUpdate: string;
  }>;
  priceDistribution: Array<{
    range: string;
    count: number;
  }>;
  areaDistribution: Array<{
    range: string;
    count: number;
  }>;
  recentActivity: Array<{
    type: 'scraping' | 'search' | 'alert';
    message: string;
    timestamp: string;
  }>;
}
