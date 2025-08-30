#!/usr/bin/env ts-node

/**
 * Test con SOLO UBICACIÓN (Suba) - Sin otros filtros
 */

import { SearchService } from '../core/services/SearchService';
import { SearchCriteria } from '../core/types';

// SOLO UBICACIÓN - TODOS LOS DEMÁS FILTROS AMPLIOS
const onlyLocationCriteria: SearchCriteria = {
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
      neighborhoods: ['Suba'], // SOLO FILTRO DE SUBA
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

async function testOnlyLocation() {
  console.log('🎯 TEST: SOLO UBICACIÓN (SUBA) - SIN OTROS FILTROS');
  console.log('📋 CRITERIOS: Solo Suba + filtros amplios');
  console.log(JSON.stringify({
    "operation": "arriendo",
    "propertyTypes": ["Apartamento", "Casa", "Apartaestudio", "Loft", "Penthouse"],
    "minRooms": 1,
    "maxRooms": 10,
    "minBathrooms": 1,
    "maxBathrooms": 10,
    "minParking": 0,
    "maxParking": 10,
    "minArea": 1,
    "maxArea": 1000,
    "minPrice": 1,
    "maxPrice": 50000000,
    "allowAdminOverage": true,
    "minStratum": 1,
    "maxStratum": 6,
    "location": {
      "neighborhoods": ["Suba"]
    }
  }, null, 2));

  console.log('\n' + '='.repeat(80));

  const searchService = new SearchService();

  console.log('🚀 Calling SearchService.search() with ONLY LOCATION filter...');
  const startTime = Date.now();
  let result: any = null;

  try {
    result = await searchService.search(onlyLocationCriteria, 1, 200);
    const duration = Date.now() - startTime;

    console.log(`✅ SearchService responded in ${duration}ms`);
    
    console.log('\n📋 ONLY LOCATION RESULTS:');
    console.log(`   🏠 Properties returned: ${result.properties?.length || 0}`);
    console.log(`   📊 Total found: ${result.total || 0}`);
    console.log(`   ⏱️  Execution time: ${result.executionTime}ms`);
    
    if (result.summary?.sourceBreakdown) {
      console.log('\n📋 Source Breakdown:');
      Object.entries(result.summary.sourceBreakdown).forEach(([source, count]) => {
        console.log(`     ${source.toUpperCase()}: ${count}`);
      });
    }
    
    if (result.properties && result.properties.length > 0) {
      console.log('\n🏠 PRIMERAS 5 PROPIEDADES EN SUBA:');
      result.properties.slice(0, 5).forEach((prop: any, i: number) => {
        console.log(`\n   [${i + 1}] ${prop.title?.substring(0, 60)}...`);
        console.log(`       💰 Price: $${prop.price?.toLocaleString()}`);
        console.log(`       📍 Location: ${prop.location?.address}`);
        console.log(`       🏠 Neighborhood: ${prop.location?.neighborhood}`);
        console.log(`       📐 Area: ${prop.area}m²`);
        console.log(`       🛏️  Rooms: ${prop.rooms}`);
        console.log(`       🚿 Bathrooms: ${prop.bathrooms}`);
        console.log(`       🔗 Provider: ${prop.provider}`);
      });
    }

  } catch (error) {
    console.log(`❌ Error: ${(error as Error).message}`);
  }

  console.log('\n🏁 ONLY LOCATION TEST COMPLETED');
  console.log(`🎯 RESPUESTA: Con SOLO filtro de Suba se encontraron ${result?.properties?.length || 0} propiedades`);
}

if (require.main === module) {
  testOnlyLocation().then(() => {
    console.log('\n✅ Test completed');
    process.exit(0);
  }).catch(error => {
    console.error('💥 Test crashed:', error);
    process.exit(1);
  });
}

export { testOnlyLocation };
