#!/usr/bin/env ts-node

/**
 * Test con los CRITERIOS EXACTOS que está enviando el frontend
 */

import { SearchService } from '../core/services/SearchService';
import { SearchCriteria } from '../core/types';

// CRITERIOS EXACTOS que está enviando el frontend (copiados del log)
const exactCriteria: SearchCriteria = {
  hardRequirements: {
    operation: 'arriendo',
    propertyTypes: ['Apartamento'],
    minRooms: 3,
    maxRooms: 4,
    minBathrooms: 2,
    maxBathrooms: 3,
    minParking: 0,
    maxParking: 2,
    minArea: 70,
    maxArea: 110,
    minTotalPrice: 500000,
    maxTotalPrice: 3500000,
    allowAdminOverage: false,
    minStratum: 3,
    maxStratum: 5,
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
      wetAreas: 1,
      sports: 1,
      amenities: 0.8,
      location: 0.6,
      pricePerM2: 0.4
    }
  },
  optionalFilters: {}
};

async function testExactCriteria() {
  console.log('🎯 TESTING EXACT FRONTEND CRITERIA');
  console.log('📋 CRITERIOS EXACTOS ENVIADOS POR EL FRONTEND:');
  console.log(JSON.stringify({
    "operation": "arriendo",
    "propertyTypes": ["Apartamento"],
    "minRooms": 3,
    "maxRooms": 4,
    "minBathrooms": 2,
    "maxBathrooms": 3,
    "minParking": 0,
    "maxParking": 2,
    "minArea": 70,
    "maxArea": 110,
    "minPrice": 500000,
    "maxPrice": 3500000,
    "allowAdminOverage": false,
    "minStratum": 3,
    "maxStratum": 5,
    "location": {
      "neighborhoods": ["Suba"]
    },
    "preferences": {
      "wetAreas": [],
      "sports": [],
      "amenities": []
    }
  }, null, 2));
  
  console.log('\n📋 Backend Criteria:', JSON.stringify(exactCriteria, null, 2));
  console.log('\n' + '='.repeat(80));

  const searchService = new SearchService();
  
  console.log('🚀 Calling SearchService.search() with EXACT frontend criteria...');
  const startTime = Date.now();
  let result: any = null;

  try {
    result = await searchService.search(exactCriteria, 1, 200);
    const duration = Date.now() - startTime;

    console.log(`✅ SearchService responded in ${duration}ms`);
    
    console.log('\n📋 EXACT CRITERIA RESULTS:');
    console.log(`   🏠 Properties returned: ${result.properties?.length || 0}`);
    console.log(`   📊 Total found: ${result.total || 0}`);
    console.log(`   📄 Page: ${result.page}`);
    console.log(`   📄 Limit: ${result.limit}`);
    console.log(`   ⏱️  Execution time: ${result.executionTime}ms`);
    
    if (result.summary) {
      console.log('\n📊 SUMMARY:');
      
      if (result.summary.sourceBreakdown) {
        console.log('   📋 Source Breakdown:');
        Object.entries(result.summary.sourceBreakdown).forEach(([source, count]) => {
          console.log(`     ${source.toUpperCase()}: ${count}`);
        });
      }
      
      if (result.summary.scrapingStats) {
        console.log('\n📊 SCRAPING STATS:');
        console.log(`   Total scraped: ${result.summary.scrapingStats.totalScraped}`);
        console.log(`   After deduplication: ${result.summary.scrapingStats.afterDeduplication}`);
        console.log(`   Valid properties: ${result.summary.scrapingStats.validProperties}`);
        console.log(`   Invalid removed: ${result.summary.scrapingStats.totalScraped - result.summary.scrapingStats.validProperties}`);
      }
    }
    
    if (result.properties && result.properties.length > 0) {
      console.log('\n🏠 ALL PROPERTIES MATCHING EXACT CRITERIA:');
      result.properties.forEach((prop: any, i: number) => {
        console.log(`\n   [${i + 1}] ${prop.title?.substring(0, 80)}...`);
        console.log(`       💰 Price: $${prop.price?.toLocaleString()}`);
        console.log(`       📍 Location: ${prop.location?.address}`);
        console.log(`       🏠 Neighborhood: ${prop.location?.neighborhood}`);
        console.log(`       📐 Area: ${prop.area}m²`);
        console.log(`       🛏️  Rooms: ${prop.rooms}`);
        console.log(`       🚿 Bathrooms: ${prop.bathrooms}`);
        console.log(`       🚗 Parking: ${prop.parking || 0}`);
        console.log(`       🏢 Stratum: ${prop.stratum || 'N/A'}`);
        console.log(`       🔗 Provider: ${prop.provider}`);
        console.log(`       🌐 URL: ${prop.url}`);
        
        // Verificar que cumple TODOS los criterios
        console.log(`\n       ✅ CRITERIA CHECK:`);
        console.log(`          Rooms (3-4): ${prop.rooms >= 3 && prop.rooms <= 4 ? '✅' : '❌'} (${prop.rooms})`);
        console.log(`          Bathrooms (2-3): ${prop.bathrooms >= 2 && prop.bathrooms <= 3 ? '✅' : '❌'} (${prop.bathrooms})`);
        console.log(`          Area (70-110): ${prop.area >= 70 && prop.area <= 110 ? '✅' : '❌'} (${prop.area}m²)`);
        console.log(`          Price (500K-3.5M): ${prop.price >= 500000 && prop.price <= 3500000 ? '✅' : '❌'} ($${prop.price?.toLocaleString()})`);
        console.log(`          Stratum (3-5): ${(prop.stratum || 0) >= 3 && (prop.stratum || 0) <= 5 ? '✅' : '❌'} (${prop.stratum || 'N/A'})`);
        console.log(`          Suba: ${prop.location?.neighborhood?.toLowerCase().includes('suba') || prop.location?.address?.toLowerCase().includes('suba') ? '✅' : '❌'}`);
      });
      
    } else {
      console.log('\n❌ NO PROPERTIES MATCH EXACT CRITERIA');
      console.log('   This means the filters are working correctly but are very restrictive');
    }

  } catch (error) {
    const duration = Date.now() - startTime;
    console.log(`❌ SearchService failed in ${duration}ms`);
    console.log(`💥 Error: ${(error as Error).message}`);
    console.log(`📚 Stack: ${(error as Error).stack}`);
  }

  console.log('\n🏁 EXACT CRITERIA TEST COMPLETED');
  console.log(`🎯 RESPUESTA: Con los criterios EXACTOS del frontend se encontraron ${result?.properties?.length || 0} propiedades`);
  console.log(`📊 DATOS VÁLIDOS TOTALES: ${result?.summary?.scrapingStats?.validProperties || 'N/A'}`);
  console.log(`🗑️ DATOS INVÁLIDOS ELIMINADOS: ${result?.summary?.scrapingStats ? (result.summary.scrapingStats.totalScraped - result.summary.scrapingStats.validProperties) : 'N/A'}`);
}

if (require.main === module) {
  testExactCriteria().then(() => {
    console.log('\n✅ Test completed');
    process.exit(0);
  }).catch(error => {
    console.error('💥 Test crashed:', error);
    process.exit(1);
  });
}

export { testExactCriteria };
