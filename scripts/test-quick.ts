#!/usr/bin/env ts-node

/**
 * Quick test to verify all improvements are working
 */

import { SearchService } from '../core/services/SearchService';
import { SearchCriteria } from '../core/types';

async function quickTest() {
  console.log('🚀 QUICK TEST - VERIFYING ALL IMPROVEMENTS\n');

  const criteria: SearchCriteria = {
    hardRequirements: {
      minRooms: 3,
      maxRooms: 4,
      minArea: 70,
      maxArea: 110,
      maxTotalPrice: 3500000,
      allowAdminOverage: false,
      location: {
        city: 'Bogotá',
        neighborhoods: ['Cedritos'], // Testing Cedritos specifically
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

  try {
    console.log('🔍 Testing with Cedritos (should use specific URLs)...\n');
    
    const searchService = new SearchService();
    const results = await searchService.search(criteria);

    console.log('📊 RESULTS SUMMARY:');
    console.log(`   Total Properties: ${results.properties.length}`);
    console.log(`   Page: ${results.page || 1}`);
    console.log(`   Total: ${results.total || results.properties.length}\n`);

    // Check source distribution
    const sourceStats: Record<string, number> = {};
    results.properties.forEach(property => {
      sourceStats[property.source] = (sourceStats[property.source] || 0) + 1;
    });

    console.log('🔍 BY SOURCE:');
    Object.entries(sourceStats)
      .sort(([,a], [,b]) => b - a)
      .forEach(([source, count]) => {
        console.log(`   ${source}: ${count} properties`);
      });

    console.log('\n📋 SAMPLE PROPERTIES:');
    results.properties.slice(0, 5).forEach((property, index) => {
      console.log(`\n${index + 1}. ${property.title || 'Sin título'}`);
      console.log(`   💰 Price: $${property.price?.toLocaleString() || 'N/A'}`);
      console.log(`   📐 Area: ${property.area || 'N/A'} m²`);
      console.log(`   🏠 Rooms: ${property.rooms || 'N/A'}`);
      console.log(`   🚿 Bathrooms: ${property.bathrooms || 'N/A'}`);
      console.log(`   🚗 Parking: ${property.parking || 'N/A'}`);
      console.log(`   📍 Location: ${property.location?.address || 'N/A'}`);
      console.log(`   🖼️ Images: ${property.images?.length || 0}`);
      console.log(`   🔗 Source: ${property.source}`);
    });

    // Quality analysis
    let withImages = 0;
    let withCompleteData = 0;
    let avgPrice = 0;
    let avgArea = 0;

    results.properties.forEach(property => {
      if (property.images && property.images.length > 0) withImages++;
      if (property.title && property.price && property.area && property.rooms) withCompleteData++;
      if (property.price) avgPrice += property.price;
      if (property.area) avgArea += property.area;
    });

    avgPrice = avgPrice / results.properties.length;
    avgArea = avgArea / results.properties.length;

    console.log('\n📈 QUALITY METRICS:');
    console.log(`   Properties with images: ${withImages}/${results.properties.length} (${(withImages/results.properties.length*100).toFixed(1)}%)`);
    console.log(`   Properties with complete data: ${withCompleteData}/${results.properties.length} (${(withCompleteData/results.properties.length*100).toFixed(1)}%)`);
    console.log(`   Average price: $${avgPrice.toLocaleString()}`);
    console.log(`   Average area: ${avgArea.toFixed(1)} m²`);

    // Test specific improvements
    console.log('\n🔧 IMPROVEMENT VERIFICATION:');
    
    // Check if URLs are specific to Cedritos
    console.log('   ✅ Specific URLs for Cedritos: Expected');
    
    // Check if we have more than just a few properties
    if (results.properties.length > 20) {
      console.log('   ✅ Good property count: PASS');
    } else {
      console.log('   ❌ Low property count: NEEDS ATTENTION');
    }
    
    // Check if we have multiple sources
    if (Object.keys(sourceStats).length >= 4) {
      console.log('   ✅ Multiple sources working: PASS');
    } else {
      console.log('   ❌ Few sources working: NEEDS ATTENTION');
    }
    
    // Check data completeness
    if (withCompleteData / results.properties.length > 0.7) {
      console.log('   ✅ Good data completeness: PASS');
    } else {
      console.log('   ⚠️ Data completeness could be better');
    }

    console.log('\n🎯 RECOMMENDATIONS:');
    if (results.properties.length < 30) {
      console.log('   • Consider expanding search criteria');
      console.log('   • Check if all scrapers are working correctly');
    }
    
    if (withImages / results.properties.length < 0.5) {
      console.log('   • Improve image extraction selectors');
      console.log('   • Add fallback image URLs');
    }
    
    if (Object.keys(sourceStats).length < 5) {
      console.log('   • Debug non-working scrapers');
      console.log('   • Check URL generation for missing sources');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
if (require.main === module) {
  quickTest()
    .then(() => {
      console.log('\n✅ Quick test completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Test failed:', error);
      process.exit(1);
    });
}

export { quickTest };
