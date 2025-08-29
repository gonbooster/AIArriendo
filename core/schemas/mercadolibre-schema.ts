import { ProviderSchema, WebSearchCriteria, StandardProperty } from './base-provider-schema';

/**
 * MercadoLibre Provider Schema
 * URL: https://inmuebles.mercadolibre.com.co/apartamentos/arriendo/bogota/
 */
export const MercadoLibreSchema: ProviderSchema = {
  id: 'mercadolibre',
  name: 'MercadoLibre',
  
  inputMapping: {
    supportsUrlFiltering: false,
    supportedFilters: ['operation', 'propertyTypes', 'location.city'],
    urlBuilder: (criteria: WebSearchCriteria) => {
      const operation = criteria.operation === 'arriendo' ? 'arriendo' : 'venta';
      return `https://inmuebles.mercadolibre.com.co/apartamentos/${operation}/bogota/`;
    },
    requiresPostFiltering: ['minRooms', 'maxRooms', 'minBathrooms', 'maxBathrooms', 'minArea', 'maxArea', 'minPrice', 'maxPrice', 'minParking', 'maxParking', 'neighborhoods', 'amenities']
  },
  
  extraction: {
    method: 'puppeteer',
    selectors: {
      propertyCard: '.ui-search-layout__item, .ui-search-result__wrapper',
      title: [
        '.ui-search-item__title',
        '.ui-search-item-title',
        '.ui-search-result__content-wrapper h2',
        '.ui-search-item__group__element h2',
        '.item-title',
        'h2',
        'h3',
        'h4',
        '.ui-search-item__title-label',
        '[class*="title"]'
      ],
      price: [
        '.ui-search-price__part',
        '[class*="price"]',
        '.price-tag-amount',
        '.price-tag',
        '.item-price'
      ],
      area: [
        '.ui-search-item__attributes',
        '.item-attributes',
        '[class*="attributes"]'
      ],
      rooms: [
        '.ui-search-item__attributes',
        '.item-attributes',
        '[class*="attributes"]'
      ],
      bathrooms: [
        '.ui-search-item__attributes',
        '.item-attributes',
        '[class*="attributes"]'
      ],
      parking: [
        '.ui-search-item__attributes',
        '.item-attributes',
        '[class*="attributes"]'
      ],
      location: [
        '.item-location',
        '[class*="location"]',
        '.ui-search-item__location'
      ],
      images: [
        '.ui-search-result-image img',
        '.ui-search-item__image img',
        '.item-image img',
        'img'
      ],
      link: [
        'a.ui-search-link',
        '.ui-search-result__content a',
        '.ui-search-item__group__element a',
        'a[href*="/MCO-"]',
        'a'
      ],
      nextPage: [
        '.andes-pagination__button--next',
        '.ui-search-pagination__button--next',
        '[aria-label*="Siguiente"]'
      ]
    },
    regexPatterns: {
      title: [
        /Apartamento en arriendo(.+?)(?:Por\s+[A-Z\s]+)?\$[\d\.\,]+/i,
        /Apartamento en arriendo(.+?)(?:\$[\d\.\,]+)/i
      ],
      price: [
        /\$\s*[\d\.\,]+/g,
        /[\d\.\,]+\s*pesos/gi,
        /precio[:\s]*\$?[\d\.\,]+/gi
      ],
      area: [
        /(\d{1,3})\s*m[²2]\s*cubiertos/gi,
        /(\d{1,3})\s*M[²2]/gi,
        /(\d{1,3})\s*m[²2]/gi
      ],
      rooms: [
        /(\d{1})\s*habitaciones/gi,
        /(\d{1})\s*hab(?:itacion)?(?:es)?/gi
      ],
      bathrooms: [
        /(\d{1})\s*baños?/gi
      ],
      parking: [
        /(\d{1})\s*(?:parqueadero|garaje)s?/gi
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
        // If parking info is too long, it's probably not parking data
        if (String(value).length > 20) return 0;
        const parkingStr = String(value).replace(/[^\d]/g, '');
        const num = parseInt(parkingStr) || 0;
        // Reasonable parking range
        return num > 0 && num <= 5 ? num : 0;
      },
      images: (value: any) => {
        if (!value) return [];
        let images = Array.isArray(value) ? value : [value];
        // Filter out invalid images and normalize URLs
        images = images.filter(img => img && (img.startsWith('http') || img.startsWith('//')));
        // Convert protocol-relative URLs to https
        images = images.map(img => img.startsWith('//') ? `https:${img}` : img);
        return images;
      },
      title: (value: any) => {
        // Extract title from text if not found in specific element
        let title = String(value || '');

        // If no title found, try to extract from full text
        if (!title || title.length < 10) {
          // This will be handled by regex patterns in the extraction
          return '';
        }

        // Clean up title
        title = title.replace(/^Apartamento en arriendo\s*/i, '');
        title = title.replace(/Por\s+[A-Z\s]+\$.*$/i, ''); // Remove "Por COMPANY $price" suffix
        title = title.trim();

        // Filter out room rentals - be more strict
        if (/habitaci[oó]n|cuarto|pieza|room|bedroom/i.test(title) &&
            !/apartamento/i.test(title)) {
          return null; // Signal to skip this property
        }

        return title;
      }
    },
    defaults: {
      propertyType: 'Apartamento',
      source: 'MercadoLibre',
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
    timeoutMs: 70000,
    maxPages: 3
  }
};
