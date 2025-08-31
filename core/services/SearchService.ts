import { Property as PropertyModel } from '../../models/Property';
import { SearchCriteria, SearchResult, SearchSummary, Property } from '../types';
import { PropertyScorer } from '../scoring/PropertyScorer';
// import { ScrapingEngine } from '../scraping/ScrapingEngine';
import { SCRAPING_SOURCES } from '../../config/scraping-sources';
import { logger } from '../../utils/logger';
// ELIMINADO: import { searchResultsExporter } from './SearchResultsExporter';
// BaseScraper eliminado - usar scrapers específicos
// ProperatiScraper importado dinámicamente
import { LocationDetector } from '../utils/LocationDetector';
import { SEARCH, SCRAPING } from '../../config/constants';
export class SearchService {
  private scorer: PropertyScorer;

  constructor() {
    this.scorer = new PropertyScorer();
  }

  /**
   * Execute search with criteria
   */
  async search(
    criteria: SearchCriteria,
    page: number = SEARCH.DEFAULT_PAGE,
    limit: number = SEARCH.DEFAULT_LIMIT
  ): Promise<SearchResult> {
    const startTime = Date.now();

    try {
      logger.info('Executing search with criteria:', {
        minRooms: criteria.hardRequirements.minRooms,
        minArea: criteria.hardRequirements.minArea,
        maxPrice: criteria.hardRequirements.maxTotalPrice,
        preferences: Object.keys(criteria.preferences || {}).length
      });

      // USO DE DATOS REALES SIEMPRE
      let scrapedProperties: Property[] = await this.executeRealTimeSearch(criteria);

      logger.info(`Properties loaded: ${scrapedProperties.length} properties found`);

      // 3. Score and rank properties
      const scoredProperties = this.scorer.scoreProperties(scrapedProperties, criteria);
      logger.info(`Properties scored and ranked`);

      // 4. Apply pagination
      const total = scoredProperties.length;
      const startIndex = (page - 1) * limit;
      const paginatedProperties = scoredProperties.slice(startIndex, startIndex + limit);

      // 5. Generate summary
      const summary = this.generateSummary(scrapedProperties, scoredProperties);

      const executionTime = Date.now() - startTime;
      logger.info(`Search completed in ${executionTime}ms. Returning ${paginatedProperties.length} of ${total} properties`);

      return {
        properties: paginatedProperties,
        total,
        page,
        limit,
        criteria,
        summary,
        executionTime
      };

    } catch (error) {
      logger.error('🔥 SEARCH EXECUTION FAILED - TRYING EMERGENCY REAL DATA:', error);

      // INTENTAR OBTENER DATOS REALES AUNQUE HAYA ERROR
      // const properties = this.scrapingEngine.getCollectedProperties();
      const properties: Property[] = [];
      logger.info(`🔥 EMERGENCY: Found ${properties.length} real properties despite error`);

      if (properties.length > 0) {
        const total = properties.length;
        const startIndex = (page - 1) * limit;
        const paginatedProperties = properties.slice(startIndex, startIndex + limit);

        return {
          properties: paginatedProperties,
          total,
          page,
          limit,
          criteria,
          summary: {
            totalFound: total,
            hardMatches: total,
            averagePrice: 0,
            averagePricePerM2: 0,
            averageArea: 0,
            sourceBreakdown: {},
            sources: {},
            neighborhoodBreakdown: {},
            priceDistribution: []
          },
          executionTime: Date.now() - startTime
        };
      }

      // SOLO SI NO HAY DATOS REALES: NO USAR FALLBACKS/MOCKS
      logger.error('🔥 NO REAL DATA AVAILABLE - returning empty real data set (no mocks)');
      return {
        properties: [],
        total: 0,
        page,
        limit,
        criteria,
        summary: {
          totalFound: 0,
          hardMatches: 0,
          averagePrice: 0,
          averagePricePerM2: 0,
          averageArea: 0,
          sourceBreakdown: {},
          sources: {},
          neighborhoodBreakdown: {},
          priceDistribution: []
        },
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * Execute real-time search across multiple sources
   */
  private async executeRealTimeSearch(criteria: SearchCriteria): Promise<Property[]> {
    try {
      // Subset estable y más rápido para evitar timeouts en frontend
      const requestedSources = criteria.optionalFilters?.sources as string[] | undefined;
      const enabledScraperIds = (requestedSources && requestedSources.length > 0)
        ? requestedSources
        : ['ciencuadras', 'metrocuadrado', 'fincaraiz', 'mercadolibre', 'properati', 'trovit', 'pads', 'rentola'];
      const activeSources = SCRAPING_SOURCES.filter(source => source.isActive && enabledScraperIds.includes(source.id));
      logger.info(`🔥 STARTING REAL SCRAPING across ${activeSources.length} sources: ${activeSources.map(s=>s.id).join(', ')}`);

      const perSourceMaxPages = Number(process.env.SCRAPER_MAX_PAGES) || SCRAPING.MAX_PAGES_PER_SOURCE;
      const perSourceTimeoutMs = Number(process.env.SCRAPER_TIMEOUT_MS) || SCRAPING.TIMEOUT_PER_SOURCE_MS;

      // Helper para timeout por fuente
      const withTimeout = <T,>(p: Promise<T>, ms: number): Promise<T | null> => {
        return new Promise((resolve) => {
          const t = setTimeout(() => resolve(null), ms);
          p.then((v) => { clearTimeout(t); resolve(v); }).catch((_e) => { clearTimeout(t); resolve(null); });
        });
      };

      // Ejecutar scrapers reales en paralelo
      const scrapers = activeSources.map((source) => {
        switch (source.id) {
          case 'ciencuadras':
            return new (require('../scraping/scrapers/CiencuadrasScraper').CiencuadrasScraper)();
          case 'metrocuadrado':
            return new (require('../scraping/scrapers/MetrocuadradoScraper').MetrocuadradoScraper)();
          case 'fincaraiz':
            return new (require('../scraping/scrapers/FincaraizScraper').FincaraizScraper)();
          case 'mercadolibre':
            return new (require('../scraping/scrapers/MercadoLibreScraper').MercadoLibreScraper)();
          case 'properati':
            return new (require('../scraping/scrapers/ProperatiScraper').ProperatiScraper)();
          case 'pads':
            return new (require('../scraping/scrapers/PadsScraper').PadsScraper)();
          case 'trovit':
            return new (require('../scraping/scrapers/TrovitScraper').TrovitScraper)();
          case 'rentola':
            return new (require('../scraping/scrapers/RentolaScraper').RentolaScraper)();
          case 'arriendo':
            return new (require('../scraping/scrapers/ArriendoScraper').ArriendoScraper)();
          default:
            return null; // Skip unknown scrapers
        }
      }).filter(Boolean); // Remove null values

      // Correr cada scraper con páginas limitadas y timeout individual
      const results = await Promise.allSettled(
        scrapers.map(s => withTimeout(s.scrape(criteria, perSourceMaxPages), perSourceTimeoutMs))
      );
      const properties: Property[] = results.flatMap(r => (r.status === 'fulfilled' && Array.isArray(r.value)) ? r.value : []);

      logger.info(`🔥 RAW SCRAPED PROPERTIES: ${properties.length} found across ${scrapers.length} sources (pages=${perSourceMaxPages})`);

      return properties;

    } catch (error) {
      logger.error('🔥 Real-time search failed:', error);
      const properties: Property[] = [];
      logger.info(`🔥 FORCED: Using ${properties.length} real scraped properties despite error`);
      return properties;
    }
  }

  /**
   * Filter properties by hard criteria - FILTROS REACTIVADOS
   */
  private filterPropertiesByCriteria(properties: Property[], criteria: SearchCriteria): Property[] {
    let filtered = [...properties];
    const hardReq = criteria.hardRequirements;

    logger.info(`🔍 Applying hard filters to ${filtered.length} properties`);

    // 🚫 DETECTAR CARACTERES ESPECIALES PARA SALTARSE TODOS LOS FILTROS - USAR LOCATIONDETECTOR
    if (hardReq.location?.neighborhoods && hardReq.location.neighborhoods.length > 0) {
      if (LocationDetector.hasSpecialSearchChars(hardReq.location.neighborhoods)) {
        logger.info(`🚫🚫🚫 SPECIAL CHARACTERS DETECTED - SKIPPING ALL FILTERS 🚫🚫🚫`);
        logger.info(`📍 Returning ALL properties without any filters: ${filtered.length} properties`);
        return filtered; // DEVOLVER TODAS LAS PROPIEDADES SIN FILTROS
      }
    }

    // 🚫 TODOS LOS FILTROS ELIMINADOS - SOLO OPERACIÓN Y UBICACIÓN
    logger.info(`🚫 ALL FILTERS REMOVED - ONLY KEEPING OPERATION AND LOCATION`);

    // Location filter (neighborhoods) - MEJORADO: Más flexible
    if (hardReq.location?.neighborhoods && hardReq.location.neighborhoods.length > 0) {
      logger.info(`🔍 Original neighborhoods: ${JSON.stringify(hardReq.location.neighborhoods)}`);

      // Detectar si son caracteres especiales para "buscar todo"
      const hasSpecialChars = hardReq.location.neighborhoods.some(n => {
        const cleaned = n.trim();
        return cleaned.length <= 1 ||
               ['*', '.', '?', '+', '!', '@', '#', '$', '%', '^', '&'].includes(cleaned) ||
               /^[^\w\s]+$/.test(cleaned);
      });

      if (hasSpecialChars) {
        logger.info(`🚫 SPECIAL CHARACTERS DETECTED - SKIPPING ALL NEIGHBORHOOD FILTERS`);
        logger.info(`📍 No neighborhood filter applied (special chars detected): ${filtered.length} properties`);
      } else {
        // Filtrar caracteres especiales que no son barrios reales
        const validNeighborhoods = hardReq.location.neighborhoods.filter(n => {
          const cleaned = n.trim();
          const isValid = cleaned.length > 1 &&
                 !['*', '.', '?', '+', '!', '@', '#', '$', '%', '^', '&'].includes(cleaned) &&
                 !/^[^\w\s]+$/.test(cleaned);

          logger.info(`🔍 Checking neighborhood "${n}" -> cleaned: "${cleaned}" -> valid: ${isValid}`);
          return isValid;
        });

        logger.info(`🔍 Valid neighborhoods after filtering: ${JSON.stringify(validNeighborhoods)}`);

        // Solo aplicar filtro si hay barrios válidos
        if (validNeighborhoods.length > 0) {
          filtered = filtered.filter(p => {
            const propertyNeighborhood = (p.location.neighborhood || '').toLowerCase();
            const propertyAddress = (p.location.address || '').toLowerCase();
            const propertyCity = (p.location.city || '').toLowerCase();

            return validNeighborhoods.some(searchLocation => {
              const searchLower = searchLocation.toLowerCase();

              // Búsqueda FLEXIBLE en múltiples campos
              const propertyTitle = (p.title || '').toLowerCase();
              const propertyDescription = (p.description || '').toLowerCase();

              // Buscar en TODOS los campos de texto disponibles
              const matchesNeighborhood = propertyNeighborhood.includes(searchLower);
              const matchesAddress = propertyAddress.includes(searchLower);
              const matchesCity = propertyCity.includes(searchLower);
              const matchesTitle = propertyTitle.includes(searchLower);
              const matchesDescription = propertyDescription.includes(searchLower);

              // También buscar coincidencias parciales (útil para ciudades)
              const partialMatchNeighborhood = searchLower.includes(propertyNeighborhood) && propertyNeighborhood.length > 2;
              const partialMatchCity = searchLower.includes(propertyCity) && propertyCity.length > 2;

              return matchesNeighborhood || matchesAddress || matchesCity ||
                     matchesTitle || matchesDescription ||
                     partialMatchNeighborhood || partialMatchCity;
            });
          });
          logger.info(`📍 After FLEXIBLE location filter (${validNeighborhoods.join(', ')}): ${filtered.length} properties`);
        } else {
          logger.info(`📍 No valid neighborhoods to filter (ignored special characters): ${filtered.length} properties`);
        }
      }
    }

    logger.info(`✅ Hard filters applied: ${properties.length} -> ${filtered.length} properties`);
    return filtered;
  }

  /**
   * Build location query
   */
  private buildLocationQuery(location: SearchCriteria['hardRequirements']['location']): any {
    const query: any = {};

    // City filter
    if (location.city) {
      query['location.city'] = location.city;
    }

    // Neighborhoods filter
    if (location.neighborhoods && location.neighborhoods.length > 0) {
      query['location.neighborhood'] = { $in: location.neighborhoods };
    }

    // Zones filter
    if (location.zones && location.zones.length > 0) {
      query['location.zone'] = { $in: location.zones };
    }

    // Street range filter
    if (location.minStreet && location.maxStreet) {
      query['location.street'] = {
        $gte: location.minStreet,
        $lte: location.maxStreet
      };
    }

    // Carrera range filter
    if (location.minCarrera && location.maxCarrera) {
      query['location.carrera'] = {
        $gte: location.minCarrera,
        $lte: location.maxCarrera
      };
    }

    return query;
  }

  /**
   * Apply optional filters - FILTROS REACTIVADOS
   */
  private applyOptionalFilters(properties: Property[], criteria: SearchCriteria): Property[] {
    let filtered = [...properties];
    const optionalFilters = criteria.optionalFilters;

    if (!optionalFilters) {
      logger.info(`📋 No optional filters specified, returning ${filtered.length} properties`);
      return filtered;
    }

    logger.info(`🔍 Applying optional filters to ${filtered.length} properties`);

    // Source filter - FIXED: Case-insensitive matching for both ID and name
    if (optionalFilters.sources && optionalFilters.sources.length > 0) {
      filtered = filtered.filter(p => {
        const propertySource = (p.source || '').toLowerCase();
        return optionalFilters.sources!.some(requestedSource => {
          const requested = requestedSource.toLowerCase();
          // Match both ID (fincaraiz) and name (Fincaraiz)
          return propertySource === requested ||
                 propertySource === requested.charAt(0).toUpperCase() + requested.slice(1) ||
                 propertySource.includes(requested) ||
                 requested.includes(propertySource);
        });
      });
      logger.info(`🌐 After sources filter (${optionalFilters.sources.join(', ')}): ${filtered.length} properties`);
    }

    // Neighborhoods filter (additional to hard requirements)
    if (optionalFilters.neighborhoods && optionalFilters.neighborhoods.length > 0) {
      filtered = filtered.filter(p => {
        const propertyNeighborhood = (p.location.neighborhood || '').toLowerCase();
        const propertyAddress = (p.location.address || '').toLowerCase();

        return optionalFilters.neighborhoods!.some(neighborhood => {
          const searchNeighborhood = neighborhood.toLowerCase();
          return propertyNeighborhood.includes(searchNeighborhood) ||
                 propertyAddress.includes(searchNeighborhood);
        });
      });
      logger.info(`📍 After optional neighborhoods filter (${optionalFilters.neighborhoods.join(', ')}): ${filtered.length} properties`);
    }

    // Price range filter (additional to hard requirements)
    if (optionalFilters.priceRange) {
      if (optionalFilters.priceRange.min !== undefined) {
        filtered = filtered.filter(p => p.totalPrice >= optionalFilters.priceRange!.min!);
        logger.info(`💰 After optional minPrice filter (>=$${optionalFilters.priceRange.min.toLocaleString()}): ${filtered.length} properties`);
      }
      if (optionalFilters.priceRange.max !== undefined) {
        filtered = filtered.filter(p => p.totalPrice <= optionalFilters.priceRange!.max!);
        logger.info(`💰 After optional maxPrice filter (<=$${optionalFilters.priceRange.max.toLocaleString()}): ${filtered.length} properties`);
      }
    }

    // Furnished filter
    if (optionalFilters.furnished !== undefined) {
      filtered = filtered.filter(p => {
        const description = (p.description || '').toLowerCase();
        const title = (p.title || '').toLowerCase();
        const isFurnished = description.includes('amoblado') || description.includes('amueblado') ||
                           title.includes('amoblado') || title.includes('amueblado');
        return optionalFilters.furnished ? isFurnished : !isFurnished;
      });
      logger.info(`🪑 After furnished filter (${optionalFilters.furnished}): ${filtered.length} properties`);
    }

    // Parking filter
    if (optionalFilters.parking !== undefined) {
      filtered = filtered.filter(p => optionalFilters.parking ? (p.parking || 0) > 0 : (p.parking || 0) === 0);
      logger.info(`🚗 After optional parking filter (${optionalFilters.parking}): ${filtered.length} properties`);
    }

    // Pets filter
    if (optionalFilters.pets !== undefined) {
      filtered = filtered.filter(p => {
        const description = (p.description || '').toLowerCase();
        const title = (p.title || '').toLowerCase();
        const allowsPets = description.includes('mascota') || description.includes('perro') ||
                          description.includes('gato') || title.includes('mascota');
        return optionalFilters.pets ? allowsPets : !allowsPets;
      });
      logger.info(`🐕 After pets filter (${optionalFilters.pets}): ${filtered.length} properties`);
    }

    logger.info(`✅ Optional filters applied: ${properties.length} -> ${filtered.length} properties`);
    return filtered;

  }

  /**
   * Generate search summary
   */
  private generateSummary(allMatches: Property[], rankedProperties: Property[]): SearchSummary {
    const hardMatches = allMatches.length;

    // Calculate averages
    const averagePrice = rankedProperties.reduce((sum, p) => sum + p.price, 0) / rankedProperties.length || 0;
    const averagePricePerM2 = rankedProperties.reduce((sum, p) => sum + p.pricePerM2, 0) / rankedProperties.length || 0;
    const averageArea = rankedProperties.reduce((sum, p) => sum + p.area, 0) / rankedProperties.length || 0;

    // Source breakdown
    const sourceBreakdown = rankedProperties.reduce((acc, p) => {
      acc[p.source] = (acc[p.source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Neighborhood breakdown
    const neighborhoodBreakdown = rankedProperties.reduce((acc, p) => {
      const neighborhood = p.location.neighborhood || 'Sin especificar';
      acc[neighborhood] = (acc[neighborhood] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Price distribution
    const priceDistribution = this.calculatePriceDistribution(rankedProperties);

    return {
      totalFound: allMatches.length,
      hardMatches,
      averagePrice: Math.round(averagePrice),
      averagePricePerM2: Math.round(averagePricePerM2),
      averageArea: Math.round(averageArea),
      sourceBreakdown,
      sources: sourceBreakdown,
      neighborhoodBreakdown,
      priceDistribution
    };
  }

  /**
   * Calculate price distribution
   */
  private calculatePriceDistribution(properties: Property[]): SearchSummary['priceDistribution'] {
    const ranges = [
      { min: 0, max: 2000000, label: 'Menos de $2M' },
      { min: 2000000, max: 3000000, label: '$2M - $3M' },
      { min: 3000000, max: 4000000, label: '$3M - $4M' },
      { min: 4000000, max: 5000000, label: '$4M - $5M' },
      { min: 5000000, max: Infinity, label: 'Más de $5M' }
    ];

    const total = properties.length;

    return ranges.map(range => {
      const count = properties.filter(p =>
        p.totalPrice >= range.min && p.totalPrice < range.max
      ).length;

      return {
        range: range.label,
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0
      };
    }).filter(item => item.count > 0);
  }

  /**
   * Get property recommendations based on user preferences
   */
  async getRecommendations(
    userId: string,
    criteria: SearchCriteria,
    limit: number = 5
  ): Promise<Property[]> {
    // This could be enhanced with ML-based recommendations
    const searchResult = await this.search(criteria, 1, limit * 2);

    // Return top-scored properties
    return searchResult.properties.slice(0, limit);
  }

  /**
   * Get similar properties to a given property
   */
  async getSimilarProperties(propertyId: string, limit: number = 5): Promise<Property[]> {
    const referenceProperty = await PropertyModel.findOne({
      $or: [{ _id: propertyId }, { id: propertyId }],
      isActive: true
    });

    if (!referenceProperty) {
      throw new Error('Reference property not found');
    }

    // Build similarity criteria
    const criteria: SearchCriteria = {
      hardRequirements: {
        minRooms: Math.max(1, referenceProperty.rooms - 1),
        maxRooms: referenceProperty.rooms + 1,
        minArea: Math.round(referenceProperty.area * 0.8),
        maxArea: Math.round(referenceProperty.area * 1.2),
        maxTotalPrice: Math.round(referenceProperty.totalPrice * 1.3),
        allowAdminOverage: true,
        location: {
          city: referenceProperty.location.city,
          neighborhoods: referenceProperty.location.neighborhood ? [referenceProperty.location.neighborhood] : undefined
        }
      },
      preferences: {
        wetAreas: [],
        sports: [],
        amenities: referenceProperty.amenities.slice(0, 3), // Use first 3 amenities as preferences
        weights: {
          wetAreas: 0.5,
          sports: 0.5,
          amenities: 1.0,
          location: 1.0,
          pricePerM2: 0.5
        }
      }
    };

    const searchResult = await this.search(criteria, 1, limit + 1);

    // Remove the reference property from results
    return searchResult.properties.filter(p => p.id !== referenceProperty.id).slice(0, limit);
  }

  private isPartialMatch(requestedNeighborhood: string, address: string): boolean {
    // Very flexible partial matching
    const words = requestedNeighborhood.split(' ');

    // If any word from the neighborhood name appears in the address (minimum 3 chars)
    const wordMatch = words.some(word =>
      word.length >= 3 && address.includes(word.toLowerCase())
    );

    // Also check for similar sounding neighborhoods or common variations - USAR LOCATIONDETECTOR
    const variations = LocationDetector.getNeighborhoodVariations(requestedNeighborhood);
    const variationMatch = variations.some((variation: string) =>
      address.includes(variation.toLowerCase())
    );

    return wordMatch || variationMatch;
  }

}
