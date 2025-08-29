import { ProviderSchema, WebSearchCriteria, StandardProperty } from './base-provider-schema';

/**
 * Trovit Provider Schema
 * URL: https://casas.trovit.com.co/arriendo-apartamento-bogota
 */
export const TrovitSchema: ProviderSchema = {
  id: 'trovit',
  name: 'Trovit',
  
  inputMapping: {
    supportsUrlFiltering: true,
    supportedFilters: ['operation', 'propertyTypes', 'location.city', 'minRooms', 'minArea', 'maxPrice'],
    urlBuilder: (criteria: WebSearchCriteria) => {
      const operation = criteria.operation === 'arriendo' ? 'arriendo' : 'venta';
      const baseUrl = `https://casas.trovit.com.co/${operation}-apartamento-bogota`;
      
      const params = new URLSearchParams();
      
      if (criteria.minRooms) {
        params.append('min_rooms', criteria.minRooms.toString());
      }
      
      if (criteria.minArea) {
        params.append('min_size', criteria.minArea.toString());
      }
      
      if (criteria.maxPrice) {
        params.append('max_price', criteria.maxPrice.toString());
      }
      
      params.append('what', 'apartamento');
      params.append('where', 'bogota');
      
      return params.toString() ? `${baseUrl}?${params}` : baseUrl;
    },
    requiresPostFiltering: ['maxRooms', 'minBathrooms', 'maxBathrooms', 'maxArea', 'minPrice', 'minParking', 'maxParking', 'neighborhoods', 'amenities']
  },
  
  extraction: {
    method: 'puppeteer',
    selectors: {
      propertyCard: '.js-listing, article.snippet-listing, .snippet-listing',
      title: [
        '.item_title',
        '.js-item-title',
        '.listing-title',
        'h3',
        'h4',
        '.title',
        '[class*="titulo"]'
      ],
      price: [
        '.item_price',
        '.price',
        '.precio',
        '[class*="price"]',
        '[class*="precio"]'
      ],
      area: [
        '.item_surface',
        '.surface',
        '.area',
        '.superficie',
        '.m2',
        '[class*="area"]',
        '[class*="superficie"]'
      ],
      rooms: [
        '.item_rooms',
        '.rooms',
        '.habitaciones',
        '.alcobas',
        '[class*="habitacion"]',
        '[class*="room"]'
      ],
      bathrooms: [
        '.item_bathrooms',
        '.bathrooms',
        '.baños',
        '.banos',
        '[class*="baño"]',
        '[class*="bathroom"]'
      ],
      parking: [
        '.item_parking',
        '.parking',
        '.parqueadero',
        '.garaje',
        '[class*="parking"]'
      ],
      location: [
        '.item_location',
        '.location',
        '.ubicacion',
        '.direccion',
        '.address',
        '[class*="ubicacion"]'
      ],
      images: [
        '.item_image img',
        '.listing-image img',
        'img',
        '[class*="imagen"] img'
      ],
      link: [
        '.item_link',
        'a',
        '.listing-link',
        '[class*="link"]'
      ],
      nextPage: [
        '.pagination .next',
        '.js-pagination-next',
        '.siguiente',
        '[aria-label*="siguiente"]'
      ]
    },
    regexPatterns: {
      price: [
        /\$\s*[\d,\.]+/g,
        /[\d,\.]+\s*pesos/gi,
        /precio[:\s]*\$?[\d,\.]+/gi,
        /EUR\s*[\d,\.]+/gi
      ],
      area: [
        /(\d+)\s*m[²2]/gi,
        /(\d+)\s*metros/gi,
        /área[:\s]*(\d+)/gi,
        /superficie[:\s]*(\d+)/gi
      ],
      rooms: [
        /(\d+)\s*(?:hab|habitacion|alcoba|dormitorio)s?/gi,
        /habitaciones[:\s]*(\d+)/gi,
        /rooms[:\s]*(\d+)/gi
      ],
      bathrooms: [
        /(\d+)\s*(?:baño|baños|bathroom)s?/gi,
        /baños[:\s]*(\d+)/gi,
        /bathrooms[:\s]*(\d+)/gi
      ],
      parking: [
        /(\d+)\s*(?:parqueadero|garaje|parking)s?/gi,
        /parking[:\s]*(\d+)/gi
      ],
      location: [
        /en\s+([^,]+),\s*bogotá/gi,
        /([a-záéíóúñü\s]+),?\s*bogotá/gi
      ]
    }
  },
  
  outputMapping: {
    fieldMappings: {
      'title': 'title',
      'priceText': 'price',
      'areaText': 'area',
      'roomsText': 'rooms',
      'bathroomsText': 'bathrooms',
      'parkingText': 'parking',
      'location': 'location.address',
      'imageUrl': 'images',
      'link': 'url'
    },
    transformations: {
      price: (value: any) => {
        if (!value) return 0;
        const priceStr = String(value).replace(/[^\d]/g, '');
        return parseInt(priceStr) || 0;
      },
      area: (value: any) => {
        if (!value) return 0;
        const areaStr = String(value).replace(/[^\d]/g, '');
        return parseInt(areaStr) || 0;
      },
      rooms: (value: any) => {
        if (!value) return 0;
        const roomsStr = String(value).replace(/[^\d]/g, '');
        return parseInt(roomsStr) || 0;
      },
      bathrooms: (value: any) => {
        if (!value) return 0;
        const bathStr = String(value).replace(/[^\d]/g, '');
        return parseInt(bathStr) || 0;
      },
      parking: (value: any) => {
        if (!value) return 0;
        const parkingStr = String(value).replace(/[^\d]/g, '');
        return parseInt(parkingStr) || 0;
      },
      images: (value: any) => {
        if (!value) return [];
        return Array.isArray(value) ? value : [value];
      }
    },
    defaults: {
      propertyType: 'Apartamento',
      source: 'Trovit',
      location: {
        city: 'Bogotá',
        address: '',
        neighborhood: '',
        coordinates: { lat: 0, lng: 0 }
      },
      amenities: [],
      isActive: true
    }
  },
  
  performance: {
    requestsPerMinute: 20,
    delayBetweenRequests: 3000,
    maxConcurrentRequests: 1,
    timeoutMs: 45000,
    maxPages: 3
  }
};
