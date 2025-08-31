#!/usr/bin/env ts-node

/**
 * 🚀 TEST DE MÚLTIPLES UBICACIONES
 * 
 * Permite hacer búsquedas en diferentes barrios y generar tabla de resultados
 */

import { SearchCriteria, Property } from '../core/types';
import { logger } from '../utils/logger';

// Ubicaciones a probar
const LOCATIONS = [
  { name: 'Usaquén', neighborhood: 'Usaquén' },
  { name: 'Suba', neighborhood: 'Suba' },
  { name: 'Chapinero', neighborhood: 'Chapinero' }
];

// Scrapers a probar
const SCRAPERS = [
  'fincaraiz',
  'ciencuadras', 
  'metrocuadrado',
  'arriendo',
  'mercadolibre',
  'properati',
  'pads',
  'trovit'
];

function createCriteria(neighborhood: string): SearchCriteria {
  return {
    hardRequirements: {
      location: {
        city: 'Bogotá',
        neighborhoods: [neighborhood]
      },
      minRooms: 1,
      minArea: 1,
      maxTotalPrice: 50000000,
      allowAdminOverage: true
    },
    optionalFilters: {},
    preferences: {
      wetAreas: [],
      sports: [],
      amenities: [],
      weights: {
        wetAreas: 0.1,
        sports: 0.1,
        amenities: 0.1,
        location: 0.25,
        pricePerM2: 0.45
      }
    }
  };
}

async function testScraper(scraperName: string, criteria: SearchCriteria): Promise<{ count: number; time: number; error?: string }> {
  try {
    const scraperMap: { [key: string]: string } = {
      'fincaraiz': '../core/scraping/scrapers/FincaraizScraper',
      'ciencuadras': '../core/scraping/scrapers/CiencuadrasScraper',
      'metrocuadrado': '../core/scraping/scrapers/MetrocuadradoScraper',
      'arriendo': '../core/scraping/scrapers/ArriendoScraper',
      'mercadolibre': '../core/scraping/scrapers/MercadoLibreScraper',
      'properati': '../core/scraping/scrapers/ProperatiScraper',
      'pads': '../core/scraping/scrapers/PadsScraper',
      'trovit': '../core/scraping/scrapers/TrovitScraper'
    };

    const scraperPath = scraperMap[scraperName];
    if (!scraperPath) {
      return { count: 0, time: 0, error: 'Scraper no encontrado' };
    }

    const scraperModule = require(scraperPath);
    const ScraperClass = scraperModule[Object.keys(scraperModule)[0]];
    const scraper = new ScraperClass();

    const startTime = Date.now();
    const properties = await scraper.scrape(criteria, 2);
    const endTime = Date.now();

    return {
      count: properties.length,
      time: endTime - startTime
    };

  } catch (error: any) {
    return {
      count: 0,
      time: 0,
      error: error.message?.substring(0, 50) + '...'
    };
  }
}

async function testLocation(locationName: string, neighborhood: string) {
  console.log(`\n🏙️  TESTING ${locationName.toUpperCase()}`);
  console.log('='.repeat(60));

  const criteria = createCriteria(neighborhood);
  const results: { [scraper: string]: { count: number; time: number; error?: string } } = {};

  for (const scraperName of SCRAPERS) {
    console.log(`   🔍 ${scraperName}...`);
    results[scraperName] = await testScraper(scraperName, criteria);
  }

  return results;
}

function generateTable(allResults: { [location: string]: { [scraper: string]: { count: number; time: number; error?: string } } }) {
  console.log('\n📊 TABLA DE RESULTADOS POR PROVEEDOR Y UBICACIÓN');
  console.log('='.repeat(80));

  // Header
  const locations = Object.keys(allResults);
  let header = '| Proveedor'.padEnd(15) + ' |';
  locations.forEach(location => {
    header += ` ${location}`.padEnd(12) + ' |';
  });
  console.log(header);

  // Separator
  let separator = '|' + '-'.repeat(14) + '|';
  locations.forEach(() => {
    separator += '-'.repeat(12) + '|';
  });
  console.log(separator);

  // Data rows
  SCRAPERS.forEach(scraper => {
    let row = `| ${scraper}`.padEnd(15) + ' |';
    locations.forEach(location => {
      const result = allResults[location][scraper];
      let cell = '';
      if (result.error) {
        cell = '❌ ERROR';
      } else if (result.count === 0) {
        cell = '⭕ 0';
      } else {
        cell = `✅ ${result.count}`;
      }
      row += ` ${cell}`.padEnd(12) + ' |';
    });
    console.log(row);
  });

  console.log('\n📈 RESUMEN DE TIEMPOS (ms):');
  console.log('='.repeat(50));
  
  SCRAPERS.forEach(scraper => {
    let row = `${scraper}:`.padEnd(15);
    locations.forEach(location => {
      const result = allResults[location][scraper];
      const time = result.error ? 'ERROR' : `${result.time}ms`;
      row += ` ${time}`.padEnd(12);
    });
    console.log(row);
  });
}

async function main() {
  console.log('\n🚀 TEST DE MÚLTIPLES UBICACIONES');
  console.log('='.repeat(70));
  console.log(`📍 Ubicaciones: ${LOCATIONS.map(l => l.name).join(', ')}`);
  console.log(`🔧 Scrapers: ${SCRAPERS.length} proveedores`);

  const allResults: { [location: string]: { [scraper: string]: { count: number; time: number; error?: string } } } = {};

  for (const location of LOCATIONS) {
    allResults[location.name] = await testLocation(location.name, location.neighborhood);
  }

  generateTable(allResults);

  // Estadísticas finales
  console.log('\n🎯 ESTADÍSTICAS FINALES:');
  console.log('='.repeat(50));
  
  let totalProperties = 0;
  let workingScrapers = 0;
  let totalScrapers = 0;

  Object.values(allResults).forEach(locationResults => {
    Object.values(locationResults).forEach(result => {
      totalScrapers++;
      if (!result.error && result.count > 0) {
        workingScrapers++;
        totalProperties += result.count;
      }
    });
  });

  console.log(`📊 Total propiedades encontradas: ${totalProperties}`);
  console.log(`✅ Scrapers funcionando: ${workingScrapers}/${totalScrapers}`);
  console.log(`📈 Tasa de éxito: ${((workingScrapers / totalScrapers) * 100).toFixed(1)}%`);
}

if (require.main === module) {
  main().catch(console.error);
}
