/**
 * FRONTEND CONSTANTS
 * 
 * Subset of backend constants needed by the frontend
 * This file is synchronized with ../../config/constants.ts
 */

// ============================================================================
// SERVER & API CONSTANTS
// ============================================================================

export const SERVER = {
  DEFAULT_PORT: 8080,
  TIMEOUT_MS: 150000, // 150 seconds
  LOCALHOST_HOSTNAMES: ['localhost', '127.0.0.1'],
  RAILWAY_DOMAINS: ['railway.app', 'up.railway.app'],
} as const;

// ============================================================================
// SEARCH & PAGINATION CONSTANTS
// ============================================================================

export const SEARCH = {
  DEFAULT_LIMIT: 10000,
  DEFAULT_PAGE: 1,
  SPECIAL_CHARS: ['*', '.', '?', '+', '!', '@', '#', '$', '%', '^', '&'],
} as const;

// ============================================================================
// FRONTEND CONSTANTS
// ============================================================================

export const FRONTEND = {
  DEVELOPMENT_PORTS: [3000, 3001],
  LOCAL_API_URL: 'http://localhost:8080/api',
  PRODUCTION_API_URL: '/api',
  RESULTS_PER_PAGE: 20,
  SEARCH_DEBOUNCE_MS: 300,
} as const;

// ============================================================================
// PROPERTY DEFAULTS
// ============================================================================

export const PROPERTY_DEFAULTS = {
  MIN_ROOMS: 1,
  MAX_ROOMS: 10,
  MIN_BATHROOMS: 1,
  MAX_BATHROOMS: 10,
  MIN_AREA: 20,
  MAX_AREA: 500,
  MIN_PRICE: 100000,
  MAX_PRICE: 20000000, // 20 million COP
  MIN_PARKING: 0,
  MAX_PARKING: 10,
  MIN_STRATUM: 1,
  MAX_STRATUM: 6,
} as const;
