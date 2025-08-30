/**
 * URL CONSTANTS AND BUILDERS
 * 
 * Centralized URL management for all scraping sources and API endpoints
 */

import { LOCATION } from './constants';

// ============================================================================
// BASE URLS FOR SCRAPING SOURCES
// ============================================================================

export const BASE_URLS = {
  fincaraiz: 'https://www.fincaraiz.com.co',
  metrocuadrado: 'https://www.metrocuadrado.com',
  mercadolibre: 'https://inmuebles.mercadolibre.com.co',
  ciencuadras: 'https://www.ciencuadras.com',
  properati: 'https://www.properati.com.co',
  trovit: 'https://casas.trovit.com.co',
  pads: 'https://pads.com.co',
  rentola: 'https://rentola.com',
} as const;

// ============================================================================
// URL PATTERNS FOR SEARCH PAGES
// ============================================================================

export const URL_PATTERNS = {
  fincaraiz: {
    base: '/arriendo/apartamento/bogota',
    withNeighborhood: '/arriendo/apartamento/bogota/{neighborhood}',
    params: {
      adType: '2', // rent
      propertyType: '1', // apartment
      city: '11001', // Bogotá por defecto - será dinámico
      currency: 'COP',
      sort: 'relevance',
    },
  },
  
  metrocuadrado: {
    base: '/inmuebles/arriendo/apartamento/',
    withNeighborhood: '/inmuebles/arriendo/apartamento/{neighborhood}/',
    params: {
      search: 'form',
      orden: 'relevancia',
    },
  },
  
  mercadolibre: {
    base: '/apartamentos/arriendo/bogota',
    withNeighborhood: '/apartamentos/arriendo/bogota/{neighborhood}',
    pagination: '_Desde_{offset}',
  },
  
  ciencuadras: {
    base: '/arriendo/apartamento/bogota',
    withNeighborhood: '/arriendo/apartamento/bogota/{neighborhood}',
  },
  
  properati: {
    base: '/s/bogota-d-c-colombia/apartamento/arriendo',
    withNeighborhood: '/s/bogota-d-c-colombia/apartamento/arriendo?q={neighborhood}',
    pagination: '?page={page}',
  },
  
  trovit: {
    base: '/arriendo-apartamento-bogota',
    withNeighborhood: '/arriendo-apartamento-{neighborhood}-bogota',
    params: {
      what: 'apartamento+arriendo',
      where: 'bogota',
    },
    pagination: '&page={page}',
  },
  
  pads: {
    base: '/inmuebles-en-arriendo/bogota',
    withNeighborhood: '/inmuebles-en-arriendo/bogota/{neighborhood}',
    pagination: '?page={page}',
  },
  
  rentola: {
    base: '/for-rent/co/bogota',
    pagination: '?page={page}',
  },
} as const;

// ============================================================================
// URL BUILDERS
// ============================================================================

export class URLBuilder {
  /**
   * Build Fincaraiz search URL
   */
  static fincaraiz(neighborhood?: string, params?: Record<string, string>): string {
    const baseUrl = BASE_URLS.fincaraiz;
    const pattern = neighborhood 
      ? URL_PATTERNS.fincaraiz.withNeighborhood.replace('{neighborhood}', neighborhood)
      : URL_PATTERNS.fincaraiz.base;
    
    const searchParams = new URLSearchParams({
      ...URL_PATTERNS.fincaraiz.params,
      ...params,
    });
    
    return `${baseUrl}${pattern}?${searchParams}`;
  }

  /**
   * Build Metrocuadrado search URL
   */
  static metrocuadrado(neighborhood?: string, params?: Record<string, string>): string {
    const baseUrl = BASE_URLS.metrocuadrado;
    const pattern = neighborhood 
      ? URL_PATTERNS.metrocuadrado.withNeighborhood.replace('{neighborhood}', neighborhood)
      : URL_PATTERNS.metrocuadrado.base;
    
    const searchParams = new URLSearchParams({
      ...URL_PATTERNS.metrocuadrado.params,
      ...params,
    });
    
    return `${baseUrl}${pattern}?${searchParams}`;
  }

  /**
   * Build MercadoLibre search URL
   */
  static mercadolibre(neighborhood?: string, page?: number): string {
    const baseUrl = BASE_URLS.mercadolibre;
    const pattern = neighborhood 
      ? URL_PATTERNS.mercadolibre.withNeighborhood.replace('{neighborhood}', neighborhood)
      : URL_PATTERNS.mercadolibre.base;
    
    let url = `${baseUrl}${pattern}`;
    
    if (page && page > 1) {
      const offset = (page - 1) * 50 + 1; // MercadoLibre uses offset-based pagination
      url += URL_PATTERNS.mercadolibre.pagination.replace('{offset}', offset.toString());
    }
    
    return url;
  }

  /**
   * Build Ciencuadras search URL
   */
  static ciencuadras(neighborhood?: string): string {
    const baseUrl = BASE_URLS.ciencuadras;
    const pattern = neighborhood 
      ? URL_PATTERNS.ciencuadras.withNeighborhood.replace('{neighborhood}', neighborhood)
      : URL_PATTERNS.ciencuadras.base;
    
    return `${baseUrl}${pattern}`;
  }

  /**
   * Build Properati search URL
   */
  static properati(neighborhood?: string, page?: number): string {
    const baseUrl = BASE_URLS.properati;
    let url = neighborhood 
      ? URL_PATTERNS.properati.withNeighborhood.replace('{neighborhood}', neighborhood)
      : URL_PATTERNS.properati.base;
    
    if (page && page > 1) {
      const separator = url.includes('?') ? '&' : '?';
      url += `${separator}page=${page}`;
    }
    
    return `${baseUrl}${url}`;
  }

  /**
   * Build Trovit search URL
   */
  static trovit(neighborhood?: string, page?: number): string {
    const baseUrl = BASE_URLS.trovit;
    const pattern = neighborhood 
      ? URL_PATTERNS.trovit.withNeighborhood.replace('{neighborhood}', neighborhood)
      : URL_PATTERNS.trovit.base;
    
    const searchParams = new URLSearchParams(URL_PATTERNS.trovit.params);
    if (neighborhood) {
      searchParams.set('where', `${neighborhood}-bogota`);
    }
    if (page && page > 1) {
      searchParams.set('page', page.toString());
    }
    
    return `${baseUrl}${pattern}?${searchParams}`;
  }

  /**
   * Build PADS search URL
   */
  static pads(neighborhood?: string, page?: number): string {
    const baseUrl = BASE_URLS.pads;
    const pattern = neighborhood 
      ? URL_PATTERNS.pads.withNeighborhood.replace('{neighborhood}', neighborhood)
      : URL_PATTERNS.pads.base;
    
    let url = `${baseUrl}${pattern}`;
    
    if (page && page > 1) {
      url += URL_PATTERNS.pads.pagination.replace('{page}', page.toString());
    }
    
    return url;
  }

  /**
   * Build Rentola search URL
   */
  static rentola(page?: number): string {
    const baseUrl = BASE_URLS.rentola;
    let url = `${baseUrl}${URL_PATTERNS.rentola.base}`;
    
    if (page && page > 1) {
      url += URL_PATTERNS.rentola.pagination.replace('{page}', page.toString());
    }
    
    return url;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Normalize neighborhood name for URL usage
 */
export function normalizeNeighborhoodForUrl(neighborhood: string): string {
  return neighborhood
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[áàäâ]/g, 'a')
    .replace(/[éèëê]/g, 'e')
    .replace(/[íìïî]/g, 'i')
    .replace(/[óòöô]/g, 'o')
    .replace(/[úùüû]/g, 'u')
    .replace(/ñ/g, 'n')
    .replace(/[^a-z0-9-]/g, '');
}

/**
 * Get all base URLs as an array
 */
export function getAllBaseUrls(): string[] {
  return Object.values(BASE_URLS);
}

/**
 * Get source ID from URL
 */
export function getSourceIdFromUrl(url: string): string | null {
  for (const [sourceId, baseUrl] of Object.entries(BASE_URLS)) {
    if (url.includes(baseUrl)) {
      return sourceId;
    }
  }
  return null;
}
