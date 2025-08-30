#!/usr/bin/env ts-node

/**
 * Test with EXACT default criteria from SearchPage frontend
 */

import { SearchService } from '../core/services/SearchService';
import { SearchCriteria } from '../core/types';

// CRITERIOS EXACTOS POR DEFECTO DEL FRONTEND (líneas 111-132 de SearchPage.tsx)
const frontendDefaultCriteria: SearchCriteria = {
  hardRequirements: {
    operation: "arriendo",
    propertyTypes: ["Apartamento"],
    minRooms: 1,           // ← MUY AMPLIO
    maxRooms: 10,          // ← MUY AMPLIO
    minBathrooms: 1,       // ← MUY AMPLIO
    maxBathrooms: 10,      // ← MUY AMPLIO
    minParking: 0,
    maxParking: 10,
    minArea: 1,            // ← MUY AMPLIO
    maxArea: 1000,         // ← MUY AMPLIO
    minTotalPrice: 1,      // ← MUY AMPLIO
    maxTotalPrice: 50000000, // ← MUY AMPLIO
    allowAdminOverage: true,
    minStratum: 1,
    maxStratum: 6,
    location: {
      city: 'Bogotá',
      neighborhoods: [],   // ← SIN FILTRO DE UBICACIÓN
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

async function testFrontendDefault() {
  console.log('🎯 TEST: CRITERIOS POR DEFECTO DEL FRONTEND');
  console.log('📋 CRITERIOS EXACTOS DEL SEARCHPAGE (líneas 111-132):');
  console.log(JSON.stringify({
    operation: "arriendo",
    propertyTypes: ["Apartamento"],
    minRooms: 1,
    maxRooms: 10,
    minBathrooms: 1,
    maxBathrooms: 10,
    minParking: 0,
    maxParking: 10,
    minArea: 1,
    maxArea: 1000,
    minPrice: 1,
    maxPrice: 50000000,
    allowAdminOverage: true,
    minStratum: 1,
    maxStratum: 6,
    location: { neighborhoods: [] },
    preferences: { wetAreas: [], sports: [], amenities: [] }
  }, null, 2));

  console.log('\n' + '='.repeat(80));
  console.log('🚀 Calling SearchService.search() with FRONTEND DEFAULT criteria...');

  try {
    const searchService = new SearchService();
    const startTime = Date.now();
    
    const result = await searchService.search(frontendDefaultCriteria, 1, 200);
    
    const endTime = Date.now();
    const executionTime = endTime - startTime;

    console.log(`✅ SearchService responded in ${executionTime}ms`);
    console.log('\n📋 FRONTEND DEFAULT RESULTS:');
    console.log(`   🏠 Properties returned: ${result.properties?.length || 0}`);
    console.log(`   📊 Total found: ${result.properties?.length || 0}`);
    console.log(`   ⏱️  Execution time: ${executionTime}ms`);

    // Source breakdown
    if (result.properties && result.properties.length > 0) {
      const sourceBreakdown: { [key: string]: number } = {};
      result.properties.forEach(prop => {
        const source = prop.source || 'UNKNOWN';
        sourceBreakdown[source] = (sourceBreakdown[source] || 0) + 1;
      });

      console.log('\n📋 Source Breakdown (should match your results):');
      Object.entries(sourceBreakdown)
        .sort(([,a], [,b]) => b - a)
        .forEach(([source, count]) => {
          console.log(`     ${source.toUpperCase()}: ${count}`);
        });

      console.log('\n🔍 COMPARISON WITH YOUR RESULTS:');
      console.log(`   TUS RESULTADOS vs MIS RESULTADOS:`);
      console.log(`   MercadoLibre: 95 vs ${sourceBreakdown['MERCADOLIBRE'] || 0}`);
      console.log(`   Properati: 25 vs ${sourceBreakdown['PROPERATI'] || 0}`);
      console.log(`   Fincaraiz: 4 vs ${sourceBreakdown['FINCARAIZ'] || 0}`);
      console.log(`   Trovit: 51 vs ${sourceBreakdown['TROVIT'] || 0}`);
      console.log(`   Ciencuadras: 25 vs ${sourceBreakdown['CIENCUADRAS'] || 0}`);

      // Show first 5 properties
      console.log('\n🏠 PRIMERAS 5 PROPIEDADES:');
      result.properties.slice(0, 5).forEach((prop, index) => {
        console.log(`\n   [${index + 1}] ${prop.title.substring(0, 60)}...`);
        console.log(`       💰 Price: $${prop.price?.toLocaleString()}`);
        console.log(`       📍 Location: ${prop.location?.address || 'N/A'}`);
        console.log(`       🏠 Neighborhood: ${prop.location?.neighborhood || 'N/A'}`);
        console.log(`       📐 Area: ${prop.area}m²`);
        console.log(`       🛏️  Rooms: ${prop.rooms}`);
        console.log(`       🚿 Bathrooms: ${prop.bathrooms}`);
        console.log(`       🔗 Provider: ${prop.source}`);
      });

    } else {
      console.log('\n❌ No properties found with frontend default criteria');
    }

    console.log('\n🏁 FRONTEND DEFAULT TEST COMPLETED');
    console.log(`🎯 RESPUESTA: Con criterios por defecto del frontend se encontraron ${result.properties?.length || 0} propiedades`);

  } catch (error) {
    console.error('❌ Error during search:', error);
  }
}

if (require.main === module) {
  testFrontendDefault()
    .then(() => {
      console.log('\n✅ Test completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Test failed:', error);
      process.exit(1);
    });
}

export { testFrontendDefault };
