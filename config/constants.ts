/**
 * CENTRALIZED CONSTANTS FOR AI ARRIENDO PROJECT
 * 
 * This file contains all hardcoded values, magic numbers, and configuration
 * constants used throughout the project to eliminate duplication and improve
 * maintainability.
 */

// ============================================================================
// APPLICATION CONSTANTS
// ============================================================================

export const APP = {
  NAME: 'AI Arriendo Pro',
  VERSION: '3.0.0',
  DESCRIPTION: 'Encuentra tu hogar ideal con inteligencia artificial',
} as const;

// ============================================================================
// SERVER & API CONSTANTS
// ============================================================================

export const SERVER = {
  DEFAULT_PORT: 8080,
  HOST: '0.0.0.0',
  TIMEOUT_MS: 150000, // 150 seconds
  
  // API Endpoints
  ENDPOINTS: {
    SEARCH: '/search',
    SOURCES: '/search/sources',
    HEALTH: '/api/health',
    DASHBOARD: '/api/dashboard/stats',
  },
  
  // Environment detection
  LOCALHOST_HOSTNAMES: ['localhost', '127.0.0.1'],
  RAILWAY_DOMAINS: ['railway.app', 'up.railway.app'],
} as const;

// ============================================================================
// SEARCH & PAGINATION CONSTANTS
// ============================================================================

export const SEARCH = {
  // Pagination
  DEFAULT_LIMIT: 10000,
  MAX_LIMIT: 10000,
  DEFAULT_PAGE: 1,
  
  // Timeouts
  EXECUTION_TIMEOUT_MS: 180000, // 3 minutes
  
  // Special characters for "search all"
  SPECIAL_CHARS: ['*', '.', '?', '+', '!', '@', '#', '$', '%', '^', '&'],
  
  // Default property type
  DEFAULT_PROPERTY_TYPE: 'Apartamento',
} as const;

// ============================================================================
// SCRAPING CONSTANTS
// ============================================================================

export const SCRAPING = {
  // Global limits
  MAX_PAGES_PER_SOURCE: 5, // Aumentado para pruebas
  TIMEOUT_PER_SOURCE_MS: 120000, // 2 minutos - aumentado para más páginas
  MAX_CONCURRENT_SOURCES: 8,

  // Rate limiting defaults
  DEFAULT_REQUESTS_PER_MINUTE: 20,
  DEFAULT_DELAY_BETWEEN_REQUESTS: 3000, // 3 seconds
  DEFAULT_MAX_CONCURRENT_REQUESTS: 1,

  // Browser settings
  BROWSER_TIMEOUT_MS: 60000, // 60 seconds
  BROWSER_USER_AGENT: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',

  // ============================================================================
  // RATE LIMITS POR SCRAPER - CONFIGURACIÓN CENTRALIZADA
  // ============================================================================
  RATE_LIMITS: {
    fincaraiz: {
      requestsPerMinute: 30,
      delayBetweenRequests: 2000,
      maxConcurrentRequests: 2
    },
    metrocuadrado: {
      requestsPerMinute: 25,
      delayBetweenRequests: 2500,
      maxConcurrentRequests: 2
    },
    trovit: {
      requestsPerMinute: 20,
      delayBetweenRequests: 3000,
      maxConcurrentRequests: 1
    },
    arriendo: {
      requestsPerMinute: 25,
      delayBetweenRequests: 2500,
      maxConcurrentRequests: 2
    },
    ciencuadras: {
      requestsPerMinute: 20,
      delayBetweenRequests: 3000,
      maxConcurrentRequests: 1
    },
    mercadolibre: {
      requestsPerMinute: 20,
      delayBetweenRequests: 3000,
      maxConcurrentRequests: 1
    },
    properati: {
      requestsPerMinute: 30,
      delayBetweenRequests: 2000,
      maxConcurrentRequests: 2
    },
    pads: {
      requestsPerMinute: 20,
      delayBetweenRequests: 3000,
      maxConcurrentRequests: 1
    },
    rentola: {
      requestsPerMinute: 15,
      delayBetweenRequests: 4000,
      maxConcurrentRequests: 1
    }
  },

  // ============================================================================
  // HEADERS CENTRALIZADOS
  // ============================================================================
  DEFAULT_HEADERS: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  },
  CUSTOM_HEADERS: {
    trovit: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'es-CO,es;q=0.9,en;q=0.8'
    }
  }
} as const;

// ============================================================================
// LOCATION CONSTANTS
// ============================================================================

export const LOCATION = {
  DEFAULT_COUNTRY: 'Colombia',
  DEFAULT_COORDINATES: { lat: 0, lng: 0 },
} as const;

// ============================================================================
// PROPERTY DEFAULTS
// ============================================================================

export const PROPERTY_DEFAULTS = {
  // Rooms & Bathrooms
  MIN_ROOMS: 1,
  MAX_ROOMS: 10,
  MIN_BATHROOMS: 1,
  MAX_BATHROOMS: 10,
  
  // Area (square meters)
  MIN_AREA: 20,
  MAX_AREA: 500,
  
  // Price (Colombian Pesos)
  MIN_PRICE: 100000,
  MAX_PRICE: 20000000, // 20 million COP
  
  // Parking
  MIN_PARKING: 0,
  MAX_PARKING: 10,
  
  // Stratum (Colombian socioeconomic classification)
  MIN_STRATUM: 1,
  MAX_STRATUM: 6,
  
  // Other
  ALLOW_ADMIN_OVERAGE: true,
  IS_ACTIVE: true,
} as const;

// ============================================================================
// SOURCE-SPECIFIC PERFORMANCE SETTINGS
// ============================================================================

export const SOURCE_PERFORMANCE = {
  fincaraiz: {
    requestsPerMinute: 30,
    delayBetweenRequests: 2000,
    maxConcurrentRequests: 2,
    timeoutMs: 60000,
    maxPages: 3,
  },
  metrocuadrado: {
    requestsPerMinute: 25,
    delayBetweenRequests: 2500,
    maxConcurrentRequests: 2,
    timeoutMs: 60000,
    maxPages: 4,
  },
  mercadolibre: {
    requestsPerMinute: 20,
    delayBetweenRequests: 3000,
    maxConcurrentRequests: 1,
    timeoutMs: 70000,
    maxPages: 3,
  },
  ciencuadras: {
    requestsPerMinute: 25,
    delayBetweenRequests: 2500,
    maxConcurrentRequests: 2,
    timeoutMs: 45000,
    maxPages: 4,
  },
  properati: {
    requestsPerMinute: 20,
    delayBetweenRequests: 3000,
    maxConcurrentRequests: 1,
    timeoutMs: 50000,
    maxPages: 3,
  },
  trovit: {
    requestsPerMinute: 20,
    delayBetweenRequests: 3000,
    maxConcurrentRequests: 1,
    timeoutMs: 45000,
    maxPages: 3,
  },
  pads: {
    requestsPerMinute: 15,
    delayBetweenRequests: 4000,
    maxConcurrentRequests: 1,
    timeoutMs: 60000,
    maxPages: 2,
  },
  rentola: {
    requestsPerMinute: 25,
    delayBetweenRequests: 2500,
    maxConcurrentRequests: 2,
    timeoutMs: 50000,
    maxPages: 3,
  },
} as const;

// ============================================================================
// RATE LIMITING CONSTANTS
// ============================================================================

export const RATE_LIMIT = {
  // API Rate limiting
  MAX_REQUESTS: 100,
  WINDOW_MS: 900000, // 15 minutes in milliseconds
  BLOCK_DURATION_SECONDS: 60, // 1 minute
  
  // Redis key prefix
  KEY_PREFIX: 'rl_api',
} as const;

// ============================================================================
// DATABASE CONSTANTS
// ============================================================================

export const DATABASE = {
  // MongoDB connection
  DEFAULT_URI: 'mongodb://localhost:27017/ai-arriendo',
  CONNECTION_TIMEOUT_MS: 10000,
  
  // Redis
  REDIS_KEY_PREFIX: 'ai-arriendo:',
  CACHE_TIMEOUT_SECONDS: 3600, // 1 hour
} as const;

// ============================================================================
// SCORING & PREFERENCES CONSTANTS
// ============================================================================

export const SCORING = {
  // Default preference weights
  DEFAULT_WEIGHTS: {
    wetAreas: 1.0,
    sports: 1.0,
    amenities: 0.8,
    location: 0.6,
    pricePerM2: 0.4,
  },
  
  // Penalties
  PENALTIES: {
    priceOverBudget: 0.5,
    areaUnderMinimum: 0.3,
    locationMismatch: 0.2,
  },
} as const;

// ============================================================================
// FRONTEND CONSTANTS
// ============================================================================

export const FRONTEND = {
  // Development detection
  DEVELOPMENT_PORTS: [3000, 3001],
  
  // API URLs
  LOCAL_API_URL: 'http://localhost:8080/api',
  PRODUCTION_API_URL: '/api',
  
  // UI Constants
  RESULTS_PER_PAGE: 20,
  SEARCH_DEBOUNCE_MS: 300,
} as const;

// ============================================================================
// LOGGING CONSTANTS
// ============================================================================

export const LOGGING = {
  // Log levels
  LEVELS: ['error', 'warn', 'info', 'debug'] as const,
  
  // Service name
  SERVICE_NAME: 'ai-arriendo',
} as const;

// ============================================================================
// VALIDATION CONSTANTS
// ============================================================================

export const VALIDATION = {
  // String lengths
  MIN_SEARCH_QUERY_LENGTH: 2,
  MAX_SEARCH_QUERY_LENGTH: 100,
  
  // Numeric ranges
  MIN_VALID_PRICE: 1,
  MAX_VALID_PRICE: 100000000, // 100 million COP
  MIN_VALID_AREA: 1,
  MAX_VALID_AREA: 2000, // 2000 m²
} as const;
