#!/usr/bin/env ts-node

/**
 * Test PADS and RENTOLA scrapers specifically for Suba
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

async function testPadsAndRentola() {
  console.log('🔍 TESTING PADS AND RENTOLA FOR SUBA');
  console.log('='.repeat(80));

  const searchService = new SearchService();
  
  // Test PADS
  console.log('\n🚀 Testing PADS for Suba...');
  try {
    const startTime = Date.now();
    
    const padsResult = await searchService.search({
      ...subaCriteria,
      optionalFilters: { sources: ['pads'] }
    }, 1, 50);
    
    const duration = Date.now() - startTime;
    
    console.log(`✅ PADS: ${padsResult.properties?.length || 0} properties in ${duration}ms`);
    
    if (padsResult.properties && padsResult.properties.length > 0) {
      console.log(`   📊 Sample PADS properties:`);
      padsResult.properties.slice(0, 3).forEach((prop: any, i: number) => {
        console.log(`     [${i+1}] ${prop.title?.substring(0, 50)}...`);
        console.log(`         💰 $${prop.price?.toLocaleString()}`);
        console.log(`         📍 ${prop.location?.address}`);
        console.log(`         🏠 ${prop.location?.neighborhood}`);
        console.log(`         🔗 ${prop.url}`);
        
        // Check if it actually contains Suba
        const hasSubaInNeighborhood = prop.location?.neighborhood?.toLowerCase().includes('suba');
        const hasSubaInAddress = prop.location?.address?.toLowerCase().includes('suba');
        console.log(`         ✅ Contains Suba: ${hasSubaInNeighborhood || hasSubaInAddress ? 'YES' : 'NO'}`);
      });
    } else {
      console.log(`   ❌ No PADS properties found for Suba`);
    }
    
  } catch (error) {
    console.log(`❌ PADS FAILED: ${(error as Error).message}`);
  }
  
  // Wait between requests
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Test RENTOLA
  console.log('\n🚀 Testing RENTOLA for Suba...');
  try {
    const startTime = Date.now();
    
    const rentolaResult = await searchService.search({
      ...subaCriteria,
      optionalFilters: { sources: ['rentola'] }
    }, 1, 50);
    
    const duration = Date.now() - startTime;
    
    console.log(`✅ RENTOLA: ${rentolaResult.properties?.length || 0} properties in ${duration}ms`);
    
    if (rentolaResult.properties && rentolaResult.properties.length > 0) {
      console.log(`   📊 Sample RENTOLA properties:`);
      rentolaResult.properties.slice(0, 3).forEach((prop: any, i: number) => {
        console.log(`     [${i+1}] ${prop.title?.substring(0, 50)}...`);
        console.log(`         💰 $${prop.price?.toLocaleString()}`);
        console.log(`         📍 ${prop.location?.address}`);
        console.log(`         🏠 ${prop.location?.neighborhood}`);
        console.log(`         🔗 ${prop.url}`);
        
        // Check if it actually contains Suba
        const hasSubaInNeighborhood = prop.location?.neighborhood?.toLowerCase().includes('suba');
        const hasSubaInAddress = prop.location?.address?.toLowerCase().includes('suba');
        console.log(`         ✅ Contains Suba: ${hasSubaInNeighborhood || hasSubaInAddress ? 'YES' : 'NO'}`);
      });
    } else {
      console.log(`   ❌ No RENTOLA properties found for Suba`);
    }
    
  } catch (error) {
    console.log(`❌ RENTOLA FAILED: ${(error as Error).message}`);
  }
  
  // Test ALL 8 scrapers together
  console.log('\n🚀 Testing ALL 8 SCRAPERS for Suba...');
  try {
    const startTime = Date.now();
    
    const allResult = await searchService.search(subaCriteria, 1, 200);
    
    const duration = Date.now() - startTime;
    
    console.log(`✅ ALL 8 SCRAPERS: ${allResult.properties?.length || 0} properties in ${duration}ms`);
    
    if (allResult.summary?.sourceBreakdown) {
      console.log('\n📋 Source Breakdown (ALL 8):');
      Object.entries(allResult.summary.sourceBreakdown).forEach(([source, count]) => {
        console.log(`     ${source.toUpperCase()}: ${count}`);
      });
    }
    
  } catch (error) {
    console.log(`❌ ALL SCRAPERS FAILED: ${(error as Error).message}`);
  }

  console.log('\n🏁 PADS AND RENTOLA TEST COMPLETED');
}

if (require.main === module) {
  testPadsAndRentola().then(() => {
    console.log('\n✅ Test completed');
    process.exit(0);
  }).catch(error => {
    console.error('💥 Test crashed:', error);
    process.exit(1);
  });
}

export { testPadsAndRentola };
