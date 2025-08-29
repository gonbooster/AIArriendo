import { ProviderSchema, WebSearchCriteria, StandardProperty } from './base-provider-schema';

/**
 * Metrocuadrado Provider Schema
 * URL: https://www.metrocuadrado.com/apartamentos/arriendo/bogota/
 */
export const MetrocuadradoSchema: ProviderSchema = {
  id: 'metrocuadrado',
  name: 'Metrocuadrado',
  
  inputMapping: {
    supportsUrlFiltering: true,
    supportedFilters: ['operation', 'propertyTypes', 'minRooms', 'maxRooms', 'minArea', 'maxArea', 'maxPrice', 'location.city'],
    urlBuilder: (criteria: WebSearchCriteria) => {
      const baseUrl = `https://www.metrocuadrado.com/apartamentos/${criteria.operation}/bogota/`;
      const params = new URLSearchParams();
      
      if (criteria.minRooms || criteria.maxRooms) {
        const min = criteria.minRooms || 1;
        const max = criteria.maxRooms || min + 2;
        params.append('habitaciones', `${min}-${max}`);
      }
      
      if (criteria.minArea || criteria.maxArea) {
        const min = criteria.minArea || 30;
        const max = criteria.maxArea || min + 50;
        params.append('area', `${min}-${max}`);
      }
      
      if (criteria.maxPrice) {
        params.append('precio', `0-${criteria.maxPrice}`);
      }
      
      params.append('orden', 'relevancia');
      
      return params.toString() ? `${baseUrl}?${params}` : baseUrl;
    },
    requiresPostFiltering: ['minPrice', 'minBathrooms', 'maxBathrooms', 'minParking', 'maxParking', 'neighborhoods', 'amenities']
  },
  
  extraction: {
    method: 'puppeteer',
    selectors: {
      propertyCard: '.property-card__container, .property-card:not([class*="__"])',
      title: [
        '.property-card__content',
        '.property-card__detail',
        '.listing-title',
        '.property-title',
        'h3',
        'h4'
      ],
      price: [
        '.property-card__detail-price',
        '[class*="price"]',
        '.price',
        '.precio'
      ],
      area: [
        '.area',
        '.surface',
        '.superficie',
        '.metros',
        '.m2',
        '[class*="area"]',
        '[class*="superficie"]'
      ],
      rooms: [
        '.rooms',
        '.bedrooms',
        '.habitaciones',
        '.alcobas',
        '[class*="habitacion"]',
        '[class*="alcoba"]'
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
        '.address',
        '.ubicacion',
        '.direccion',
        '.barrio',
        '[class*="ubicacion"]'
      ],
      images: [
        '.property-card__image img',
        '.property-card__photo img',
        'img'
      ],
      link: [
        'a[href*="/inmueble/"]',
        '.property-card__container a',
        '.property-card__content a',
        'a'
      ],
      nextPage: [
        '.pagination .next',
        '.pager .next',
        '.siguiente',
        '[aria-label*="siguiente"]'
      ]
    },
    regexPatterns: {
      price: [
        /\$\s*[\d,\.]+/g,
        /[\d,\.]+\s*pesos/gi,
        /precio[:\s]*\$?[\d,\.]+/gi
      ],
      area: [
        /(\d+)\s*m[²2]/gi,
        /(\d+)\s*metros/gi,
        /área[:\s]*(\d+)/gi,
        /superficie[:\s]*(\d+)/gi,
        /(\d+)m2/gi,
        /(\d+)\s*M2/gi
      ],
      rooms: [
        /(\d+)\s*(?:hab|habitacion|alcoba|dormitorio)s?/gi,
        /habitaciones[:\s]*(\d+)/gi,
        /alcobas[:\s]*(\d+)/gi,
        /(\d+)\s*hab/gi,
        /(\d+)\s*Habitacion/gi
      ],
      bathrooms: [
        /(\d+)\s*(?:baño|baños|bathroom)s?/gi,
        /baños[:\s]*(\d+)/gi,
        /(\d+)\s*baño/gi,
        /(\d+)\s*Baño/gi
      ],
      title: [
        /Apartamento en Arriendo,\s*([^,]+)/gi,
        /en Arriendo,\s*([^,]+)/gi
      ],
      parking: [
        /(\d+)\s*(?:parqueadero|garaje|parking)s?/gi,
        /parqueaderos[:\s]*(\d+)/gi,
        /(\d+)\s*parq/gi
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
      },
      url: (value: any) => {
        if (!value) return '';
        const url = String(value);
        // Convert relative URLs to absolute
        if (url.startsWith('/')) {
          return `https://www.metrocuadrado.com${url}`;
        }
        return url;
      }
    },
    defaults: {
      propertyType: 'Apartamento',
      source: 'Metrocuadrado',
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
    timeoutMs: 60000,
    maxPages: 4
  }
};
