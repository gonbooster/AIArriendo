import { Request, Response } from 'express';
import { SearchService } from '../core/services/SearchService';
// import { ScrapingEngine } from '../core/scraping/ScrapingEngine';
import { SCRAPING_SOURCES } from '../config/scrapingSources';
import { SearchCriteria, ApiResponse } from '../core/types';
import { asyncHandler } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { SEARCH } from '../config/constants';

export class SearchController {
  private searchService: SearchService;
  // private scrapingEngine: ScrapingEngine;

  constructor() {
    this.searchService = new SearchService();
    // this.scrapingEngine = new ScrapingEngine();
  }

  /**
   * Execute property search
   */
  search = asyncHandler(async (req: Request, res: Response) => {
    // El frontend envía los datos dentro de un objeto 'criteria'
    const { page = SEARCH.DEFAULT_PAGE, limit = SEARCH.DEFAULT_LIMIT, criteria } = req.body;
    const frontendCriteria = criteria || req.body;

    logger.info('🔍 Search request received:', {
      body: req.body,
      criteria: frontendCriteria,
      page,
      limit
    });

    // Convert frontend criteria to backend format
    const backendCriteria = this.convertFrontendCriteria(frontendCriteria);

    // Validate search criteria
    const validationError = this.validateSearchCriteria(backendCriteria);
    if (validationError) {
      return res.status(400).json({
        success: false,
        error: validationError
      });
    }

    logger.info('Search request received', {
      minRooms: backendCriteria.hardRequirements.minRooms,
      maxPrice: backendCriteria.hardRequirements.maxTotalPrice,
      page,
      limit
    });

    try {
      const result = await this.searchService.search(backendCriteria, page, limit);

      logger.info('🎉 Search completed successfully:', {
        propertiesFound: result.properties?.length || 0,
        total: result.total,
        executionTime: result.executionTime
      });

      const response: ApiResponse = {
        success: true,
        data: {
          properties: result.properties,
          total: result.total,
          summary: result.summary
        },
        pagination: {
          page,
          limit,
          total: result.total,
          pages: Math.ceil(result.total / limit)
        },
        metadata: {
          executionTime: result.executionTime,
          version: '3.0.0'
        }
      };

      res.json(response);

    } catch (error) {
      logger.error('🚨 Real search failed:', error);
      res.status(500).json({
        success: false,
        error: 'Real scraping failed - no fallback data available'
      });
    }
  });



  /**
   * Get available sources
   */
  getSources = asyncHandler(async (req: Request, res: Response) => {
    const sources = SCRAPING_SOURCES.map(source => ({
      id: source.id,
      name: source.name,
      isActive: source.isActive,
      priority: source.priority
    }));

    const response: ApiResponse = {
      success: true,
      data: sources
    };

    res.json(response);
  });

  /**
   * Get property recommendations
   */
  getRecommendations = asyncHandler(async (req: Request, res: Response) => {
    const { criteria, limit = 5 } = req.body;
    const userId = 'anonymous'; // TODO: Implement auth middleware

    const recommendations = await this.searchService.getRecommendations(userId, criteria, limit);

    const response: ApiResponse = {
      success: true,
      data: recommendations
    };

    res.json(response);
  });

  /**
   * Get single property by ID
   */
  getProperty = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
      const property = await this.searchService.getPropertyById(id);

      if (!property) {
        return res.status(404).json({
          success: false,
          error: 'Property not found'
        });
      }

      const response: ApiResponse = {
        success: true,
        data: property
      };

      res.json(response);
    } catch (error) {
      logger.error('Error getting property:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  });

  /**
   * Get similar properties
   */
  getSimilarProperties = asyncHandler(async (req: Request, res: Response) => {
    const { propertyId } = req.params;
    const limit = parseInt(req.query.limit as string) || 5;

    const similarProperties = await this.searchService.getSimilarProperties(propertyId, limit);

    const response: ApiResponse = {
      success: true,
      data: similarProperties
    };

    res.json(response);
  });

  /**
   * 🚀 BÚSQUEDA INTELIGENTE DE UBICACIONES
   */
  smartLocationSearch = asyncHandler(async (req: Request, res: Response) => {
    const { q } = req.query;

    if (!q || typeof q !== 'string') {
      return res.json({
        success: true,
        data: { cities: [], neighborhoods: [], zones: [], bestMatch: null }
      });
    }

    const LocationDetector = require('../core/utils/LocationDetector').LocationDetector;
    const results = LocationDetector.smartLocationSearch(q);

    logger.info(`🔍 Búsqueda inteligente para "${q}":`, {
      cities: results.cities.length,
      neighborhoods: results.neighborhoods.length,
      bestMatch: results.bestMatch
    });

    res.json({
      success: true,
      data: results
    });
  });

  /**
   * Get search suggestions for autocomplete
   */
  getSearchSuggestions = asyncHandler(async (req: Request, res: Response) => {
    const { q, type = 'all' } = req.query;

    if (!q || typeof q !== 'string') {
      return res.json({ success: true, data: [] });
    }

    // This could be enhanced with a dedicated search suggestions service
    const suggestions: string[] = [];

    // Neighborhood suggestions - use dynamic location service instead of hardcoded list
    if (type === 'all' || type === 'neighborhoods') {
      // TODO: Integrate with LocationService for dynamic suggestions
      // For now, return empty to avoid hardcoded neighborhoods
      const dynamicNeighborhoods: string[] = [];
      suggestions.push(...dynamicNeighborhoods);
    }

    // Amenity suggestions
    if (type === 'all' || type === 'amenities') {
      const amenities = [
        'piscina', 'gimnasio', 'jacuzzi', 'sauna', 'turco',
        'cancha de padel', 'tenis', 'squash', 'salon social',
        'bbq', 'parqueadero', 'seguridad', 'ascensor'
      ];
      
      const matchingAmenities = amenities.filter(a => 
        a.toLowerCase().includes(q.toLowerCase())
      );
      suggestions.push(...matchingAmenities);
    }

    const response: ApiResponse = {
      success: true,
      data: [...new Set(suggestions)].slice(0, 10)
    };

    res.json(response);
  });

  /**
   * Convert frontend criteria format to backend format
   */
  private convertFrontendCriteria(frontendCriteria: any): SearchCriteria {
    logger.info('🔄 Converting frontend criteria:', frontendCriteria);

    // Valores por defecto seguros
    const safeMinRooms = Math.max(1, frontendCriteria.minRooms || 1);
    const safeMaxRooms = Math.max(safeMinRooms, frontendCriteria.maxRooms || 6);
    const safeMinBathrooms = Math.max(1, frontendCriteria.minBathrooms || 1);
    const safeMaxBathrooms = Math.max(safeMinBathrooms, frontendCriteria.maxBathrooms || 4);
    const safeMinArea = Math.max(20, frontendCriteria.minArea || 20);
    const safeMaxArea = Math.max(safeMinArea, frontendCriteria.maxArea || 500);
    const safeMinPrice = Math.max(100000, frontendCriteria.minPrice || 100000);
    const safeMaxPrice = Math.max(safeMinPrice, frontendCriteria.maxPrice || 10000000);

    const converted = {
      hardRequirements: {
        // Campos básicos
        minRooms: safeMinRooms,
        maxRooms: safeMaxRooms,
        minBathrooms: safeMinBathrooms,
        maxBathrooms: safeMaxBathrooms,
        minParking: frontendCriteria.minParking || 0,
        maxParking: frontendCriteria.maxParking || 5,

        // Área
        minArea: safeMinArea,
        maxArea: safeMaxArea,

        // Precio
        minTotalPrice: safeMinPrice,
        maxTotalPrice: safeMaxPrice,
        allowAdminOverage: frontendCriteria.allowAdminOverage || false,

        // Estrato
        minStratum: frontendCriteria.minStratum || 1,
        maxStratum: frontendCriteria.maxStratum || 6,

        // Tipo de propiedad y operación
        propertyTypes: frontendCriteria.propertyTypes || ['Apartamento'],
        operation: frontendCriteria.operation || 'arriendo',

        // 🚀 Ubicación - Detección inteligente automática
        location: (() => {
          const detectedLocation = this.detectLocationFromCriteria(frontendCriteria);
          return {
            city: detectedLocation.city,
            minStreet: frontendCriteria.location?.minStreet,
            maxStreet: frontendCriteria.location?.maxStreet,
            minCarrera: frontendCriteria.location?.minCarrera,
            maxCarrera: frontendCriteria.location?.maxCarrera,
            neighborhoods: detectedLocation.neighborhoods,
            zones: detectedLocation.zones
          };
        })()
      },
      preferences: {
        wetAreas: frontendCriteria.preferences?.wetAreas || [],
        sports: frontendCriteria.preferences?.sports || [],
        amenities: frontendCriteria.preferences?.amenities || [],
        weights: {
          wetAreas: 1.0,
          sports: 1.0,
          amenities: 0.8,
          location: 0.6,
          pricePerM2: 0.4
        }
      },
      optionalFilters: {
        sources: frontendCriteria.sources
      }
    };

    logger.info('✅ Converted criteria:', converted);
    return converted;
  }

  /**
   * Validate search criteria
   */
  private validateSearchCriteria(criteria: SearchCriteria): string | null {
    if (!criteria) {
      return 'Search criteria is required';
    }

    if (!criteria.hardRequirements) {
      return 'Hard requirements are required';
    }

    const { hardRequirements } = criteria;

    if (!hardRequirements.minRooms || hardRequirements.minRooms < 1) {
      return 'Minimum rooms must be at least 1';
    }

    if (!hardRequirements.minArea || hardRequirements.minArea < 20) {
      return 'Minimum area must be at least 20 m²';
    }

    if (!hardRequirements.maxTotalPrice || hardRequirements.maxTotalPrice < 500000) {
      return 'Maximum price must be at least 500,000 COP';
    }

    if (hardRequirements.maxRooms && hardRequirements.maxRooms < hardRequirements.minRooms) {
      return 'Maximum rooms cannot be less than minimum rooms';
    }

    if (hardRequirements.maxArea && hardRequirements.maxArea < hardRequirements.minArea) {
      return 'Maximum area cannot be less than minimum area';
    }

    if (!hardRequirements.location?.city) {
      return 'City is required in location criteria';
    }

    return null;
  }

  /**
   * 🚀 DETECTAR UBICACIÓN INTELIGENTE desde texto libre
   */
  private detectLocationFromCriteria(frontendCriteria: any): {
    city: string;
    neighborhoods: string[];
    zones: string[];
  } {
    const LocationDetector = require('../core/utils/LocationDetector').LocationDetector;

    // 1. Si viene texto libre de ubicación (STRING DIRECTO)
    const locationText = typeof frontendCriteria.location === 'string'
                        ? frontendCriteria.location
                        : frontendCriteria.location?.text ||
                          frontendCriteria.location?.neighborhoods?.[0] ||
                          frontendCriteria.neighborhoods?.[0] ||
                          frontendCriteria.city || '';

    if (locationText && typeof locationText === 'string') {
      logger.info(`🔍 Búsqueda inteligente de ubicación: "${locationText}"`);

      const searchResults = LocationDetector.smartLocationSearch(locationText);

      if (searchResults.bestMatch && searchResults.bestMatch.confidence >= 0.6) {
        const match = searchResults.bestMatch;
        logger.info(`🎯 Mejor coincidencia: ${match.type} "${match.name}" (confianza: ${match.confidence.toFixed(2)})`);

        if (match.type === 'city') {
          return {
            city: match.name,
            neighborhoods: [],
            zones: []
          };
        } else if (match.type === 'neighborhood') {
          return {
            city: match.city,
            neighborhoods: [match.name],
            zones: []
          };
        }
      } else {
        // 🚫 NO SE ENCONTRÓ UBICACIÓN VÁLIDA - MOSTRAR INFORMACIÓN DE DEBUG
        logger.warn(`🚫 No se encontró ubicación válida para: "${locationText}"`);
        logger.warn(`🔍 Resultados de búsqueda:`, {
          bestMatch: searchResults.bestMatch,
          cities: searchResults.cities.length,
          neighborhoods: searchResults.neighborhoods.length,
          allNeighborhoods: searchResults.neighborhoods,
          allCities: searchResults.cities
        });
        throw new Error(`No se encontró la ubicación "${locationText}". Por favor verifica el nombre de la ciudad o barrio.`);
      }
    }

    // 2. Fallback: Detectar desde neighborhoods array (compatibilidad)
    const neighborhoods = frontendCriteria.location?.neighborhoods || frontendCriteria.neighborhoods || [];
    if (neighborhoods.length > 0) {
      const locationInfo = LocationDetector.detectLocation(neighborhoods[0]);
      if (locationInfo.city) {
        logger.info(`🎯 Ciudad detectada desde barrio "${neighborhoods[0]}": ${locationInfo.city}`);
        return {
          city: locationInfo.city,
          neighborhoods: neighborhoods,
          zones: []
        };
      }
    }

    // 🚫 NO HAY UBICACIÓN VÁLIDA - NO BUSCAR
    logger.warn('🚫 No se pudo detectar ubicación válida');
    throw new Error('No se especificó una ubicación válida. Por favor ingresa una ciudad o barrio.');
  }


}
