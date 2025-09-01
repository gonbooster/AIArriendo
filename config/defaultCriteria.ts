/**
 * DEFAULT SEARCH CRITERIA CONFIGURATIONS
 * 
 * Centralized default criteria for different search scenarios
 */

import { SearchCriteria } from '../core/types';
import { PROPERTY_DEFAULTS, LOCATION, SCORING } from './constants';

// ============================================================================
// MINIMAL SEARCH CRITERIA (for testing and broad searches)
// ============================================================================

export const MINIMAL_CRITERIA: SearchCriteria = {
  hardRequirements: {
    operation: 'arriendo',
    propertyTypes: ['Apartamento'],
    
    // Very broad ranges
    minRooms: PROPERTY_DEFAULTS.MIN_ROOMS,
    maxRooms: PROPERTY_DEFAULTS.MAX_ROOMS,
    minBathrooms: PROPERTY_DEFAULTS.MIN_BATHROOMS,
    maxBathrooms: PROPERTY_DEFAULTS.MAX_BATHROOMS,
    minParking: PROPERTY_DEFAULTS.MIN_PARKING,
    maxParking: PROPERTY_DEFAULTS.MAX_PARKING,
    minArea: PROPERTY_DEFAULTS.MIN_AREA,
    maxArea: PROPERTY_DEFAULTS.MAX_AREA,
    minTotalPrice: PROPERTY_DEFAULTS.MIN_PRICE,
    maxTotalPrice: PROPERTY_DEFAULTS.MAX_PRICE,
    allowAdminOverage: PROPERTY_DEFAULTS.ALLOW_ADMIN_OVERAGE,
    minStratum: PROPERTY_DEFAULTS.MIN_STRATUM,
    maxStratum: PROPERTY_DEFAULTS.MAX_STRATUM,
    
    location: {
      city: '', // Dinámico - no hardcodear
      neighborhoods: [],
      zones: []
    }
  },
  preferences: {
    wetAreas: [],
    sports: [],
    amenities: [],
    weights: SCORING.DEFAULT_WEIGHTS
  },
  optionalFilters: {}
};

// ============================================================================
// FRONTEND DEFAULT CRITERIA (used by the web interface)
// ============================================================================

export const FRONTEND_DEFAULT_CRITERIA: SearchCriteria = {
  hardRequirements: {
    operation: 'arriendo',
    propertyTypes: ['Apartamento'],
    
    // Broad but reasonable ranges for UI
    minRooms: 1,
    maxRooms: 10,
    minBathrooms: 1,
    maxBathrooms: 10,
    minParking: 0,
    maxParking: 10,
    minArea: 1,
    maxArea: 1000,
    minTotalPrice: 1,
    maxTotalPrice: 50000000, // 50 million COP
    allowAdminOverage: true,
    minStratum: 1,
    maxStratum: 6,
    
    location: {
      city: '', // Dinámico - no hardcodear
      neighborhoods: [],
      zones: []
    }
  },
  preferences: {
    wetAreas: [],
    sports: [],
    amenities: [],
    weights: SCORING.DEFAULT_WEIGHTS
  },
  optionalFilters: {}
};

// ============================================================================
// SPECIFIC NEIGHBORHOOD SEARCH CRITERIA
// ============================================================================

export function createNeighborhoodCriteria(neighborhood: string): SearchCriteria {
  return {
    ...MINIMAL_CRITERIA,
    hardRequirements: {
      ...MINIMAL_CRITERIA.hardRequirements,
      location: {
        city: '', // Dinámico - no hardcodear
        neighborhoods: [neighborhood],
        zones: []
      }
    }
  };
}

// ============================================================================
// SCRAPER TESTING CRITERIA
// ============================================================================

export const SCRAPER_TEST_CRITERIA: SearchCriteria = {
  hardRequirements: {
    operation: 'arriendo',
    propertyTypes: ['Apartamento'],
    
    // Ultra-broad ranges for maximum results
    minRooms: 1,
    maxRooms: 20,
    minBathrooms: 1,
    maxBathrooms: 20,
    minParking: 0,
    maxParking: 20,
    minArea: 1,
    maxArea: 2000,
    minTotalPrice: 1,
    maxTotalPrice: 100000000, // 100 million COP
    allowAdminOverage: true,
    minStratum: 1,
    maxStratum: 6,
    
    location: {
      city: '', // Dinámico - no hardcodear
      neighborhoods: [],
      zones: []
    }
  },
  preferences: {
    wetAreas: [],
    sports: [],
    amenities: [],
    weights: {
      wetAreas: 0,
      sports: 0,
      amenities: 0,
      location: 1.0,
      pricePerM2: 0.5
    }
  },
  optionalFilters: {}
};

// ============================================================================
// LUXURY PROPERTY CRITERIA
// ============================================================================

export const LUXURY_CRITERIA: SearchCriteria = {
  hardRequirements: {
    operation: 'arriendo',
    propertyTypes: ['Apartamento', 'Penthouse'],
    
    // High-end ranges
    minRooms: 3,
    maxRooms: 6,
    minBathrooms: 2,
    maxBathrooms: 6,
    minParking: 1,
    maxParking: 5,
    minArea: 100,
    maxArea: 500,
    minTotalPrice: 3000000, // 3 million COP
    maxTotalPrice: 20000000, // 20 million COP
    allowAdminOverage: true,
    minStratum: 4,
    maxStratum: 6,
    
    location: {
      city: '', // Dinámico - no hardcodear
      neighborhoods: [], // Dinámico - no hardcodear barrios específicos
      zones: []
    }
  },
  preferences: {
    wetAreas: ['jacuzzi', 'sauna', 'turco'],
    sports: ['padel', 'tenis'],
    amenities: ['gimnasio', 'piscina', 'salon social'],
    weights: {
      wetAreas: 1.0,
      sports: 1.0,
      amenities: 0.8,
      location: 0.6,
      pricePerM2: 0.4
    }
  },
  optionalFilters: {}
};

// ============================================================================
// BUDGET-FRIENDLY CRITERIA
// ============================================================================

export const BUDGET_CRITERIA: SearchCriteria = {
  hardRequirements: {
    operation: 'arriendo',
    propertyTypes: ['Apartamento', 'Apartaestudio'],
    
    // Budget-conscious ranges
    minRooms: 1,
    maxRooms: 3,
    minBathrooms: 1,
    maxBathrooms: 2,
    minParking: 0,
    maxParking: 1,
    minArea: 30,
    maxArea: 80,
    minTotalPrice: 500000, // 500k COP
    maxTotalPrice: 2000000, // 2 million COP
    allowAdminOverage: false,
    minStratum: 1,
    maxStratum: 4,
    
    location: {
      city: '', // Dinámico - no hardcodear
      neighborhoods: [],
      zones: []
    }
  },
  preferences: {
    wetAreas: [],
    sports: [],
    amenities: ['transporte público'],
    weights: {
      wetAreas: 0,
      sports: 0,
      amenities: 0.3,
      location: 0.8,
      pricePerM2: 1.0 // Price is most important for budget searches
    }
  },
  optionalFilters: {}
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create criteria for a specific price range
 */
export function createPriceRangeCriteria(minPrice: number, maxPrice: number): SearchCriteria {
  return {
    ...MINIMAL_CRITERIA,
    hardRequirements: {
      ...MINIMAL_CRITERIA.hardRequirements,
      minTotalPrice: minPrice,
      maxTotalPrice: maxPrice
    }
  };
}

/**
 * Create criteria for a specific area range
 */
export function createAreaRangeCriteria(minArea: number, maxArea: number): SearchCriteria {
  return {
    ...MINIMAL_CRITERIA,
    hardRequirements: {
      ...MINIMAL_CRITERIA.hardRequirements,
      minArea: minArea,
      maxArea: maxArea
    }
  };
}

/**
 * Create criteria for a specific number of rooms
 */
export function createRoomsCriteria(rooms: number): SearchCriteria {
  return {
    ...MINIMAL_CRITERIA,
    hardRequirements: {
      ...MINIMAL_CRITERIA.hardRequirements,
      minRooms: rooms,
      maxRooms: rooms
    }
  };
}
