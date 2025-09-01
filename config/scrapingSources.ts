import { ScrapingSource } from '../core/types';

export const SCRAPING_SOURCES: ScrapingSource[] = [
  {
    id: 'fincaraiz',
    name: 'Fincaraiz',
    baseUrl: 'https://www.fincaraiz.com.co',
    isActive: true,
    priority: 1,
    rateLimit: {
      requestsPerMinute: 30,
      delayBetweenRequests: 2000,
      maxConcurrentRequests: 2
    },
    selectors: {
      propertyCard: '[class*="property"], .property-item, [data-testid="property-card"], .listing-card',
      title: 'h3, h4, .property-title, [data-testid="property-title"], .listing-title',
      price: '.price, .precio, [data-testid="property-price"], .listing-price',
      area: '.area, .superficie, .m2, [data-testid="property-area"], .property-area',
      rooms: '.rooms, .habitaciones, .alcobas, [data-testid="property-rooms"], .bedrooms',
      bathrooms: '.bathrooms, .baños, .banos, [data-testid="property-bathrooms"]',
      location: '.location, .ubicacion, .direccion, [data-testid="property-location"], .address',
      amenities: '.amenities, .caracteristicas, .features',
      images: 'img, .property-image img, .listing-image img',
      link: 'a, .property-link, .listing-link',
      nextPage: '.pagination .next, [aria-label="Next"], .siguiente'
    },
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  },
  
  {
    id: 'metrocuadrado',
    name: 'Metrocuadrado',
    baseUrl: 'https://www.metrocuadrado.com',
    isActive: true,
    priority: 2,
    rateLimit: {
      requestsPerMinute: 25,
      delayBetweenRequests: 2500,
      maxConcurrentRequests: 2
    },
    selectors: {
      propertyCard: '[class*="property"], [class*="result"], .result-item, .listing-card, .property-item',
      title: '.listing-title, .property-title, .inmueble-titulo, .title',
      price: '.price, .listing-price, .precio, .valor, .property-price',
      area: '.area, .surface, .superficie, .metros, .m2',
      rooms: '.rooms, .bedrooms, .habitaciones, .alcobas',
      bathrooms: '.bathrooms, .baños, .banos',
      location: '.location, .address, .ubicacion, .direccion, .barrio',
      amenities: '.amenities, .features, .caracteristicas, .servicios',
      images: '.listing-image img, .property-image img, .foto img, img',
      link: 'a, .listing-link, .property-link',
      nextPage: '.pagination .next, .pager .next, .siguiente'
    }
  },

  {
    id: 'trovit',
    name: 'Trovit',
    baseUrl: 'https://casas.trovit.com.co',
    isActive: true,
    priority: 3,
    rateLimit: {
      requestsPerMinute: 20,
      delayBetweenRequests: 3000,
      maxConcurrentRequests: 1
    },
    selectors: {
      propertyCard: 'article, [class*="listing"], .js-item-list-element, .item, [class*="item"]',
      title: '.item_title, .js-item-title, h3, h4',
      price: '.item_price, .price',
      area: '.item_surface, .surface',
      rooms: '.item_rooms, .rooms',
      bathrooms: '.item_bathrooms, .bathrooms',
      location: '.item_location, .location',
      amenities: '.item_features, .features',
      images: '.item_image img',
      link: '.item_link, a',
      nextPage: '.pagination .next, .js-pagination-next'
    },
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'es-CO,es;q=0.9,en;q=0.8'
    }
  },



  {
    id: 'arriendo',
    name: 'Arriendo',
    baseUrl: 'https://www.arriendo.com',
    isActive: true,
    priority: 6,
    rateLimit: {
      requestsPerMinute: 25,
      delayBetweenRequests: 2500,
      maxConcurrentRequests: 2
    },
    selectors: {
      propertyCard: '[class*="listing"], .listing, .property-item, [class*="property"], [class*="card"], .inmueble',
      title: '.property-title, .title, h3, h4, [class*="title"]',
      price: '.property-price, .price, .precio, [class*="price"]',
      area: '.property-area, .area, .superficie, [class*="area"]',
      rooms: '.property-rooms, .rooms, .habitaciones, [class*="room"]',
      location: '.property-location, .location, .ubicacion, [class*="location"]',
      amenities: '.property-features, .features, .amenities',
      images: '.property-image img, img',
      link: 'a'
    }
  },

  {
    id: 'ciencuadras',
    name: 'Ciencuadras',
    baseUrl: 'https://www.ciencuadras.com',
    isActive: true,
    priority: 7,
    rateLimit: {
      requestsPerMinute: 20,
      delayBetweenRequests: 3000,
      maxConcurrentRequests: 1
    },
    selectors: {
      propertyCard: 'article, .property-card, .inmueble, [class*="property"], [class*="card"]',
      title: '.property-title, .titulo, h3, h4, .title, [class*="title"]',
      price: '.property-price, .precio, .price, [class*="price"], [class*="precio"]',
      area: '.property-area, .area, .superficie, [class*="area"]',
      rooms: '.property-rooms, .habitaciones, .rooms, [class*="room"]',
      location: '.property-location, .ubicacion, .location, [class*="location"]',
      amenities: '.property-amenities, .caracteristicas, .amenities',
      images: '.property-image img, img',
      link: 'a'
    }
  },

  {
    id: 'mercadolibre',
    name: 'MercadoLibre',
    baseUrl: 'https://inmuebles.mercadolibre.com.co',
    isActive: true,
    priority: 8,
    rateLimit: {
      requestsPerMinute: 20,
      delayBetweenRequests: 3000,
      maxConcurrentRequests: 1
    },
    selectors: {
      propertyCard: '[class*="card"], .ui-search-result, .item',
      title: '.ui-search-item-title, .item-title, h3, h4',
      price: '.price-tag, .item-price, [class*="price"]',
      area: '.item-attribute, [class*="area"]',
      rooms: '.item-attribute, [class*="room"]',
      location: '.item-location, [class*="location"]',
      images: '.item-image img, img',
      link: 'a'
    },
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  },

  {
    id: 'rentola',
    name: 'Rentola',
    baseUrl: 'https://www.rentola.co',
    isActive: true,
    priority: 9,
    rateLimit: {
      requestsPerMinute: 25,
      delayBetweenRequests: 2500,
      maxConcurrentRequests: 2
    },
    selectors: {
      propertyCard: '.property-card, .listing-item, [class*="property"], .search-result, .rental-item',
      title: '.property-title, .listing-title, h3, h4, [class*="title"]',
      price: '.price, .rental-price, [class*="price"], .cost',
      area: '.area, .size, [class*="area"], .square-meters',
      rooms: '.bedrooms, .rooms, [class*="bedroom"], [class*="room"]',
      bathrooms: '.bathrooms, .baños, .banos',
      location: '.location, .address, [class*="location"], .neighborhood',
      amenities: '.amenities, .features',
      images: '.property-image img, img, .listing-image img',
      link: 'a, .property-link',
      nextPage: '.pagination .next, [aria-label="Next"], .siguiente'
    },
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  },

  {
    id: 'properati',
    name: 'Properati',
    baseUrl: 'https://www.properati.com.co',
    isActive: true,
    priority: 10,
    rateLimit: {
      requestsPerMinute: 30,
      delayBetweenRequests: 2000,
      maxConcurrentRequests: 2
    },
    selectors: {
      propertyCard: '.listing-card, .property-item, [data-qa="posting PROPERTY"], .posting-card, .result-item',
      title: '[data-qa="POSTING_TITLE"], .posting-title, .listing-title, h3, h4',
      price: '[data-qa="POSTING_PRICE"], .posting-price, .price, [class*="price"]',
      area: '[data-qa="POSTING_FEATURES"], .posting-features, .features, .property-features',
      rooms: '[data-qa="POSTING_FEATURES"], .posting-features, .features, .property-features',
      bathrooms: '[data-qa="POSTING_FEATURES"], .posting-features, .features, .property-features',
      location: '[data-qa="POSTING_LOCATION"], .posting-location, .location, [class*="location"]',
      amenities: '[data-qa="POSTING_FEATURES"], .posting-features, .features, .property-features',
      images: '.posting-image img, .listing-image img, img',
      link: 'a, [data-qa="posting PROPERTY"] a',
      nextPage: '.pagination .next, [aria-label="Next"], .siguiente'
    },
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  },

  {
    id: 'pads',
    name: 'PADS',
    baseUrl: 'https://pads.com.co',
    isActive: true, // ENABLED: Fixed scraper with real HTML structure
    priority: 11,
    rateLimit: {
      requestsPerMinute: 20,
      delayBetweenRequests: 3000,
      maxConcurrentRequests: 1
    },
    selectors: {
      propertyCard: '.property-listing, .listing-card, .apartment-card, [data-testid="property-card"], .search-result-item',
      title: '.property-name, .listing-title, h3, h4, [data-testid="property-name"]',
      price: '.rent-price, .price, [data-testid="rent-price"], .listing-price',
      area: '.square-feet, .sqft, [data-testid="square-feet"], .area',
      rooms: '.bedrooms, [data-testid="bedrooms"], .bed-count',
      bathrooms: '.bathrooms, [data-testid="bathrooms"], .bath-count',
      location: '.property-address, .address, [data-testid="property-address"], .location',
      amenities: '.amenities, .features, [data-testid="amenities"], .property-features',
      images: '.property-image img, img, [data-testid="property-image"] img',
      link: 'a, .property-link',
      nextPage: '.pagination .next, [aria-label="Next"], .siguiente'
    },
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  },

  {
    id: 'rentola',
    name: 'Rentola',
    baseUrl: 'https://rentola.com',
    isActive: true,
    priority: 12,
    rateLimit: {
      requestsPerMinute: 15,
      delayBetweenRequests: 4000,
      maxConcurrentRequests: 1
    },
    selectors: {
      propertyCard: '.listing-card, .property-item, .rental-listing, [data-testid="listing"], .search-result, .listing, .property, .card, article',
      title: '.listing-title, .property-title, h3, h4, h2, [data-testid="listing-title"], .title, .name',
      price: '.listing-price, .price, .rent-price, [data-testid="listing-price"], .cost, .amount, .value',
      area: '.listing-area, .area, .size, [data-testid="listing-area"], .square-meters, .m2, .sqm',
      rooms: '.listing-rooms, .bedrooms, .rooms, [data-testid="bedrooms"], .bed-count, .beds, .habitaciones',
      bathrooms: '.listing-bathrooms, .bathrooms, .baños, [data-testid="bathrooms"], .bath-count, .baths',
      location: '.listing-location, .location, .address, [data-testid="listing-location"], .neighborhood, .area-name',
      amenities: '.listing-amenities, .amenities, .features, [data-testid="amenities"]',
      images: '.listing-image img, .property-image img, img, [data-testid="listing-image"] img',
      link: 'a, .listing-link, .property-link',
      nextPage: '.pagination .next, [aria-label="Next"], .siguiente, .pager-next'
    },
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  }
];
