#!/usr/bin/env ts-node

/**
 * Test individual scrapers for Suba to see which ones are working
 */

import { SearchService } from '../core/services/SearchService';
import { SearchCriteria } from '../core/types';

// Criterios básicos para Suba
const subaCriteria: SearchCriteria = {
  hardRequirements: {
    minRooms: 1,
    maxRooms: 10,
    minBathrooms: 1,
    maxBathrooms: 10,
    minParking: 0,
    maxParking: 10,
    minArea: 1,
    maxArea: 1000,
    minTotalPrice: 1,
    maxTotalPrice: 50000000,
    allowAdminOverage: true,
    minStratum: 1,
    maxStratum: 6,
    propertyTypes: ['Apartamento', 'Casa', 'Apartaestudio', 'Loft', 'Penthouse'],
    operation: 'arriendo',
    location: {
      city: 'Bogotá',
      neighborhoods: ['Suba'],
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
      location: 0,
      pricePerM2: 0
    }
  },
  optionalFilters: {}
};

async function testIndividualScrapers() {
  console.log('🔍 TESTING INDIVIDUAL SCRAPERS FOR SUBA');
  console.log('='.repeat(80));

  // Lista de todos los scrapers
  const scrapers = [
    'fincaraiz',
    'mercadolibre',
    'ciencuadras',
    'trovit',
    'properati',
    'metrocuadrado'
  ];

  for (const scraperName of scrapers) {
    console.log(`\n🚀 Testing ${scraperName.toUpperCase()} for Suba...`);

    try {
      const startTime = Date.now();

      // Test individual scraper usando SearchService con filtro de fuente
      const testCriteria = {
        ...subaCriteria,
        optionalFilters: {
          sources: [scraperName] // Solo este scraper
        }
      };

      const searchService = new SearchService();
      const result = await searchService.search(testCriteria, 1, 50);
      const properties = result.properties || [];

      const duration = Date.now() - startTime;

      console.log(`✅ ${scraperName.toUpperCase()}: ${properties.length} properties in ${duration}ms`);

      if (properties.length > 0) {
        console.log(`   📊 Sample properties:`);
        properties.slice(0, 3).forEach((prop: any, i: number) => {
          console.log(`     [${i+1}] ${prop.title?.substring(0, 50)}...`);
          console.log(`         💰 $${prop.price?.toLocaleString()}`);
          console.log(`         📍 ${prop.location?.address}`);
          console.log(`         🏠 ${prop.location?.neighborhood}`);

          // Check if it actually contains Suba
          const hasSubaInNeighborhood = prop.location?.neighborhood?.toLowerCase().includes('suba');
          const hasSubaInAddress = prop.location?.address?.toLowerCase().includes('suba');
          console.log(`         ✅ Contains Suba: ${hasSubaInNeighborhood || hasSubaInAddress ? 'YES' : 'NO'}`);
        });
      } else {
        console.log(`   ❌ No properties found for Suba`);
        console.log(`   🔍 Possible issues:`);
        console.log(`     - Scraper not working`);
        console.log(`     - URL generation problem`);
        console.log(`     - Site structure changed`);
        console.log(`     - Geographic filtering too strict`);
      }

    } catch (error) {
      console.log(`❌ ${scraperName.toUpperCase()} FAILED: ${(error as Error).message}`);
    }

    // Wait between requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  console.log('\n🏁 INDIVIDUAL SCRAPER TEST COMPLETED');
  console.log('\n📊 SUMMARY:');
  console.log('   - Check which scrapers are returning 0 properties');
  console.log('   - Those need to be fixed for better Suba coverage');
}

if (require.main === module) {
  testIndividualScrapers().then(() => {
    console.log('\n✅ Test completed');
    process.exit(0);
  }).catch(error => {
    console.error('💥 Test crashed:', error);
    process.exit(1);
  });
}

export { testIndividualScrapers };
