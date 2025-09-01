import axios from 'axios';
import { SearchCriteria, SearchResult } from '../types';
import { SERVER, FRONTEND, SEARCH } from '../config/constants';
import CacheService from './cacheService';

// 🚀 Exponer función global para limpiar cache
CacheService.exposeGlobalClearCache();

// Create axios instance for backend API - Dynamic detection
const isLocalhost = SERVER.LOCALHOST_HOSTNAMES.includes(window.location.hostname as any);
const isRailway = SERVER.RAILWAY_DOMAINS.some(domain => window.location.hostname.includes(domain));
const isDevelopment = process.env.NODE_ENV === 'development';

// Dynamic API URL detection
let apiBaseURL: string;
if (isLocalhost && isDevelopment) {
  // Local development - Backend runs on configured port
  apiBaseURL = FRONTEND.LOCAL_API_URL;
} else {
  // Production (Railway or any other deployment) - use relative path
  apiBaseURL = FRONTEND.PRODUCTION_API_URL;
}

console.log('🌐 Environment:', process.env.NODE_ENV);
console.log('🌐 Hostname:', window.location.hostname);
console.log('🌐 Is Localhost:', isLocalhost);
console.log('🌐 Is Railway:', isRailway);
console.log('🌐 Is Development:', isDevelopment);
console.log('🌐 Final API base URL:', apiBaseURL);

const apiClient = axios.create({
  baseURL: apiBaseURL,
  timeout: SERVER.TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for logging
apiClient.interceptors.request.use(
  (config) => {
    console.log(`🔗 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('❌ API Request Error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for logging
apiClient.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error(`❌ API Response Error: ${error.response?.status} ${error.config?.url}`, error.response?.data);
    return Promise.reject(error);
  }
);

export const searchAPI = {
  // Search properties using backend server with intelligent caching
  search: async (criteria: SearchCriteria, page: number = SEARCH.DEFAULT_PAGE, limit: number = SEARCH.DEFAULT_LIMIT): Promise<SearchResult> => {
    try {
      console.log('🚀🚀🚀 USANDO BACKEND CON CACHE INTELIGENTE 🚀🚀🚀');
      console.log('📋 CRITERIOS EXACTOS RECIBIDOS:', JSON.stringify(criteria, null, 2));

      // 🚀 VERIFICAR CACHE PRIMERO
      const cacheResult = CacheService.getCachedProperties(criteria);
      let useCache = false;
      let cachedProperties: any[] = [];

      if (cacheResult) {
        // 🔍 Verificar si el cache tiene resultados sospechosamente altos para búsquedas específicas
        const getLocationText = (loc: any): string => {
          if (typeof loc === 'string') return loc;
          if (loc?.neighborhoods?.[0]) return loc.neighborhoods[0];
          if (loc?.zones?.[0]) return loc.zones[0];
          return '';
        };
        const locationText = getLocationText(criteria.location);
        const isSpecificLocation = locationText.length > 0;
        const hasTooManyResults = cacheResult.cached.length > 500;

        if (isSpecificLocation && hasTooManyResults) {
          console.warn(`🚨 Cache sospechoso: ${cacheResult.cached.length} propiedades para "${locationText}" - Limpiando cache`);
          CacheService.clearCacheForCriteria(criteria);
        } else {
          console.log(`📦 Cache encontrado: ${cacheResult.cached.length} propiedades (${cacheResult.cacheAge}s)`);
          cachedProperties = cacheResult.cached;
          useCache = true;
        }
      }

      // 🚀 NORMALIZAR CRITERIOS ANTES DE ENVIAR
      const normalizedCriteria = {
        ...criteria,
        // 🔧 CONVERTIR UBICACIÓN A MINÚSCULAS AUTOMÁTICAMENTE
        location: typeof (criteria as any).location === 'string'
          ? (criteria as any).location.toLowerCase().trim()
          : (criteria as any).location
      };

      console.log('🔧 Criterios normalizados:', normalizedCriteria);

      // 🚀 EJECUTAR BÚSQUEDA EN BACKEND
      const response = await apiClient.post('/search', {
        criteria: normalizedCriteria,
        page: page,
        limit: limit
      });

      console.log(`📊 Backend response:`, response.data);

      if (response.data.success) {
        const backendResult = response.data.data;
        const newProperties = backendResult.properties || [];

        console.log(`📊 Loaded ${newProperties.length} properties from backend`);

        let finalProperties = newProperties;
        let hasNewItems = false;
        let totalNewItems = 0;

        // 🔍 COMPARAR CON CACHE SI EXISTE
        if (useCache && cachedProperties.length > 0) {
          const comparison = CacheService.compareWithCache(newProperties, cachedProperties);

          if (comparison.totalNew > 0) {
            console.log(`🆕 Found ${comparison.totalNew} new properties!`);
            // Combinar: nuevos primero, luego existentes
            finalProperties = [...comparison.newItems, ...comparison.existingItems];
            hasNewItems = true;
            totalNewItems = comparison.totalNew;
          } else {
            console.log(`♻️ No new properties found, using fresh data`);
            finalProperties = newProperties;
          }
        }

        // 💾 GUARDAR EN CACHE (siempre actualizar)
        CacheService.setCachedProperties(normalizedCriteria, newProperties);

        return {
          properties: finalProperties,
          total: backendResult.total || finalProperties.length,
          page: page,
          limit: limit,
          filters: criteria,
          summary: backendResult.summary,
          // 🆕 Metadata de cache
          cacheInfo: {
            wasFromCache: useCache,
            hasNewItems,
            totalNewItems,
            cacheAge: cacheResult?.cacheAge || 0
          }
        };
      } else {
        throw new Error(response.data.error || 'Backend search failed');
      }
    } catch (error) {
      console.error('❌ Backend search failed:', error);

      // Check if it's a CORS error or network error
      if ((error as any).code === 'ERR_NETWORK' || (error as any).message === 'Network Error') {
        console.warn('⚠️ CORS/Network error detected - Backend may be starting or CORS not configured');
      }

      // Return empty result if backend fails but allow UI to continue
      return {
        properties: [],
        total: 0,
        page: page,
        limit: limit,
        filters: criteria,
        summary: {
          averagePrice: 0,
          averagePricePerM2: 0,
          averageArea: 0,
          sourceBreakdown: {}
        }
      };
    }
  },

  // Get sources
  getSources: async () => {
    try {
      const response = await apiClient.get('/search/sources');
      return response.data;
    } catch (error) {
      console.error('Error getting sources:', error);
      return { success: false, data: [] };
    }
  },

  // Get single property by ID
  getProperty: async (id: string) => {
    try {
      const response = await apiClient.get(`/properties/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error getting property:', error);
      // Return mock property for now
      return {
        id,
        title: 'Propiedad no encontrada',
        price: 0,
        adminFee: 0,
        totalPrice: 0,
        area: 0,
        rooms: 0,
        bathrooms: 0,
        parking: 0,
        location: {
          address: '',
          neighborhood: '',
          city: 'Bogotá',
          coordinates: { lat: 0, lng: 0 }
        },
        amenities: [],
        images: [],
        url: '',
        source: 'Unknown',
        scrapedDate: new Date().toISOString(),
        pricePerM2: 0,
        description: 'Propiedad no disponible',
        isActive: false
      };
    }
  },

  // Get similar properties
  getSimilarProperties: async (id: string, limit: number = 4) => {
    try {
      const response = await apiClient.get(`/properties/${id}/similar?limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error('Error getting similar properties:', error);
      // Return empty array for now
      return [];
    }
  }
};

// Export the search API
export default searchAPI;

// Also export as named export for compatibility
export const api = searchAPI;
