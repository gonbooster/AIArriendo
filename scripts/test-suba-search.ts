#!/usr/bin/env ts-node

/**
 * Test con criterios EXACTOS de Suba proporcionados por el usuario
 */

import { SearchService } from '../core/services/SearchService';
import { SearchCriteria } from '../core/types';

// CRITERIOS EXACTOS del usuario convertidos al formato del backend
const userCriteria: SearchCriteria = {
  hardRequirements: {
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
    propertyTypes: ['Apartamento'],
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
      wetAreas: 1,
      sports: 1,
      amenities: 0.8,
      location: 0.6,
      pricePerM2: 0.4
    }
  },
  optionalFilters: {}
};

async function testSubaSearch() {
  console.log('🎯 TESTING SUBA SEARCH WITH USER CRITERIA');
  console.log('📋 CRITERIOS EXACTOS RECIBIDOS:');
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

  console.log('\n📋 Backend Criteria:', JSON.stringify(userCriteria, null, 2));
  console.log('\n' + '='.repeat(80));

  const searchService = new SearchService();

  console.log('🚀 Calling SearchService.search() for SUBA...');
  const startTime = Date.now();
  let result: any = null;

  try {
    result = await searchService.search(userCriteria, 1, 200);
    const duration = Date.now() - startTime;

    console.log(`✅ SearchService responded in ${duration}ms`);
    
    console.log('\n📋 SEARCH RESULT ANALYSIS:');
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
      
      console.log(`   📊 Summary: ${JSON.stringify(result.summary, null, 2)}`);
    }
    
    if (result.properties && result.properties.length > 0) {
      console.log('\n🏠 SAMPLE PROPERTIES (First 5):');
      result.properties.slice(0, 5).forEach((prop: any, i: number) => {
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
      });
      
      // Análisis detallado de filtros
      console.log('\n🔍 DETAILED FILTER ANALYSIS:');
      
      const subaProps = result.properties.filter((p: any) =>
        p.location?.neighborhood?.toLowerCase().includes('suba') ||
        p.location?.address?.toLowerCase().includes('suba')
      );
      console.log(`   📍 Properties in Suba: ${subaProps.length}/${result.properties.length}`);
      
      const roomsFilter = result.properties.filter((p: any) =>
        p.rooms >= 3 && p.rooms <= 4
      );
      console.log(`   🛏️  Rooms 3-4: ${roomsFilter.length}/${result.properties.length}`);
      
      const areaFilter = result.properties.filter((p: any) =>
        p.area >= 70 && p.area <= 110
      );
      console.log(`   📐 Area 70-110m²: ${areaFilter.length}/${result.properties.length}`);
      
      const priceFilter = result.properties.filter((p: any) =>
        p.price >= 500000 && p.price <= 3500000
      );
      console.log(`   💰 Price 500K-3.5M: ${priceFilter.length}/${result.properties.length}`);
      
      const bathroomsFilter = result.properties.filter((p: any) =>
        p.bathrooms >= 2 && p.bathrooms <= 3
      );
      console.log(`   🚿 Bathrooms 2-3: ${bathroomsFilter.length}/${result.properties.length}`);
      
      // Análisis por proveedor
      console.log('\n📊 PROVIDER ANALYSIS:');
      const providerCounts: any = {};
      result.properties.forEach((p: any) => {
        const provider = p.provider || 'unknown';
        providerCounts[provider] = (providerCounts[provider] || 0) + 1;
      });
      
      Object.entries(providerCounts).forEach(([provider, count]) => {
        console.log(`   ${provider.toUpperCase()}: ${count} properties`);
      });
      
      // Análisis de precios
      console.log('\n💰 PRICE ANALYSIS:');
      const prices = result.properties.map((p: any) => p.price).filter((p: any) => p);
      if (prices.length > 0) {
        const avgPrice = prices.reduce((a: number, b: number) => a + b, 0) / prices.length;
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        console.log(`   Average: $${avgPrice.toLocaleString()}`);
        console.log(`   Min: $${minPrice.toLocaleString()}`);
        console.log(`   Max: $${maxPrice.toLocaleString()}`);
      }
      
    } else {
      console.log('\n❌ NO PROPERTIES RETURNED');
      console.log('   Possible causes:');
      console.log('   1. All properties filtered out by criteria');
      console.log('   2. Scraping failed for Suba');
      console.log('   3. No properties found in Suba with these criteria');
      console.log('   4. Price range 500K-3.5M too restrictive');
      console.log('   5. Area 70-110m² too restrictive');
      console.log('   6. Rooms 3-4 + Bathrooms 2-3 too restrictive');
    }

  } catch (error) {
    const duration = Date.now() - startTime;
    console.log(`❌ SearchService failed in ${duration}ms`);
    console.log(`💥 Error: ${(error as Error).message}`);
    console.log(`📚 Stack: ${(error as Error).stack}`);
  }

  console.log('\n🏁 SUBA SEARCH TEST COMPLETED');
  console.log(`🎯 RESPUESTA: Se encontraron ${result?.properties?.length || 0} propiedades que cumplen los criterios exactos`);
}

if (require.main === module) {
  testSubaSearch().then(() => {
    console.log('\n✅ Test completed');
    process.exit(0);
  }).catch(error => {
    console.error('💥 Test crashed:', error);
    process.exit(1);
  });
}

export { testSubaSearch };
