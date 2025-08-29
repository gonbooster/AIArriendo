import { Request, Response } from 'express';
import { SearchService } from '../core/services/SearchService';
// import { ScrapingEngine } from '../core/scraping/ScrapingEngine';
import { SCRAPING_SOURCES } from '../config/scraping-sources';
import { SearchCriteria, ApiResponse } from '../core/types';
import { asyncHandler } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

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
    const { criteria, page = 1, limit = 200 } = req.body;

    logger.info('🔍 Search request received:', {
      body: req.body,
      criteria: criteria,
      page,
      limit
    });

    // Convert frontend criteria to backend format
    const backendCriteria = this.convertFrontendCriteria(criteria);

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
      logger.error('Search failed:', error);
      throw error;
    }
  });

  /**
   * Start scraping process
   */
  startScraping = asyncHandler(async (req: Request, res: Response) => {
    const { sources, criteria } = req.body;

    // Default to all active sources if none specified
    const sourcesToScrape = sources 
      ? SCRAPING_SOURCES.filter(s => sources.includes(s.id) && s.isActive)
      : SCRAPING_SOURCES.filter(s => s.isActive);

    if (sourcesToScrape.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid sources specified'
      });
    }

    logger.info(`Starting scraping for ${sourcesToScrape.length} sources`);

    try {
      // Use default criteria if none provided
      const scrapingCriteria = criteria || this.getDefaultScrapingCriteria();
      
      // const jobs = await this.scrapingEngine.startScraping(sourcesToScrape, scrapingCriteria);
      const jobs: any[] = []; // Placeholder

      const response: ApiResponse = {
        success: true,
        data: jobs,
        message: `Started scraping for ${sourcesToScrape.length} sources`
      };

      res.json(response);

    } catch (error) {
      logger.error('Failed to start scraping:', error);
      throw error;
    }
  });

  /**
   * Get scraping status
   */
  getScrapingStatus = asyncHandler(async (req: Request, res: Response) => {
    // const jobs = this.scrapingEngine.getActiveJobs();
    // const statistics = this.scrapingEngine.getStatistics();
    const jobs: any[] = [];
    const statistics = {};

    const response: ApiResponse = {
      success: true,
      data: {
        activeJobs: jobs,
        statistics
      }
    };

    res.json(response);
  });

  /**
   * Stop scraping job
   */
  stopScraping = asyncHandler(async (req: Request, res: Response) => {
    const { jobId } = req.params;

    // const success = await this.scrapingEngine.stopJob(jobId);
    const success = false; // Placeholder

    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Job not found or cannot be stopped'
      });
    }

    const response: ApiResponse = {
      success: true,
      message: 'Scraping job stopped successfully'
    };

    res.json(response);
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

        // Ubicación
        location: {
          city: 'Bogotá',
          minStreet: frontendCriteria.location?.minStreet,
          maxStreet: frontendCriteria.location?.maxStreet,
          minCarrera: frontendCriteria.location?.minCarrera,
          maxCarrera: frontendCriteria.location?.maxCarrera,
          neighborhoods: frontendCriteria.location?.neighborhoods || frontendCriteria.neighborhoods || [],
          zones: frontendCriteria.location?.zones || []
        }
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
   * Get default scraping criteria
   */
  private getDefaultScrapingCriteria(): SearchCriteria {
    return {
      hardRequirements: {
        minRooms: 1,
        minArea: 30,
        maxTotalPrice: 10000000,
        allowAdminOverage: true,
        location: {
          city: 'Bogotá',
          zones: ['Norte']
        }
      },
      preferences: {
        wetAreas: ['jacuzzi', 'sauna', 'turco'],
        sports: ['padel', 'tenis'],
        amenities: ['gimnasio', 'piscina', 'salon social'],
        weights: {
          wetAreas: 1.0,
          sports: 1.0,
          amenities: 0.5,
          location: 0.3,
          pricePerM2: 0.4
        }
      }
    };
  }
}
