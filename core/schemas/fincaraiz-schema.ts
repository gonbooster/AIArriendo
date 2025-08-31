import { ProviderSchema, WebSearchCriteria, StandardProperty } from './base-provider-schema';

/**
 * Fincaraiz Provider Schema
 * URL: https://www.fincaraiz.com.co/arriendo/apartamento/{city} (dynamic)
 */
export const FincaraizSchema: ProviderSchema = {
  id: 'fincaraiz',
  name: 'Fincaraiz',
  
  inputMapping: {
    supportsUrlFiltering: true,
    supportedFilters: ['operation', 'propertyTypes', 'minRooms', 'maxRooms', 'minArea', 'maxArea', 'maxPrice', 'location.city'],
    urlBuilder: (criteria: WebSearchCriteria) => {
      const params = new URLSearchParams({
        'ad_type': criteria.operation === 'arriendo' ? '2' : '1',
        'property_type': '1', // apartamento
        'city': 'dynamic', // Will be set by LocationDetector
        'min_rooms': (criteria.minRooms || 1).toString(),
        'max_rooms': (criteria.maxRooms || criteria.minRooms! + 2 || 6).toString(),
        'min_area': (criteria.minArea || 30).toString(),
        'max_area': (criteria.maxArea || criteria.minArea! + 50 || 200).toString(),
        'max_price': (criteria.maxPrice || 10000000).toString(),
        'currency': 'COP'
      });
      // DEPRECATED: Use dynamic URL generation in FincaraizScraper instead
      return `https://www.fincaraiz.com.co/${criteria.operation}/apartamento?${params}`;
    },
    requiresPostFiltering: ['minPrice', 'minBathrooms', 'maxBathrooms', 'minParking', 'maxParking', 'neighborhoods', 'amenities', 'minRooms', 'maxRooms', 'minArea', 'maxArea', 'location.city']
  },
  
  extraction: {
    method: 'puppeteer',
    selectors: {
      propertyCard: '.listingCard, .listingsWrapper',
      title: [
        'h2',
        '[class*="title"]',
        '.property-title',
        '.listing-title',
        'h3',
        'h4'
      ],
      price: [
        '[class*="price"]',
        '.price',
        '.precio',
        '.listing-price',
        '.valor'
      ],
      area: [
        '[data-testid="property-area"]',
        '.area',
        '.superficie',
        '.m2',
        '[class*="area"]',
        '[class*="superficie"]'
      ],
      rooms: [
        '[data-testid="property-rooms"]',
        '.rooms',
        '.habitaciones',
        '.alcobas',
        '.bedrooms',
        '[class*="habitacion"]'
      ],
      bathrooms: [
        '[data-testid="property-bathrooms"]',
        '.bathrooms',
        '.baños',
        '.banos',
        '[class*="baño"]'
      ],
      parking: [
        '.parking',
        '.parqueadero',
        '.garaje',
        '[class*="parking"]'
      ],
      location: [
        '[data-testid="property-location"]',
        '.location',
        '.ubicacion',
        '.direccion',
        '.address',
        '[class*="ubicacion"]'
      ],
      images: [
        '[data-testid="property-image"] img',
        '.property-image img',
        '.listing-image img',
        '.MuiCardMedia-img',
        'img'
      ],
      link: [
        'a[href*="/inmueble/"]',
        'a[href*="/propiedad/"]',
        'a[href*="fincaraiz.com"]',
        'a',
        '.property-link',
        '.listing-link'
      ],
      nextPage: [
        '.pagination .next',
        '[aria-label="Next"]',
        '.siguiente',
        '.MuiPagination-item[aria-label*="next"]'
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
        /área[:\s]*(\d+)/gi
      ],
      rooms: [
        /(\d+)\s*(?:hab|habitacion|alcoba|dormitorio)s?/gi,
        /habitaciones[:\s]*(\d+)/gi
      ],
      bathrooms: [
        /(\d+)\s*(?:baño|baños|bathroom)s?/gi,
        /baños[:\s]*(\d+)/gi
      ],
      parking: [
        /(\d+)\s*(?:parqueadero|garaje|parking)s?/gi,
        /parqueaderos[:\s]*(\d+)/gi,
        /garajes[:\s]*(\d+)/gi
      ],
      location: [
        // DEPRECATED: Use LocationDetector for dynamic city detection
        /en\s+([^,]+),\s*([a-záéíóúñü\s]+)/gi,
        /([a-záéíóúñü\s]+),?\s*([a-záéíóúñü\s]+)/gi
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
        // Handle multiple price formats and clean up
        let priceStr = String(value);
        // Remove currency symbols and extra text
        priceStr = priceStr.replace(/\$|COP|pesos?/gi, '');
        // Extract first valid price number (handle cases like "5.120.000.680.000")
        const matches = priceStr.match(/[\d,\.]+/g);
        if (matches && matches.length > 0) {
          // Take the first reasonable price (not too long)
          const firstPrice = matches.find(m => m.replace(/[,\.]/g, '').length <= 10);
          if (firstPrice) {
            const cleanPrice = firstPrice.replace(/[^\d]/g, '');
            return parseInt(cleanPrice) || 0;
          }
        }
        return 0;
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
      source: 'Fincaraiz',
      location: {
        city: 'Dynamic', // Will be set by LocationDetector
        address: '',
        neighborhood: '',
        coordinates: { lat: 0, lng: 0 }
      },
      amenities: [],
      isActive: true
    }
  },
  
  performance: {
    requestsPerMinute: 30,
    delayBetweenRequests: 2000,
    maxConcurrentRequests: 2,
    timeoutMs: 45000,
    maxPages: 5
  }
};
