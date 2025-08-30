#!/usr/bin/env ts-node

/**
 * Test SIN FILTROS - Devolver TODOS los datos scrapeados
 */

import { SearchService } from '../core/services/SearchService';
import { SearchCriteria } from '../core/types';

// CRITERIOS MÍNIMOS - SIN FILTROS RESTRICTIVOS
const noFiltersCriteria: SearchCriteria = {
  hardRequirements: {
    minRooms: 1,        // Mínimo posible
    maxRooms: 10,       // Máximo posible
    minBathrooms: 1,    // Mínimo posible
    maxBathrooms: 10,   // Máximo posible
    minParking: 0,      // Mínimo posible
    maxParking: 10,     // Máximo posible
    minArea: 1,         // Mínimo posible
    maxArea: 1000,      // Máximo posible
    minTotalPrice: 1,   // Mínimo posible
    maxTotalPrice: 50000000, // 50M - Máximo posible
    allowAdminOverage: true,
    minStratum: 1,      // Mínimo posible
    maxStratum: 6,      // Máximo posible
    propertyTypes: ['Apartamento', 'Casa', 'Apartaestudio', 'Loft', 'Penthouse'], // Todos los tipos
    operation: 'arriendo',
    location: {
      city: 'Bogotá',
      neighborhoods: [], // SIN FILTRO DE BARRIOS
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
  optionalFilters: {} // SIN FILTROS OPCIONALES
};

async function testNoFilters() {
  console.log('🔥 SCRAPING SIN FILTROS - TODOS LOS DATOS');
  console.log('📋 CRITERIOS (MÍNIMOS PARA NO FILTRAR):');
  console.log(JSON.stringify(noFiltersCriteria, null, 2));
  console.log('\n' + '='.repeat(80));

  const searchService = new SearchService();
  
  console.log('🚀 Calling SearchService.search() SIN FILTROS...');
  const startTime = Date.now();
  let result: any = null;

  try {
    result = await searchService.search(noFiltersCriteria, 1, 500); // Límite alto
    const duration = Date.now() - startTime;

    console.log(`✅ SearchService responded in ${duration}ms`);
    
    console.log('\n📋 RESULTADOS SIN FILTROS:');
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
      console.log('\n🏠 PRIMERAS 10 PROPIEDADES (SIN FILTROS):');
      result.properties.slice(0, 10).forEach((prop: any, i: number) => {
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
      
      // Análisis por proveedor
      console.log('\n📊 ANÁLISIS POR PROVEEDOR (SIN FILTROS):');
      const providerCounts: any = {};
      result.properties.forEach((p: any) => {
        const provider = p.provider || 'unknown';
        providerCounts[provider] = (providerCounts[provider] || 0) + 1;
      });
      
      Object.entries(providerCounts).forEach(([provider, count]) => {
        console.log(`   ${provider.toUpperCase()}: ${count} properties`);
      });
      
      // Análisis de precios
      console.log('\n💰 ANÁLISIS DE PRECIOS (SIN FILTROS):');
      const prices = result.properties.map((p: any) => p.price).filter((p: any) => p && p > 0);
      if (prices.length > 0) {
        const avgPrice = prices.reduce((a: number, b: number) => a + b, 0) / prices.length;
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        console.log(`   Average: $${avgPrice.toLocaleString()}`);
        console.log(`   Min: $${minPrice.toLocaleString()}`);
        console.log(`   Max: $${maxPrice.toLocaleString()}`);
      }
      
      // Análisis de áreas
      console.log('\n📐 ANÁLISIS DE ÁREAS (SIN FILTROS):');
      const areas = result.properties.map((p: any) => p.area).filter((a: any) => a && a > 0);
      if (areas.length > 0) {
        const avgArea = areas.reduce((a: number, b: number) => a + b, 0) / areas.length;
        const minArea = Math.min(...areas);
        const maxArea = Math.max(...areas);
        console.log(`   Average: ${avgArea.toFixed(1)}m²`);
        console.log(`   Min: ${minArea}m²`);
        console.log(`   Max: ${maxArea}m²`);
      }
      
      // Análisis de habitaciones
      console.log('\n🛏️ ANÁLISIS DE HABITACIONES (SIN FILTROS):');
      const roomCounts: any = {};
      result.properties.forEach((p: any) => {
        const rooms = p.rooms || 'N/A';
        roomCounts[rooms] = (roomCounts[rooms] || 0) + 1;
      });
      
      Object.entries(roomCounts).forEach(([rooms, count]) => {
        console.log(`   ${rooms} habitaciones: ${count} properties`);
      });
      
      // Análisis de barrios
      console.log('\n📍 ANÁLISIS DE BARRIOS (SIN FILTROS):');
      const neighborhoodCounts: any = {};
      result.properties.forEach((p: any) => {
        const neighborhood = p.location?.neighborhood || 'N/A';
        neighborhoodCounts[neighborhood] = (neighborhoodCounts[neighborhood] || 0) + 1;
      });
      
      // Top 10 barrios
      const topNeighborhoods = Object.entries(neighborhoodCounts)
        .sort(([,a], [,b]) => (b as number) - (a as number))
        .slice(0, 10);
      
      topNeighborhoods.forEach(([neighborhood, count]) => {
        console.log(`   ${neighborhood}: ${count} properties`);
      });
      
    } else {
      console.log('\n❌ NO PROPERTIES RETURNED (ESTO NO DEBERÍA PASAR SIN FILTROS)');
    }

  } catch (error) {
    const duration = Date.now() - startTime;
    console.log(`❌ SearchService failed in ${duration}ms`);
    console.log(`💥 Error: ${(error as Error).message}`);
    console.log(`📚 Stack: ${(error as Error).stack}`);
  }

  console.log('\n🏁 SCRAPING SIN FILTROS COMPLETADO');
  console.log(`🎯 RESPUESTA: Se obtuvieron ${result?.properties?.length || 0} propiedades SIN NINGÚN FILTRO`);
  
  // Mostrar archivos generados
  console.log('\n📄 ARCHIVOS GENERADOS:');
  console.log('   - search-results/RAW_DATA_latest.txt (datos en bruto)');
  console.log('   - search-results/SUMMARY_latest.txt (resumen)');
  console.log('   - Todos los archivos por proveedor');
}

if (require.main === module) {
  testNoFilters().then(() => {
    console.log('\n✅ Test completed');
    process.exit(0);
  }).catch(error => {
    console.error('💥 Test crashed:', error);
    process.exit(1);
  });
}

export { testNoFilters };
