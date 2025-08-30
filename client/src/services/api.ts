import axios from 'axios';
import { SearchCriteria, SearchResult } from '../types';
import { SERVER, FRONTEND, SEARCH } from '../config/constants';

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
  // Search properties using backend server
  search: async (criteria: SearchCriteria, page: number = SEARCH.DEFAULT_PAGE, limit: number = SEARCH.DEFAULT_LIMIT): Promise<SearchResult> => {
    try {
      console.log('🚀🚀🚀 USANDO BACKEND REPARADO - VERSIÓN NUEVA 🚀🚀🚀');
      console.log('📋 CRITERIOS EXACTOS RECIBIDOS:', JSON.stringify(criteria, null, 2));

      // Try main search endpoint first, fallback to static data
      let response;
      try {
        response = await apiClient.post('/search', {
          criteria: criteria,
          page: page,
          limit: limit
        });
      } catch (mainError) {
        console.warn('⚠️ Main search failed, trying static data fallback...');
        response = await apiClient.post('/search/static', {
          criteria: criteria,
          page: page,
          limit: limit
        });
      }
      
      console.log(`📊 Backend response:`, response.data);
      
      if (response.data.success) {
        const backendResult = response.data.data;
        console.log(`📊 Loaded ${backendResult.properties?.length || 0} properties from backend`);
        
        return {
          properties: backendResult.properties || [],
          total: backendResult.total || 0,
          page: page,
          limit: limit,
          filters: criteria,
          summary: backendResult.summary
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
        id: id,
        title: 'Apartamento en Chapinero',
        price: 2500000,
        area: 85,
        rooms: 3,
        bathrooms: 2,
        location: {
          address: 'Chapinero, Bogotá',
          neighborhood: 'Chapinero',
          city: 'Bogotá'
        },
        amenities: ['Gimnasio', 'Portería 24h'],
        description: 'Hermoso apartamento en Chapinero',
        images: ['/placeholder-property.svg'],
        source: 'Mock'
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
