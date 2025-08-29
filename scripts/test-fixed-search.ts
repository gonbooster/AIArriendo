#!/usr/bin/env tsx

/**
 * Test the fixed search with proper filtering
 */

import { SearchService } from '../core/services/SearchService';
import { SearchCriteria } from '../core/types/SearchCriteria';
import { logger } from '../core/utils/logger';

async function testFixedSearch() {
  console.log('🔧 Testing FIXED search with proper filtering...\n');

  try {
    const searchService = new SearchService();

    // Exact same criteria as the user sent
    const criteria: SearchCriteria = {
      hardRequirements: {
        operation: 'arriendo' as const,
        propertyTypes: ['apartamento'],
        location: {
          city: 'Bogotá',
          neighborhoods: ['Usaquén']
        },
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
        minStratum: 3,
        maxStratum: 5
      },
      preferences: {
        maxCommute: 30,
        amenities: [],
        preferredNeighborhoods: []
      }
    };

    console.log('📋 SEARCH CRITERIA:');
    console.log(`   Operation: ${criteria.hardRequirements.operation}`);
    console.log(`   Property Types: ${criteria.hardRequirements.propertyTypes.join(', ')}`);
    console.log(`   Rooms: ${criteria.hardRequirements.minRooms}-${criteria.hardRequirements.maxRooms}`);
    console.log(`   Bathrooms: ${criteria.hardRequirements.minBathrooms}-${criteria.hardRequirements.maxBathrooms}`);
    console.log(`   Area: ${criteria.hardRequirements.minArea}-${criteria.hardRequirements.maxArea} m²`);
    console.log(`   Price: $${criteria.hardRequirements.minTotalPrice?.toLocaleString()}-$${criteria.hardRequirements.maxTotalPrice?.toLocaleString()}`);
    console.log(`   Location: ${criteria.hardRequirements.location.neighborhoods?.join(', ')}`);
    console.log('');

    const startTime = Date.now();
    const result = await searchService.search(criteria, 1, 20);
    const endTime = Date.now();

    console.log('✅ SEARCH RESULTS:');
    console.log(`   Execution time: ${(endTime - startTime) / 1000}s`);
    console.log(`   Properties found: ${result.properties.length}`);
    console.log(`   Total available: ${result.total}`);
    console.log('');

    if (result.properties.length > 0) {
      console.log('🏠 FILTERED PROPERTIES (should match criteria):');
      
      result.properties.slice(0, 10).forEach((prop, index) => {
        console.log(`\n${index + 1}. ${prop.title}`);
        console.log(`   💰 Price: $${prop.totalPrice.toLocaleString()}`);
        console.log(`   📐 Area: ${prop.area}m²`);
        console.log(`   🛏️  Rooms: ${prop.rooms}`);
        console.log(`   🚿 Bathrooms: ${prop.bathrooms || 'N/A'}`);
        console.log(`   📍 Location: ${prop.location.address}`);
        console.log(`   🖼️  Image: ${prop.images[0] || 'No image'}`);
        console.log(`   🔗 URL: ${prop.url}`);
        console.log(`   📊 Source: ${prop.source}`);
        
        // Verify criteria compliance
        const issues = [];
        if (prop.rooms < 3 || prop.rooms > 4) issues.push(`❌ Rooms: ${prop.rooms} (should be 3-4)`);
        if (prop.bathrooms && (prop.bathrooms < 2 || prop.bathrooms > 3)) issues.push(`❌ Bathrooms: ${prop.bathrooms} (should be 2-3)`);
        if (prop.area < 70 || prop.area > 110) issues.push(`❌ Area: ${prop.area}m² (should be 70-110)`);
        if (prop.totalPrice < 500000 || prop.totalPrice > 3500000) issues.push(`❌ Price: $${prop.totalPrice.toLocaleString()} (should be $500K-$3.5M)`);
        
        const locationMatch = prop.location.address.toLowerCase().includes('usaquén') || 
                             prop.location.neighborhood?.toLowerCase().includes('usaquén');
        if (!locationMatch) issues.push(`❌ Location: ${prop.location.address} (should include Usaquén)`);
        
        if (issues.length > 0) {
          console.log(`   ⚠️  FILTER ISSUES: ${issues.join(', ')}`);
        } else {
          console.log(`   ✅ Matches all criteria`);
        }
      });

      // Summary of compliance
      const compliantProperties = result.properties.filter(prop => {
        const roomsOk = prop.rooms >= 3 && prop.rooms <= 4;
        const bathsOk = !prop.bathrooms || (prop.bathrooms >= 2 && prop.bathrooms <= 3);
        const areaOk = prop.area >= 70 && prop.area <= 110;
        const priceOk = prop.totalPrice >= 500000 && prop.totalPrice <= 3500000;
        const locationOk = prop.location.address.toLowerCase().includes('usaquén') || 
                          prop.location.neighborhood?.toLowerCase().includes('usaquén');
        
        return roomsOk && bathsOk && areaOk && priceOk && locationOk;
      });

      console.log(`\n📊 FILTER COMPLIANCE:`);
      console.log(`   Compliant properties: ${compliantProperties.length}/${result.properties.length} (${Math.round(compliantProperties.length/result.properties.length*100)}%)`);
      
      if (compliantProperties.length === result.properties.length) {
        console.log(`   🎉 PERFECT! All properties match the search criteria`);
      } else {
        console.log(`   ⚠️  Some properties don't match criteria - filters need more work`);
      }

    } else {
      console.log('❌ No properties found matching the criteria');
    }

  } catch (error) {
    console.error('❌ Error testing search:', error);
  }
}

// Run the test
testFixedSearch().catch(console.error);
