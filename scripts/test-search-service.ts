#!/usr/bin/env ts-node

/**
 * Test usando DIRECTAMENTE SearchService.search()
 */

import { SearchService } from '../core/services/SearchService';
import { SearchCriteria } from '../core/types';

// CRITERIOS EXACTOS convertidos al formato del backend
const backendCriteria: SearchCriteria = {
  hardRequirements: {
    minRooms: 3,
    maxRooms: 4,
    minArea: 70,
    maxArea: 110,
    maxTotalPrice: 3500000,
    allowAdminOverage: false,
    location: {
      city: 'Bogotá',
      neighborhoods: ['Chapinero'],
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

async function testSearchService() {
  console.log('🎯 TESTING SEARCH SERVICE DIRECTLY');
  console.log('📋 Backend Criteria:', JSON.stringify(backendCriteria, null, 2));
  console.log('\n' + '='.repeat(80));

  const searchService = new SearchService();
  
  console.log('🚀 Calling SearchService.search()...');
  const startTime = Date.now();

  try {
    const result = await searchService.search(backendCriteria, 1, 48);
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
      
      console.log(`   📊 Summary available: ${JSON.stringify(result.summary, null, 2)}`);

    }
    
    if (result.properties && result.properties.length > 0) {
      console.log('\n🏠 SAMPLE PROPERTIES:');
      result.properties.slice(0, 3).forEach((prop: any, i: number) => {
        console.log(`\n   [${i + 1}] ${prop.title?.substring(0, 60)}...`);
        console.log(`       💰 Price: $${prop.price?.toLocaleString()}`);
        console.log(`       📍 Location: ${prop.location?.address}`);
        console.log(`       🏠 Neighborhood: ${prop.location?.neighborhood}`);
        console.log(`       📐 Area: ${prop.area}m²`);
        console.log(`       🛏️  Rooms: ${prop.rooms}`);
        console.log(`       🚿 Bathrooms: ${prop.bathrooms}`);
        console.log(`       🚗 Parking: ${prop.parking || 0}`);
        console.log(`       🔗 Provider: ${prop.provider}`);
      });
      
      // Análisis de filtros
      console.log('\n🔍 FILTER ANALYSIS:');
      const locationProps = result.properties.filter((p: any) =>
        p.location?.address || p.location?.neighborhood
      );
      console.log(`   📍 Properties with location: ${locationProps.length}/${result.properties.length}`);
      
      const priceRange = result.properties.filter((p: any) =>
        p.price <= backendCriteria.hardRequirements.maxTotalPrice!
      );
      console.log(`   💰 In price range: ${priceRange.length}/${result.properties.length}`);
      
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
      
    } else {
      console.log('\n❌ NO PROPERTIES RETURNED');
      console.log('   Possible causes:');
      console.log('   1. All properties filtered out');
      console.log('   2. Scraping failed');
      console.log('   3. No properties found in Chapinero');
      console.log('   4. Price range too restrictive');
    }

  } catch (error) {
    const duration = Date.now() - startTime;
    console.log(`❌ SearchService failed in ${duration}ms`);
    console.log(`💥 Error: ${(error as Error).message}`);
    console.log(`📚 Stack: ${(error as Error).stack}`);
  }

  console.log('\n🏁 SEARCH SERVICE TEST COMPLETED');
}

if (require.main === module) {
  testSearchService().then(() => {
    console.log('\n✅ Test completed');
    process.exit(0);
  }).catch(error => {
    console.error('💥 Test crashed:', error);
    process.exit(1);
  });
}

export { testSearchService };
