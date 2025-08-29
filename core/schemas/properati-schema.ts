import { ProviderSchema, WebSearchCriteria, StandardProperty } from './base-provider-schema';

/**
 * Properati Provider Schema
 * URL: https://www.properati.com.co/bogota/arriendo/apartamento
 */
export const ProperatiSchema: ProviderSchema = {
  id: 'properati',
  name: 'Properati',
  
  inputMapping: {
    supportsUrlFiltering: false,
    supportedFilters: ['operation', 'propertyTypes', 'location.city'],
    urlBuilder: (criteria: WebSearchCriteria) => {
      const operation = criteria.operation === 'arriendo' ? 'arriendo' : 'venta';
      const propertyType = criteria.propertyTypes?.[0]?.toLowerCase() === 'apartamento' ? 'apartamento' : 'casa';
      return `https://www.properati.com.co/s/bogota-d-c-colombia/${propertyType}/${operation}`;
    },
    requiresPostFiltering: ['minRooms', 'maxRooms', 'minBathrooms', 'maxBathrooms', 'minArea', 'maxArea', 'minPrice', 'maxPrice', 'minParking', 'maxParking', 'neighborhoods', 'amenities']
  },
  
  extraction: {
    method: 'axios',
    selectors: {
      propertyCard: '.listings .item, .listings [data-url], .property-item, [class*="listing"]',
      title: [
        '.property-title',
        '.listing-title',
        '.card-title',
        'h3',
        'h4',
        '.title',
        '[class*="titulo"]'
      ],
      price: [
        '.price',
        '.precio',
        '.listing-price',
        '.property-price',
        '.card-price',
        '[class*="price"]',
        '[class*="precio"]'
      ],
      area: [
        '.area',
        '.superficie',
        '.m2',
        '.metros',
        '.size',
        '[class*="area"]',
        '[class*="superficie"]'
      ],
      rooms: [
        '.rooms',
        '.habitaciones',
        '.alcobas',
        '.bedrooms',
        '[class*="habitacion"]',
        '[class*="alcoba"]',
        '[class*="room"]'
      ],
      bathrooms: [
        '.bathrooms',
        '.baños',
        '.banos',
        '[class*="baño"]',
        '[class*="bathroom"]'
      ],
      parking: [
        '.parking',
        '.parqueadero',
        '.garaje',
        '[class*="parking"]',
        '[class*="parqueadero"]'
      ],
      location: [
        '.location',
        '.ubicacion',
        '.direccion',
        '.address',
        '.barrio',
        '.neighborhood',
        '[class*="ubicacion"]'
      ],
      images: [
        '.property-image img',
        '.listing-image img',
        '.card-image img',
        'img',
        '[class*="imagen"] img'
      ],
      link: [
        '[data-url]',
        'a.title',
        'a[href*="/detalle/"]',
        'a.property-link',
        'a'
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
        /precio[:\s]*\$?[\d,\.]+/gi,
        /USD\s*[\d,\.]+/gi
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
        /alcobas[:\s]*(\d+)/gi,
        /bedrooms[:\s]*(\d+)/gi
      ],
      bathrooms: [
        /(\d+)\s*(?:baño|baños|bathroom)s?/gi,
        /baños[:\s]*(\d+)/gi,
        /bathrooms[:\s]*(\d+)/gi
      ],
      parking: [
        /(\d+)\s*(?:parqueadero|garaje|parking)s?/gi,
        /parqueaderos[:\s]*(\d+)/gi,
        /parking[:\s]*(\d+)/gi
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
      'location': 'address',
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
      source: 'Properati',
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
    timeoutMs: 50000,
    maxPages: 3
  }
};
