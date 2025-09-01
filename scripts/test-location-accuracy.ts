#!/usr/bin/env ts-node

/**
 * 🎯 TEST DE PRECISIÓN DE UBICACIÓN POR PROVEEDOR
 * 
 * Este test analiza cada proveedor individualmente para verificar que:
 * 1. Las búsquedas por ubicación específica devuelven resultados relevantes
 * 2. No se mezclan resultados de otras ubicaciones
 * 3. Cada proveedor maneja correctamente las URLs específicas de ubicación
 * 
 * Ubicaciones de prueba: Mazurén, Chapinero, Usaquén
 */

import { SearchCriteria } from '../core/types';
import { SCRAPING_SOURCES } from '../config/scrapingSources';
import { LocationDetector } from '../core/utils/LocationDetector';
import { logger } from '../utils/logger';

// Importar scrapers dinámicamente
const getScraperInstance = (scraperId: string) => {
  switch (scraperId) {
    case 'ciencuadras':
      return new (require('../core/scraping/scrapers/CiencuadrasScraper').CiencuadrasScraper)();
    case 'metrocuadrado':
      return new (require('../core/scraping/scrapers/MetrocuadradoScraper').MetrocuadradoScraper)();
    case 'fincaraiz':
      return new (require('../core/scraping/scrapers/FincaraizScraper').FincaraizScraper)();
    case 'mercadolibre':
      return new (require('../core/scraping/scrapers/MercadoLibreScraper').MercadoLibreScraper)();
    case 'properati':
      return new (require('../core/scraping/scrapers/ProperatiScraper').ProperatiScraper)();
    case 'pads':
      return new (require('../core/scraping/scrapers/PadsScraper').PadsScraper)();
    case 'trovit':
      return new (require('../core/scraping/scrapers/TrovitScraper').TrovitScraper)();
    case 'rentola':
      return new (require('../core/scraping/scrapers/RentolaScraper').RentolaScraper)();
    case 'arriendo':
      return new (require('../core/scraping/scrapers/ArriendoScraper').ArriendoScraper)();
    default:
      return null;
  }
};

// Ubicaciones de prueba
const TEST_LOCATIONS = [
  {
    name: 'mazurén',
    aliases: ['mazuren'],
    city: 'bogotá',
    expectedKeywords: ['mazuren', 'mazurén', 'bogota', 'bogotá']
  },
  {
    name: 'chapinero',
    aliases: [],
    city: 'bogotá',
    expectedKeywords: ['chapinero', 'bogota', 'bogotá']
  },
  {
    name: 'usaquén',
    aliases: ['usaquen'],
    city: 'bogotá',
    expectedKeywords: ['usaquen', 'usaquén', 'bogota', 'bogotá']
  }
];

// Criterios base para las pruebas
const createTestCriteria = (location: string): SearchCriteria => ({
  hardRequirements: {
    operation: 'arriendo',
    propertyTypes: ['Apartamento'],
    minRooms: 1,
    maxRooms: 10,
    minBathrooms: 1,
    maxBathrooms: 10,
    minParking: 0,
    maxParking: 10,
    minArea: 20,
    maxArea: 500,
    minTotalPrice: 500000,
    maxTotalPrice: 10000000,
    allowAdminOverage: true,
    minStratum: 1,
    maxStratum: 6,
    location: {
      city: 'bogotá',
      neighborhoods: [location],
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
});

interface TestResult {
  scraperId: string;
  scraperName: string;
  location: string;
  totalProperties: number;
  relevantProperties: number;
  irrelevantProperties: number;
  accuracyPercentage: number;
  errors: string[];
  sampleProperties: Array<{
    title: string;
    location: string;
    url: string;
    isRelevant: boolean;
  }>;
  executionTime: number;
}

interface LocationTestSummary {
  location: string;
  totalScrapers: number;
  successfulScrapers: number;
  failedScrapers: number;
  averageAccuracy: number;
  bestPerformer: string;
  worstPerformer: string;
  results: TestResult[];
}

/**
 * Verificar si una propiedad es relevante para la ubicación buscada
 */
const isPropertyRelevant = (property: any, expectedLocation: any): boolean => {
  const propertyText = `${property.title} ${property.location?.address || ''} ${property.location?.neighborhood || ''}`.toLowerCase();
  
  // Verificar si contiene alguna palabra clave esperada
  const hasExpectedKeyword = expectedLocation.expectedKeywords.some((keyword: string) => 
    propertyText.includes(keyword.toLowerCase())
  );
  
  // Verificar si NO contiene ubicaciones de otras ciudades principales
  const otherCities = ['medellin', 'medellín', 'cali', 'barranquilla', 'cartagena', 'bucaramanga', 'manizales', 'pereira'];
  const hasOtherCity = otherCities.some(city => propertyText.includes(city));
  
  return hasExpectedKeyword && !hasOtherCity;
};

/**
 * Probar un scraper específico con una ubicación específica
 */
const testScraperLocation = async (scraperId: string, location: any): Promise<TestResult> => {
  const startTime = Date.now();
  const result: TestResult = {
    scraperId,
    scraperName: '',
    location: location.name,
    totalProperties: 0,
    relevantProperties: 0,
    irrelevantProperties: 0,
    accuracyPercentage: 0,
    errors: [],
    sampleProperties: [],
    executionTime: 0
  };

  try {
    logger.info(`🔍 Testing ${scraperId} for location: ${location.name}`);
    
    // Obtener instancia del scraper
    const scraper = getScraperInstance(scraperId);
    if (!scraper) {
      result.errors.push(`Scraper ${scraperId} not found`);
      return result;
    }

    result.scraperName = scraper.source?.name || scraperId;
    
    // Crear criterios de búsqueda
    const criteria = createTestCriteria(location.name);
    
    // Ejecutar scraping con límite de 1 página para rapidez
    const properties = await scraper.scrape(criteria, 1);
    result.totalProperties = properties.length;
    
    if (properties.length === 0) {
      result.errors.push('No properties found');
      return result;
    }

    // Analizar relevancia de cada propiedad
    properties.forEach((property: any, index: number) => {
      const isRelevant = isPropertyRelevant(property, location);
      
      if (isRelevant) {
        result.relevantProperties++;
      } else {
        result.irrelevantProperties++;
      }
      
      // Guardar muestra de las primeras 5 propiedades
      if (index < 5) {
        result.sampleProperties.push({
          title: property.title || 'Sin título',
          location: property.location?.address || property.location?.neighborhood || 'Sin ubicación',
          url: property.url || 'Sin URL',
          isRelevant
        });
      }
    });
    
    // Calcular precisión
    result.accuracyPercentage = result.totalProperties > 0 
      ? Math.round((result.relevantProperties / result.totalProperties) * 100)
      : 0;
    
    logger.info(`✅ ${scraperId} - ${location.name}: ${result.relevantProperties}/${result.totalProperties} relevant (${result.accuracyPercentage}%)`);
    
  } catch (error) {
    logger.error(`❌ Error testing ${scraperId} for ${location.name}:`, error);
    result.errors.push(error instanceof Error ? error.message : String(error));
  }
  
  result.executionTime = Date.now() - startTime;
  return result;
};

/**
 * Probar todos los scrapers para una ubicación específica
 */
const testLocationAccuracy = async (location: any): Promise<LocationTestSummary> => {
  logger.info(`\n🎯 TESTING LOCATION: ${location.name.toUpperCase()}`);
  logger.info('='.repeat(50));
  
  const activeSources = SCRAPING_SOURCES.filter(source => source.isActive);
  const results: TestResult[] = [];
  
  // Probar cada scraper secuencialmente para evitar sobrecarga
  for (const source of activeSources) {
    const result = await testScraperLocation(source.id, location);
    results.push(result);
    
    // Pequeña pausa entre scrapers
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Calcular estadísticas
  const successfulResults = results.filter(r => r.errors.length === 0 && r.totalProperties > 0);
  const averageAccuracy = successfulResults.length > 0
    ? Math.round(successfulResults.reduce((sum, r) => sum + r.accuracyPercentage, 0) / successfulResults.length)
    : 0;
  
  const bestPerformer = successfulResults.length > 0
    ? successfulResults.reduce((best, current) => 
        current.accuracyPercentage > best.accuracyPercentage ? current : best
      ).scraperName
    : 'None';
  
  const worstPerformer = successfulResults.length > 0
    ? successfulResults.reduce((worst, current) => 
        current.accuracyPercentage < worst.accuracyPercentage ? current : worst
      ).scraperName
    : 'None';
  
  return {
    location: location.name,
    totalScrapers: activeSources.length,
    successfulScrapers: successfulResults.length,
    failedScrapers: activeSources.length - successfulResults.length,
    averageAccuracy,
    bestPerformer,
    worstPerformer,
    results
  };
};

/**
 * Función principal del test
 */
const runLocationAccuracyTest = async () => {
  logger.info('🚀 INICIANDO TEST DE PRECISIÓN DE UBICACIÓN POR PROVEEDOR');
  logger.info('='.repeat(60));

  // Primero analizar las URLs que se generan
  await analyzeScraperUrls();

  const allResults: LocationTestSummary[] = [];

  // Probar cada ubicación
  for (const location of TEST_LOCATIONS) {
    const locationResult = await testLocationAccuracy(location);
    allResults.push(locationResult);
  }

  // Generar reporte final
  generateFinalReport(allResults);
};

/**
 * Analizar URLs generadas por cada scraper
 */
const analyzeScraperUrls = async () => {
  logger.info('\n🔗 ANÁLISIS DE URLs GENERADAS POR SCRAPER');
  logger.info('='.repeat(50));

  for (const location of TEST_LOCATIONS) {
    logger.info(`\n📍 URLs para ${location.name}:`);

    const activeSources = SCRAPING_SOURCES.filter(source => source.isActive);

    for (const source of activeSources) {
      try {
        const scraper = getScraperInstance(source.id);
        if (!scraper) continue;

        const criteria = createTestCriteria(location.name);

        // Intentar obtener la URL que generaría el scraper
        if (typeof scraper.buildSearchUrl === 'function') {
          const url = scraper.buildSearchUrl(criteria, 1);
          logger.info(`  ${source.id.padEnd(15)}: ${url}`);
        } else if (typeof scraper.buildUrl === 'function') {
          const url = scraper.buildUrl(criteria, 1);
          logger.info(`  ${source.id.padEnd(15)}: ${url}`);
        } else {
          logger.info(`  ${source.id.padEnd(15)}: URL method not found`);
        }
      } catch (error) {
        logger.warn(`  ${source.id.padEnd(15)}: Error generating URL - ${error}`);
      }
    }
  }
};

/**
 * Generar reporte final consolidado
 */
const generateFinalReport = (results: LocationTestSummary[]) => {
  logger.info('\n📊 REPORTE FINAL DE PRECISIÓN DE UBICACIÓN');
  logger.info('='.repeat(60));
  
  // Resumen por ubicación
  results.forEach(locationResult => {
    logger.info(`\n📍 ${locationResult.location.toUpperCase()}`);
    logger.info(`   Scrapers exitosos: ${locationResult.successfulScrapers}/${locationResult.totalScrapers}`);
    logger.info(`   Precisión promedio: ${locationResult.averageAccuracy}%`);
    logger.info(`   Mejor performer: ${locationResult.bestPerformer}`);
    logger.info(`   Peor performer: ${locationResult.worstPerformer}`);
  });
  
  // Análisis por scraper
  logger.info('\n🔍 ANÁLISIS POR SCRAPER');
  logger.info('-'.repeat(40));
  
  const scraperAnalysis = new Map<string, {
    totalTests: number;
    successfulTests: number;
    averageAccuracy: number;
    accuracyScores: number[];
  }>();
  
  results.forEach(locationResult => {
    locationResult.results.forEach(scraperResult => {
      if (!scraperAnalysis.has(scraperResult.scraperId)) {
        scraperAnalysis.set(scraperResult.scraperId, {
          totalTests: 0,
          successfulTests: 0,
          averageAccuracy: 0,
          accuracyScores: []
        });
      }
      
      const analysis = scraperAnalysis.get(scraperResult.scraperId)!;
      analysis.totalTests++;
      
      if (scraperResult.errors.length === 0 && scraperResult.totalProperties > 0) {
        analysis.successfulTests++;
        analysis.accuracyScores.push(scraperResult.accuracyPercentage);
      }
    });
  });
  
  // Calcular promedios y mostrar resultados
  scraperAnalysis.forEach((analysis, scraperId) => {
    analysis.averageAccuracy = analysis.accuracyScores.length > 0
      ? Math.round(analysis.accuracyScores.reduce((sum, score) => sum + score, 0) / analysis.accuracyScores.length)
      : 0;
    
    logger.info(`${scraperId.padEnd(15)} | ${analysis.successfulTests}/${analysis.totalTests} tests | ${analysis.averageAccuracy}% accuracy`);
  });
  
  // Identificar problemas
  logger.info('\n⚠️  PROBLEMAS IDENTIFICADOS');
  logger.info('-'.repeat(40));
  
  results.forEach(locationResult => {
    locationResult.results.forEach(scraperResult => {
      if (scraperResult.errors.length > 0) {
        logger.warn(`${scraperResult.scraperId} - ${locationResult.location}: ${scraperResult.errors.join(', ')}`);
      } else if (scraperResult.accuracyPercentage < 50) {
        logger.warn(`${scraperResult.scraperId} - ${locationResult.location}: Baja precisión (${scraperResult.accuracyPercentage}%)`);
        
        // Mostrar muestra de propiedades irrelevantes
        const irrelevantSamples = scraperResult.sampleProperties.filter(p => !p.isRelevant);
        if (irrelevantSamples.length > 0) {
          logger.warn(`   Ejemplos irrelevantes:`);
          irrelevantSamples.forEach(sample => {
            logger.warn(`   - ${sample.title} | ${sample.location}`);
          });
        }
      }
    });
  });
  
  // Recomendaciones finales
  logger.info('\n💡 RECOMENDACIONES');
  logger.info('-'.repeat(40));

  const overallSuccessRate = results.reduce((sum, r) => sum + r.successfulScrapers, 0) /
                            results.reduce((sum, r) => sum + r.totalScrapers, 0) * 100;

  if (overallSuccessRate < 70) {
    logger.warn('⚠️  Tasa de éxito general baja. Revisar configuración de scrapers.');
  }

  const lowAccuracyScrapers = new Set<string>();
  results.forEach(locationResult => {
    locationResult.results.forEach(scraperResult => {
      if (scraperResult.accuracyPercentage < 50 && scraperResult.totalProperties > 0) {
        lowAccuracyScrapers.add(scraperResult.scraperId);
      }
    });
  });

  if (lowAccuracyScrapers.size > 0) {
    logger.warn(`⚠️  Scrapers con baja precisión: ${Array.from(lowAccuracyScrapers).join(', ')}`);
    logger.info('   Revisar LocationDetector y mapeos de URLs específicas.');
  }

  logger.info('\n✅ Test de precisión de ubicación completado');
};

/**
 * Test específico de LocationDetector
 */
const testLocationDetector = () => {
  logger.info('\n🎯 TESTING LOCATION DETECTOR');
  logger.info('='.repeat(40));

  TEST_LOCATIONS.forEach(location => {
    logger.info(`\n📍 Testing detection for: ${location.name}`);

    // Test detección básica
    const detected = LocationDetector.detectLocation(location.name);
    logger.info(`   Detected: ${JSON.stringify(detected)}`);

    // Test URLs específicas para cada scraper
    const activeSources = SCRAPING_SOURCES.filter(source => source.isActive);
    activeSources.forEach(source => {
      try {
        const cityUrl = LocationDetector.getCityUrl(location.city, source.id);
        const neighborhoodUrl = LocationDetector.getNeighborhoodUrl(location.name, source.id);

        logger.info(`   ${source.id.padEnd(15)}: city="${cityUrl}", neighborhood="${neighborhoodUrl}"`);
      } catch (error) {
        logger.warn(`   ${source.id.padEnd(15)}: Error - ${error}`);
      }
    });
  });
};

// Ejecutar el test si se llama directamente
if (require.main === module) {
  const runFullTest = async () => {
    // Test LocationDetector primero
    testLocationDetector();

    // Luego test completo de precisión
    await runLocationAccuracyTest();
  };

  runFullTest().catch(error => {
    logger.error('Error ejecutando test de precisión:', error);
    process.exit(1);
  });
}

export { runLocationAccuracyTest, testScraperLocation, isPropertyRelevant, testLocationDetector };
