/**
 * Test script to verify that URL generation is working correctly for ALL 9 scrapers
 */

import { FincaraizScraper } from './core/scraping/scrapers/FincaraizScraper';
import { ArriendoScraper } from './core/scraping/scrapers/ArriendoScraper';
import { CiencuadrasScraper } from './core/scraping/scrapers/CiencuadrasScraper';
import { MetrocuadradoScraper } from './core/scraping/scrapers/MetrocuadradoScraper';
import { MercadoLibreScraper } from './core/scraping/scrapers/MercadoLibreScraper';
import { ProperatiScraper } from './core/scraping/scrapers/ProperatiScraper';
import { PadsScraper } from './core/scraping/scrapers/PadsScraper';
import { TrovitScraper } from './core/scraping/scrapers/TrovitScraper';
import { RentolaScraper } from './core/scraping/scrapers/RentolaScraper';
import { SearchCriteria } from './core/types';

// Simple console logger
const logger = {
  info: (message: string, ...args: any[]) => console.log(`[INFO] ${message}`, ...args),
  error: (message: string, ...args: any[]) => console.error(`[ERROR] ${message}`, ...args)
};

// Test criteria for Mazurén, Bogotá
const testCriteria: SearchCriteria = {
  hardRequirements: {
    minRooms: 1,
    maxRooms: 3,
    minArea: 30,
    maxArea: 100,
    maxTotalPrice: 5000000,
    allowAdminOverage: false,
    location: {
      city: 'bogotá',
      neighborhoods: ['mazuren'],
      zones: []
    }
  },
  preferences: {
    wetAreas: [],
    sports: [],
    amenities: [],
    weights: {
      wetAreas: 0.1,
      sports: 0.1,
      amenities: 0.2,
      location: 0.3,
      pricePerM2: 0.3
    }
  }
};

// All 9 scrapers
const allScrapers = [
  { name: 'Fincaraiz', class: FincaraizScraper, method: 'buildFincaraizUrl' },
  { name: 'Arriendo.com', class: ArriendoScraper, method: 'buildArriendoUrl' },
  { name: 'Ciencuadras', class: CiencuadrasScraper, method: 'buildCiencuadrasUrl' },
  { name: 'Metrocuadrado', class: MetrocuadradoScraper, method: 'buildMetrocuadradoUrl' },
  { name: 'MercadoLibre', class: MercadoLibreScraper, method: 'buildMercadoLibreUrl' },
  { name: 'Properati', class: ProperatiScraper, method: 'buildProperatiUrl' },
  { name: 'PADS', class: PadsScraper, method: 'buildPadsUrl' },
  { name: 'Trovit', class: TrovitScraper, method: 'buildTrovitSearchUrl' },
  { name: 'Rentola', class: RentolaScraper, method: 'buildRentolaUrl' }
];

// Test zones
const testZones = [
  { name: 'Mazurén', neighborhoods: ['mazuren'], city: 'bogotá' },
  { name: 'Chapinero', neighborhoods: ['chapinero'], city: 'bogotá' },
  { name: 'Zona Rosa', neighborhoods: ['zona rosa'], city: 'bogotá' }
];

async function testUrlGeneration() {
  logger.info('🧪 Testing URL generation for ALL 9 scrapers with 3 zones...');

  const results: any = {};

  // Initialize results for all scrapers
  allScrapers.forEach(scraper => {
    results[scraper.name.toLowerCase().replace(/[^a-z]/g, '')] = [];
  });

  try {
    // Create scraper instances
    const scraperInstances = allScrapers.map(scraper => ({
      name: scraper.name,
      instance: new scraper.class(),
      method: scraper.method
    }));

    for (const zone of testZones) {
      logger.info(`\n🔍 Testing zone: ${zone.name}`);

      // Create criteria for this zone
      const zoneCriteria = {
        ...testCriteria,
        hardRequirements: {
          ...testCriteria.hardRequirements,
          location: {
            city: zone.city,
            neighborhoods: zone.neighborhoods,
            zones: []
          }
        }
      };

      // Test all scrapers
      for (const scraper of scraperInstances) {
        try {
          let url;
          // Special case for Trovit which needs page parameter
          if (scraper.name === 'Trovit') {
            url = (scraper.instance as any)[scraper.method](zoneCriteria, 1);
          } else {
            url = (scraper.instance as any)[scraper.method](zoneCriteria);
          }

          logger.info(`📍 ${scraper.name} URL: ${url}`);

          const key = scraper.name.toLowerCase().replace(/[^a-z]/g, '');
          results[key].push({
            zone: zone.name,
            url: url,
            working: url && url.length > 0 && !url.includes('undefined')
          });
        } catch (error) {
          logger.error(`❌ Error testing ${scraper.name}:`, error);
          const key = scraper.name.toLowerCase().replace(/[^a-z]/g, '');
          results[key].push({
            zone: zone.name,
            url: 'ERROR',
            working: false
          });
        }
      }
    }

    // Print comprehensive results table
    logger.info('\n📊 TABLA COMPLETA DE RESULTADOS (9 PROVEEDORES):');
    logger.info('='.repeat(120));

    // Header
    let header = '| ZONA        |';
    allScrapers.forEach(scraper => {
      header += ` ${scraper.name.padEnd(12)} |`;
    });
    logger.info(header);
    logger.info('='.repeat(120));

    // Results for each zone
    for (let i = 0; i < testZones.length; i++) {
      let row = `| ${testZones[i].name.padEnd(11)} |`;

      allScrapers.forEach(scraper => {
        const key = scraper.name.toLowerCase().replace(/[^a-z]/g, '');
        const status = results[key][i].working ? '✅ OK' : '❌ ERROR';
        row += ` ${status.padEnd(12)} |`;
      });

      logger.info(row);
    }

    logger.info('='.repeat(120));

    // Summary
    logger.info(`\n📈 RESUMEN COMPLETO:`);
    let totalWorking = 0;
    let totalTests = 0;

    allScrapers.forEach(scraper => {
      const key = scraper.name.toLowerCase().replace(/[^a-z]/g, '');
      const working = results[key].filter((r: any) => r.working).length;
      totalWorking += working;
      totalTests += testZones.length;

      const status = working === testZones.length ? '✅' : '⚠️';
      logger.info(`   ${status} ${scraper.name}: ${working}/${testZones.length} zonas funcionando`);
    });

    logger.info(`\n🎯 TOTAL GENERAL: ${totalWorking}/${totalTests} tests exitosos`);

    if (totalWorking === totalTests) {
      logger.info('🎉 ¡TODOS LOS 9 PROVEEDORES FUNCIONAN PERFECTAMENTE!');
    } else {
      logger.error(`⚠️  ${totalTests - totalWorking} tests fallaron`);
    }

  } catch (error) {
    logger.error('❌ Error during URL generation test:', error);
  }
}

// Run the test
testUrlGeneration().then(() => {
  logger.info('✅ Test completed');
  process.exit(0);
}).catch((error) => {
  logger.error('❌ Test failed:', error);
  process.exit(1);
});
