export interface Property {
  _id?: string;
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
  location: {
    address: string;
    neighborhood?: string;
    street?: number;
    carrera?: number;
    coordinates?: {
      lat: number;
      lng: number;
    };
    zone?: string;
  };
  amenities: string[];
  description: string;
  images: string[];
  url: string;
  contactInfo?: {
    phone?: string;
    email?: string;
    agent?: string;
  };
  publishedDate?: string;
  scrapedDate: string;
  pricePerM2: number;
  score?: number;
  preferenceMatches?: string[];
  isActive: boolean;
  ageInDays?: number;
}

export interface SearchCriteria {
  operation?: string;
  propertyTypes?: string[];
  minRooms: number;
  maxRooms?: number;
  minBathrooms?: number;
  maxBathrooms?: number;
  minParking?: number;
  maxParking?: number;
  minArea: number;
  maxArea?: number;
  minPrice?: number;
  maxPrice: number;
  allowAdminOverage: boolean;
  minStratum?: number;
  maxStratum?: number;
  location: {
    minStreet?: number;
    maxStreet?: number;
    minCarrera?: number;
    maxCarrera?: number;
    neighborhoods?: string[];
    zones?: string[];
  };
  preferences: {
    wetAreas: Array<{ name: string; priority: 'nice' | 'essential' }>;
    sports: Array<{ name: string; priority: 'nice' | 'essential' }>;
    amenities: Array<{ name: string; priority: 'nice' | 'essential' }>;
  };
  sources?: string[];
}

export interface SearchResult {
  properties: Property[];
  total: number;
  page: number;
  limit: number;
  filters: SearchCriteria;
  summary: {
    averagePrice: number;
    averagePricePerM2: number;
    averageArea: number;
    sourceBreakdown: { [source: string]: number };
  };
}

export interface ScrapingJob {
  id: string;
  source: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime?: string;
  endTime?: string;
  propertiesFound: number;
  error?: string;
  progress: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface SearchFilters {
  sortBy: 'price' | 'pricePerM2' | 'area' | 'score' | 'date';
  sortOrder: 'asc' | 'desc';
  sources: string[];
  neighborhoods: string[];
  amenities: string[];
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

export interface SavedSearch {
  _id?: string;
  name: string;
  criteria: SearchCriteria;
  alertEnabled: boolean;
  createdAt: string;
}

export interface Alert {
  _id?: string;
  searchCriteria: SearchCriteria;
  name: string;
  isActive: boolean;
  frequency: 'immediate' | 'daily' | 'weekly';
  lastTriggered?: string;
  createdAt: string;
}

export interface User {
  _id?: string;
  email: string;
  name: string;
  preferences?: SearchCriteria;
  savedSearches: SavedSearch[];
  favorites: string[];
  createdAt: string;
  lastLogin?: string;
}
