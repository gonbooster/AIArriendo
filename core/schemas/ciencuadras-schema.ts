import { ProviderSchema, WebSearchCriteria, StandardProperty } from './base-provider-schema';

/**
 * Ciencuadras Provider Schema
 * URL: https://www.ciencuadras.com/arriendo/apartamento/bogota
 */
export const CiencuadrasSchema: ProviderSchema = {
  id: 'ciencuadras',
  name: 'Ciencuadras',
  
  inputMapping: {
    supportsUrlFiltering: false,
    supportedFilters: ['operation', 'propertyTypes', 'location.city'],
    urlBuilder: (criteria: WebSearchCriteria) => {
      const operation = criteria.operation === 'arriendo' ? 'arriendo' : 'venta';
      return `https://www.ciencuadras.com/${operation}/apartamento/bogota`;
    },
    requiresPostFiltering: ['minRooms', 'maxRooms', 'minBathrooms', 'maxBathrooms', 'minArea', 'maxArea', 'minPrice', 'maxPrice', 'minParking', 'maxParking', 'neighborhoods', 'amenities']
  },
  
  extraction: {
    method: 'axios',
    selectors: {
      propertyCard: '.card',
      title: [
        '.property-title',
        '.listing-title',
        '.inmueble-titulo',
        'h3',
        'h4',
        '.title',
        '[class*="titulo"]'
      ],
      price: [
        '.card__price',
        '.card__price-big',
        '[class*="price"]',
        '.price',
        '.precio'
      ],
      area: [
        '.area',
        '.superficie',
        '.m2',
        '.metros',
        '[class*="area"]',
        '[class*="superficie"]'
      ],
      rooms: [
        // No specific selectors - data is extracted from location text via regex
      ],
      bathrooms: [
        // No specific selectors - data is extracted from location text via regex
      ],
      parking: [
        // No specific selectors - data is extracted from location text via regex
      ],
      location: [
        '.location',
        '.ubicacion',
        '.direccion',
        '.address',
        '.barrio',
        '[class*="ubicacion"]'
      ],
      images: [
        '.property-image img',
        '.listing-image img',
        '.inmueble-foto img',
        'img',
        '[class*="imagen"] img'
      ],
      link: [
        // Ciencuadras does not provide direct links to individual properties
        // The cards are not clickable and don't contain href attributes
      ],
      nextPage: [
        '.pagination .next',
        '.siguiente',
        '[aria-label*="siguiente"]',
        '.pager .next'
      ]
    },
    regexPatterns: {
      price: [
        /\$\s*[\d,\.]+/g,
        /[\d,\.]+\s*pesos/gi,
        /precio[:\s]*\$?[\d,\.]+/gi
      ],
      area: [
        /(\d+(?:\.\d+)?)\s*m2/gi,
        /(\d+)\s*m[²2]/gi,
        /(\d+)\s*metros/gi,
        /área[:\s]*(\d+)/gi
      ],
      rooms: [
        /Habit\.\s*(\d+)/gi,
        /habitaciones[:\s]*(\d+)/gi,
        /(\d+)\s*habitacion/gi
      ],
      bathrooms: [
        /Baños\s*(\d+)/gi,
        /(\d+)\s*(?:baño|baños|bathroom)s?/gi,
        /baños[:\s]*(\d+)/gi
      ],
      parking: [
        /Garaje\s*(\d+)/gi,
        /(\d+)\s*(?:parqueadero|garaje|parking)s?/gi,
        /parqueaderos[:\s]*(\d+)/gi
      ],
      location: [
        /bogotá,\s*([^,]+(?:,\s*[^,]+)?)/gi,
        /([a-záéíóúñü\s]+),?\s*bogotá/gi
      ]
    }
  },
  
  outputMapping: {
    fieldMappings: {
      'title': 'title',
      'price': 'price',
      'area': 'area',
      'rooms': 'rooms',
      'bathrooms': 'bathrooms',
      'parking': 'parking',
      'location': 'address',
      'images': 'images',
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
        // Handle decimal numbers like "54.0"
        const areaStr = String(value).replace(/[^\d\.]/g, '');
        return Math.round(parseFloat(areaStr)) || 0;
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
      source: 'Ciencuadras',
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
    requestsPerMinute: 25,
    delayBetweenRequests: 2500,
    maxConcurrentRequests: 2,
    timeoutMs: 45000,
    maxPages: 4
  }
};
