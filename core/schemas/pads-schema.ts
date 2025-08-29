import { ProviderSchema, WebSearchCriteria, StandardProperty } from './base-provider-schema';

/**
 * PADS Provider Schema
 * URL: https://www.pads.com
 */
export const PadsSchema: ProviderSchema = {
  id: 'pads',
  name: 'PADS',
  
  inputMapping: {
    supportsUrlFiltering: true,
    supportedFilters: ['operation', 'propertyTypes', 'location.city'],
    urlBuilder: (criteria: WebSearchCriteria) => {
      // PADS Colombia - use discovered URL structure
      const operation = criteria.operation === 'arriendo' ? 'inmuebles-en-arriendo' : 'inmuebles-en-venta';

      return `https://pads.com.co/${operation}`;
    },
    requiresPostFiltering: ['minRooms', 'maxRooms', 'minBathrooms', 'maxBathrooms', 'minArea', 'maxArea', 'minPrice', 'maxPrice', 'minParking', 'maxParking', 'neighborhoods', 'amenities']
  },
  
  extraction: {
    method: 'puppeteer',
    selectors: {
      propertyCard: '.listings-grid',
      title: [
        '.property-title',
        '.listing-title',
        '.apartment-title',
        'h3',
        'h4',
        '.title',
        '[class*="titulo"]'
      ],
      price: [
        '.price',
        '.rent',
        '.precio',
        '.listing-price',
        '.property-price',
        '[class*="price"]',
        '[class*="rent"]'
      ],
      area: [
        '.area',
        '.sqft',
        '.superficie',
        '.size',
        '.square-feet',
        '[class*="area"]',
        '[class*="sqft"]'
      ],
      rooms: [
        '.rooms',
        '.bedrooms',
        '.habitaciones',
        '.bed',
        '[class*="bedroom"]',
        '[class*="room"]'
      ],
      bathrooms: [
        '.bathrooms',
        '.bath',
        '.baños',
        '.banos',
        '[class*="bathroom"]',
        '[class*="bath"]'
      ],
      parking: [
        '.parking',
        '.garage',
        '.parqueadero',
        '.garaje',
        '[class*="parking"]',
        '[class*="garage"]'
      ],
      location: [
        '.location',
        '.address',
        '.ubicacion',
        '.direccion',
        '.neighborhood',
        '[class*="location"]',
        '[class*="address"]'
      ],
      images: [
        '.property-image img',
        '.listing-image img',
        '.apartment-image img',
        'img',
        '[class*="imagen"] img'
      ],
      link: [
        'a[href*="/propiedades/"]',
        'a',
        '[class*="link"]'
      ],
      nextPage: [
        '.pagination .next',
        '.siguiente',
        '[aria-label*="next"]',
        '.pager .next'
      ]
    },
    regexPatterns: {
      price: [
        /COP\s*([\d.,]+)/gi,
        /\$\s*[\d,\.]+/g,
        /[\d,\.]+\s*\/month/gi
      ],
      area: [
        /(\d+)\s*m2/gi,
        /(\d+)\s*m[²2]/gi,
        /(\d+)\s*metros/gi
      ],
      rooms: [
        /(\d+)\s*Alc\./gi,
        /(\d+)\s*(?:habitacion|alcoba)s?/gi,
        /(\d+)\s*(?:bed|bedroom)s?/gi
      ],
      bathrooms: [
        /(\d+)\s*(?:baño|baños)s?/gi,
        /(\d+)\s*(?:bath|bathroom)s?/gi,
        /(\d+)\s*ba/gi
      ],
      parking: [
        /Parq\.\s*(\d+)/gi,
        /(\d+)\s*(?:parking|garage|parqueadero)s?/gi,
        /parking[:\s]*(\d+)/gi
      ],
      location: [
        /([^,]+),\s*Bogotá/gi,
        /(Bogotá[^C]*Colombia)/gi,
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
      'url': 'url'
    },
    transformations: {
      price: (value: any) => {
        if (!value) return 0;
        const priceStr = String(value).replace(/[^\d]/g, '');
        return parseInt(priceStr) || 0;
      },
      area: (value: any) => {
        if (!value) return 0;
        // Convert sqft to m2 if needed
        const areaStr = String(value).replace(/[^\d]/g, '');
        let area = parseInt(areaStr) || 0;
        // If area seems to be in sqft (>500), convert to m2
        if (area > 500) {
          area = Math.round(area * 0.092903); // sqft to m2
        }
        return area;
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
      source: 'PADS',
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
    requestsPerMinute: 15,
    delayBetweenRequests: 4000,
    maxConcurrentRequests: 1,
    timeoutMs: 60000,
    maxPages: 2
  }
};
