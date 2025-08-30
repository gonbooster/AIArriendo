import { Property as PropertyModel } from '../../models/Property';
import { SearchCriteria, SearchResult, SearchSummary, Property } from '../types';
import { PropertyScorer } from '../scoring/PropertyScorer';
// import { ScrapingEngine } from '../scraping/ScrapingEngine';
import { SCRAPING_SOURCES } from '../../config/scraping-sources';
import { logger } from '../../utils/logger';
import { searchResultsExporter } from './SearchResultsExporter';
import { RateLimiter } from '../scraping/RateLimiter';
import { BaseScraper } from '../scraping/BaseScraper';
import { ProperatiScraper } from '../scraping/scrapers/ProperatiScraper';

import { PropertyValidator } from '../scraping/PropertyValidator';
export class SearchService {
  private scorer: PropertyScorer;
  private validator: PropertyValidator;
  // private scrapingEngine: ScrapingEngine;

  constructor() {
    this.scorer = new PropertyScorer();
    this.validator = new PropertyValidator();
    // this.scrapingEngine = new ScrapingEngine();
  }

  /**
   * Execute search with criteria
   */
  async search(
    criteria: SearchCriteria,
    page: number = 1,
    limit: number = 200
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

      // 1.1 De-duplicate by canonical URL or (title+price)
      const seen = new Set<string>();
      scrapedProperties = scrapedProperties.filter(p => {
        const key = (p.url && p.url.includes('http')) ? p.url : `${(p.title||'').toLowerCase()}|${p.totalPrice}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      logger.info(`After de-duplication: ${scrapedProperties.length} properties`);

      // 1.5. Apply quality filters
      const qualityFiltered = scrapedProperties.filter(p => this.validator.isValid(p));
      // APPLY HARD FILTERS - Filter by search criteria
      const hardFiltered = this.filterPropertiesByCriteria(qualityFiltered, criteria);
      logger.info(`After hard filters applied: ${hardFiltered.length} properties remaining`);

      // 2. Apply optional filters
      const optionalFilteredProperties = this.applyOptionalFilters(hardFiltered, criteria);
      logger.info(`After optional filters applied: ${optionalFilteredProperties.length} properties remaining`);

      // 3. Score and rank properties
      const scoredProperties = this.scorer.scoreProperties(optionalFilteredProperties, criteria);
      logger.info(`Properties scored and ranked`);

      // 4. Apply pagination
      const total = scoredProperties.length;
      const startIndex = (page - 1) * limit;
      const paginatedProperties = scoredProperties.slice(startIndex, startIndex + limit);

      // 5. Generate summary
      const summary = this.generateSummary(scrapedProperties, scoredProperties);

      const executionTime = Date.now() - startTime;
      logger.info(`Search completed in ${executionTime}ms. Returning ${paginatedProperties.length} of ${total} properties`);

      // Export results to TXT files (summary, per source, raw json)
      try {
        await searchResultsExporter.exportSearchResults(paginatedProperties, criteria, `${startTime}`);
      } catch (exportError) {
        logger.error('Failed to export search results:', exportError);
      }

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

      const perSourceMaxPages = Number(process.env.SCRAPER_MAX_PAGES) || 3; // bajar páginas por fuente
      const perSourceTimeoutMs = Number(process.env.SCRAPER_TIMEOUT_MS) || 70000; // 70s por fuente

      // Helper para timeout por fuente
      const withTimeout = <T,>(p: Promise<T>, ms: number): Promise<T | null> => {
        return new Promise((resolve) => {
          const t = setTimeout(() => resolve(null), ms);
          p.then((v) => { clearTimeout(t); resolve(v); }).catch((_e) => { clearTimeout(t); resolve(null); });
        });
      };

      // Ejecutar scrapers reales en paralelo con rate limiters
      const scrapers: BaseScraper[] = activeSources.map((source) => {
        const limiter = new RateLimiter(source.rateLimit);
        switch (source.id) {
          case 'ciencuadras':
            return new (require('../scraping/scrapers/CiencuadrasScraper').CiencuadrasScraper)(source, limiter);
          case 'metrocuadrado':
            return new (require('../scraping/scrapers/MetrocuadradoScraper').MetrocuadradoScraper)(source, limiter);
          case 'fincaraiz':
            return new (require('../scraping/scrapers/FincaraizScraper').FincaraizScraper)(source, limiter);
          case 'mercadolibre':
            return new (require('../scraping/scrapers/MercadoLibreScraper').MercadoLibreScraper)(source, limiter);
          case 'properati':
            return new ProperatiScraper(source, limiter);
          case 'pads':
            return new (require('../scraping/scrapers/PadsScraper').PadsScraper)(source, limiter);
          case 'trovit':
            return new (require('../scraping/scrapers/TrovitScraper').TrovitScraper)(source, limiter);
          case 'rentola':
            return new (require('../scraping/scrapers/RentolaScraper').RentolaScraper)(source, limiter);
          case 'arriendo':
            return new (require('../scraping/scrapers/ArriendoScraper').ArriendoScraper)(source, limiter);
          default:
            return new BaseScraper(source, limiter);
        }
      });

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

    // Rooms filter
    if (hardReq.minRooms !== undefined) {
      filtered = filtered.filter(p => p.rooms >= hardReq.minRooms!);
      logger.info(`🛏️  After minRooms filter (>=${hardReq.minRooms}): ${filtered.length} properties`);
    }
    if (hardReq.maxRooms !== undefined) {
      filtered = filtered.filter(p => p.rooms <= hardReq.maxRooms!);
      logger.info(`🛏️  After maxRooms filter (<=${hardReq.maxRooms}): ${filtered.length} properties`);
    }

    // Bathrooms filter
    if (hardReq.minBathrooms !== undefined) {
      filtered = filtered.filter(p => (p.bathrooms || 0) >= hardReq.minBathrooms!);
      logger.info(`🚿 After minBathrooms filter (>=${hardReq.minBathrooms}): ${filtered.length} properties`);
    }
    if (hardReq.maxBathrooms !== undefined) {
      filtered = filtered.filter(p => (p.bathrooms || 0) <= hardReq.maxBathrooms!);
      logger.info(`🚿 After maxBathrooms filter (<=${hardReq.maxBathrooms}): ${filtered.length} properties`);
    }

    // Area filter
    if (hardReq.minArea !== undefined) {
      filtered = filtered.filter(p => p.area >= hardReq.minArea!);
      logger.info(`📐 After minArea filter (>=${hardReq.minArea}m²): ${filtered.length} properties`);
    }
    if (hardReq.maxArea !== undefined) {
      filtered = filtered.filter(p => p.area <= hardReq.maxArea!);
      logger.info(`📐 After maxArea filter (<=${hardReq.maxArea}m²): ${filtered.length} properties`);
    }

    // Price filter
    if (hardReq.minTotalPrice !== undefined) {
      filtered = filtered.filter(p => p.totalPrice >= hardReq.minTotalPrice!);
      logger.info(`💰 After minPrice filter (>=$${hardReq.minTotalPrice.toLocaleString()}): ${filtered.length} properties`);
    }
    if (hardReq.maxTotalPrice !== undefined) {
      filtered = filtered.filter(p => p.totalPrice <= hardReq.maxTotalPrice!);
      logger.info(`💰 After maxPrice filter (<=$${hardReq.maxTotalPrice.toLocaleString()}): ${filtered.length} properties`);
    }

    // Parking filter
    if (hardReq.minParking !== undefined) {
      filtered = filtered.filter(p => (p.parking || 0) >= hardReq.minParking!);
      logger.info(`🚗 After minParking filter (>=${hardReq.minParking}): ${filtered.length} properties`);
    }
    if (hardReq.maxParking !== undefined) {
      filtered = filtered.filter(p => (p.parking || 0) <= hardReq.maxParking!);
      logger.info(`🚗 After maxParking filter (<=${hardReq.maxParking}): ${filtered.length} properties`);
    }

    // Stratum filter - MEJORADO: Permitir estrato 0 (no detectado)
    if (hardReq.minStratum !== undefined) {
      filtered = filtered.filter(p => {
        const stratum = p.stratum || 0;
        // Si el estrato es 0 (no detectado), lo consideramos válido
        return stratum === 0 || stratum >= hardReq.minStratum!;
      });
      logger.info(`🏢 After minStratum filter (>=${hardReq.minStratum} or undetected): ${filtered.length} properties`);
    }
    if (hardReq.maxStratum !== undefined) {
      filtered = filtered.filter(p => {
        const stratum = p.stratum || 0;
        // Si el estrato es 0 (no detectado), lo consideramos válido
        return stratum === 0 || stratum <= hardReq.maxStratum!;
      });
      logger.info(`🏢 After maxStratum filter (<=${hardReq.maxStratum} or undetected): ${filtered.length} properties`);
    }

    // Property type filter
    if (hardReq.propertyTypes && hardReq.propertyTypes.length > 0) {
      filtered = filtered.filter(p => {
        // Check title and description for property type since propertyType field doesn't exist
        const title = (p.title || '').toLowerCase();
        const description = (p.description || '').toLowerCase();
        return hardReq.propertyTypes!.some(type =>
          title.includes(type.toLowerCase()) ||
          description.includes(type.toLowerCase()) ||
          type.toLowerCase().includes('apartamento') && (title.includes('apartamento') || title.includes('apto'))
        );
      });
      logger.info(`🏠 After propertyTypes filter (${hardReq.propertyTypes.join(', ')}): ${filtered.length} properties`);
    }

    // Location filter (neighborhoods) - MEJORADO: Más flexible
    if (hardReq.location?.neighborhoods && hardReq.location.neighborhoods.length > 0) {
      filtered = filtered.filter(p => {
        const propertyNeighborhood = (p.location.neighborhood || '').toLowerCase();
        const propertyAddress = (p.location.address || '').toLowerCase();
        const propertyCity = (p.location.city || '').toLowerCase();

        return hardReq.location!.neighborhoods!.some(neighborhood => {
          const searchNeighborhood = neighborhood.toLowerCase();

          // Mapeo de variaciones comunes - EXPANDIDO PARA SUBA
          const neighborhoodVariations: { [key: string]: string[] } = {
            'suba': [
              'suba', 'ciudad jardin norte', 'bosque calderon', 'mazuren', 'cerros de suba',
              'guaymaral', 'la conejera', 'tibabuyes', 'rincón', 'prado veraniego',
              'niza', 'alhambra', 'san josé de bavaria', 'lisboa', 'santa cecilia',
              'bilbao', 'casa blanca suba', 'compartir', 'el prado', 'la gaitana',
              'san pedro', 'tuna alta', 'tuna baja', 'verbenal', 'villa cindy'
            ],
            'usaquen': ['usaquen', 'usaquén', 'el verbenal', 'santa barbara', 'santa bárbara'],
            'chapinero': ['chapinero', 'chico', 'nogal', 'zona rosa']
          };

          // Buscar coincidencias directas
          const directMatch = propertyNeighborhood.includes(searchNeighborhood) ||
                             propertyAddress.includes(searchNeighborhood) ||
                             searchNeighborhood.includes(propertyNeighborhood);

          if (directMatch) return true;

          // Buscar coincidencias con variaciones
          const variations = neighborhoodVariations[searchNeighborhood] || [];
          return variations.some(variation =>
            propertyNeighborhood.includes(variation) ||
            propertyAddress.includes(variation)
          );
        });
      });
      logger.info(`📍 After neighborhoods filter (${hardReq.location.neighborhoods.join(', ')} + variations): ${filtered.length} properties`);
    }

    logger.info(`✅ Hard filters applied: ${properties.length} -> ${filtered.length} properties`);
    return filtered;

    /* FILTROS DESACTIVADOS:
    return properties.filter(property => {
      const { hardRequirements } = criteria;

      // Filter by rooms
      if (hardRequirements.minRooms && property.rooms < hardRequirements.minRooms) {
        return false;
      }
      if (hardRequirements.maxRooms && property.rooms > hardRequirements.maxRooms) {
        return false;
      }

      // Filter by bathrooms (using any type for now to avoid TypeScript errors)
      const anyRequirements = hardRequirements as any;
      if (anyRequirements.minBathrooms && property.bathrooms && property.bathrooms < anyRequirements.minBathrooms) {
        return false;
      }
      if (anyRequirements.maxBathrooms && property.bathrooms && property.bathrooms > anyRequirements.maxBathrooms) {
        return false;
      }

      // Filter by area
      if (hardRequirements.minArea && property.area < hardRequirements.minArea) {
        return false;
      }
      if (hardRequirements.maxArea && property.area > hardRequirements.maxArea) {
        return false;
      }

      // Filter by price
      if (hardRequirements.maxTotalPrice && property.totalPrice > hardRequirements.maxTotalPrice) {
        return false;
      }

      // Filter by parking (using any type for now to avoid TypeScript errors)
      if (anyRequirements.minParking !== undefined && property.parking !== undefined && property.parking < anyRequirements.minParking) {
        return false;
      }
      if (anyRequirements.maxParking !== undefined && property.parking !== undefined && property.parking > anyRequirements.maxParking) {
        return false;
      }

      // Filter by location/neighborhoods
      if (hardRequirements.location?.neighborhoods?.length) {
        const requestedNeighborhoods = hardRequirements.location.neighborhoods;
        const addr = (property.location.address || '').toLowerCase();
        const neigh = (property.location.neighborhood || '').toLowerCase();

        const match = requestedNeighborhoods.some(n => {
          const nLower = n.toLowerCase();
          return neigh.includes(nLower) ||
                 addr.includes(nLower) ||
                 // Flexible matching for partial neighborhood names
                 this.isPartialMatch(nLower, addr);
        });

        if (!match) {
          return false;
        }
      }

      return true; // Property passes all filters
    });
    */
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

    /* FILTROS OPCIONALES DESACTIVADOS:
    let filtered = [...properties];

    const optionalFilters = criteria.optionalFilters;
    if (!optionalFilters) return filtered;

    // Source filter
    if (optionalFilters.sources && optionalFilters.sources.length > 0) {
      filtered = filtered.filter(p => optionalFilters.sources!.includes(p.source));
    }

    // Neighborhoods filter (additional to hard requirements)
    if (optionalFilters.neighborhoods && optionalFilters.neighborhoods.length > 0) {
      filtered = filtered.filter(p =>
        p.location.neighborhood &&
        optionalFilters.neighborhoods!.some(n =>
          p.location.neighborhood!.toLowerCase().includes(n.toLowerCase())
        )
      );
    }

    // Price range filter (additional to hard requirements)
    if (optionalFilters.priceRange) {
      if (optionalFilters.priceRange.min) {
        filtered = filtered.filter(p => p.totalPrice >= optionalFilters.priceRange!.min!);
      }
      if (optionalFilters.priceRange.max) {
        filtered = filtered.filter(p => p.totalPrice <= optionalFilters.priceRange!.max!);
      }
    }

    // Furnished filter
    if (optionalFilters.furnished !== undefined) {
      filtered = filtered.filter(p =>
        Boolean(p.metadata?.furnished) === optionalFilters.furnished
      );
    }

    // Parking filter
    if (optionalFilters.parking !== undefined) {
      filtered = filtered.filter(p =>
        Boolean(p.metadata?.parking) === optionalFilters.parking
      );
    }

    // Pets filter
    if (optionalFilters.pets !== undefined) {
      filtered = filtered.filter(p =>
        Boolean(p.metadata?.pets) === optionalFilters.pets
      );
    }

    return filtered;
    */
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

  /**
   * Get fallback properties when real-time search fails
   * Implements the search strategy: base search + incremental searches with each priority amenity
   */
  // REMOVED: getFallbackProperties - mocks eliminated
  // (intentionally blank)

  /**
   * Check if a neighborhood name partially matches the address
   */
  private isPartialMatch(requestedNeighborhood: string, address: string): boolean {
    // Very flexible partial matching
    const words = requestedNeighborhood.split(' ');

    // If any word from the neighborhood name appears in the address (minimum 3 chars)
    const wordMatch = words.some(word =>
      word.length >= 3 && address.includes(word.toLowerCase())
    );

    // Also check for similar sounding neighborhoods or common variations
    const variations = this.getNeighborhoodVariations(requestedNeighborhood);
    const variationMatch = variations.some(variation =>
      address.includes(variation.toLowerCase())
    );

    return wordMatch || variationMatch;
  }

  /**
   * Get common variations and similar neighborhoods
   */
  private getNeighborhoodVariations(neighborhood: string): string[] {
    const variations: Record<string, string[]> = {
      'suba': [
        'ciudad jardin norte', 'bosque calderon', 'mazuren', 'cerros de suba',
        'guaymaral', 'la conejera', 'tibabuyes', 'rincón', 'prado veraniego',
        'niza', 'alhambra', 'san josé de bavaria', 'lisboa', 'santa cecilia',
        'bilbao', 'casa blanca suba', 'compartir', 'el prado', 'la gaitana',
        'san pedro', 'tuna alta', 'tuna baja', 'verbenal', 'villa cindy',
        'britalia', 'garcés navas', 'engativá', 'fontibón'
      ],
      'usaquen': ['usaquén', 'santa barbara', 'cedritos', 'country', 'santa ana'],
      'cedritos': ['usaquen', 'usaquén', 'santa barbara', 'country club'],
      'chapinero': ['zona rosa', 'rosales', 'chico', 'nogal', 'chicó'],
      'el poblado': ['poblado', 'zona rosa'],
      'laureles': ['estadio', 'carlos e restrepo'],
      'zona rosa': ['chapinero', 'rosales'],
      'chico': ['chapinero', 'chicó', 'chico navarra'],
      'rosales': ['chapinero', 'zona rosa'],
      'santa barbara': ['usaquen', 'cedritos', 'country club']
    };

    return variations[neighborhood.toLowerCase()] || [];
  }

  /**
   * Genera URLs reales de anuncios específicos en los portales
   */
  private getRealPropertyUrl(sourceIndex: number, neighborhood: string, rooms: number, price: number): string {
    // Generate dynamic URLs based on the neighborhood
    const neighborhoodSlug = neighborhood.toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[áéíóúñü]/g, (match) => {
        const map: Record<string, string> = { 'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u', 'ñ': 'n', 'ü': 'u' };
        return map[match] || match;
      });

    const urlTemplates = {
      fincaraiz: `https://www.fincaraiz.com.co/arriendo/apartamentos/bogota/${neighborhoodSlug}`,
      metrocuadrado: `https://www.metrocuadrado.com/apartamentos/arriendo/bogota/${neighborhoodSlug}/`,
      trovit: `https://apartamentos.trovit.com.co/apartamentos-${neighborhoodSlug}-bogota`,
      ciencuadras: `https://www.ciencuadras.com/apartamentos-arriendo-${neighborhoodSlug}-bogota`
    };

    const sources = ['fincaraiz', 'metrocuadrado', 'trovit', 'ciencuadras'];
    const sourceName = sources[sourceIndex] as keyof typeof urlTemplates;

    // Return the dynamic URL for the specific source
    return urlTemplates[sourceName] || urlTemplates.fincaraiz;
  }










}
