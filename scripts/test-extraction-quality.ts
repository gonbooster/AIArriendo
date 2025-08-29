#!/usr/bin/env ts-node

/**
 * Test extraction quality across all scrapers
 */

import { SearchService } from '../core/services/SearchService';
import { ExtractionStats } from '../core/scraping/utils/ExtractionStats';
import { PropertyEnhancer } from '../core/scraping/utils/PropertyEnhancer';
import { SearchCriteria } from '../core/types/SearchCriteria';

async function testExtractionQuality() {
  console.log('🔍 TESTING EXTRACTION QUALITY ACROSS ALL SCRAPERS\n');

  // Test criteria
  const criteria: SearchCriteria = {
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
        neighborhoods: ['Usaquén'],
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
    // Reset stats
    ExtractionStats.reset();

    console.log('🚀 Starting search with criteria:');
    console.log(`   📍 Location: ${criteria.hardRequirements.location.neighborhoods?.join(', ')}`);
    console.log(`   🏠 Rooms: ${criteria.hardRequirements.minRooms}-${criteria.hardRequirements.maxRooms}`);
    console.log(`   💰 Price: $${criteria.hardRequirements.minTotalPrice.toLocaleString()} - $${criteria.hardRequirements.maxTotalPrice.toLocaleString()}\n`);

    // Execute search
    const searchService = new SearchService();
    const results = await searchService.search(criteria);

    console.log(`✅ Search completed! Found ${results.properties.length} properties\n`);

    // Analyze results
    console.log('📊 PROPERTY QUALITY ANALYSIS\n');
    
    let totalCompleteness = 0;
    const qualityBuckets = {
      excellent: 0,
      good: 0,
      fair: 0,
      poor: 0
    };

    results.properties.forEach((property, index) => {
      const completeness = PropertyEnhancer.calculateCompleteness(property);
      totalCompleteness += completeness;

      if (completeness >= 90) qualityBuckets.excellent++;
      else if (completeness >= 70) qualityBuckets.good++;
      else if (completeness >= 50) qualityBuckets.fair++;
      else qualityBuckets.poor++;

      // Log first 5 properties for detailed analysis
      if (index < 5) {
        console.log(`🏠 Property ${index + 1} (${property.source}):`);
        console.log(`   📝 Title: ${property.title ? '✅' : '❌'} "${property.title?.substring(0, 50)}..."`);
        console.log(`   💰 Price: ${property.price ? '✅' : '❌'} $${property.price?.toLocaleString()}`);
        console.log(`   📐 Area: ${property.area ? '✅' : '❌'} ${property.area} m²`);
        console.log(`   🏠 Rooms: ${property.rooms ? '✅' : '❌'} ${property.rooms}`);
        console.log(`   📍 Location: ${property.location?.address ? '✅' : '❌'} "${property.location?.address}"`);
        console.log(`   🖼️ Image: ${property.images?.length ? '✅' : '❌'} ${property.images?.length || 0} images`);
        console.log(`   📊 Completeness: ${completeness.toFixed(1)}%\n`);
      }
    });

    // Summary statistics
    const avgCompleteness = results.properties.length > 0 
      ? totalCompleteness / results.properties.length 
      : 0;

    console.log('📈 OVERALL STATISTICS\n');
    console.log(`   🎯 Total Properties: ${results.properties.length}`);
    console.log(`   📊 Average Completeness: ${avgCompleteness.toFixed(1)}%`);
    console.log(`   🌟 Excellent (90-100%): ${qualityBuckets.excellent} (${(qualityBuckets.excellent/results.properties.length*100).toFixed(1)}%)`);
    console.log(`   ✅ Good (70-89%): ${qualityBuckets.good} (${(qualityBuckets.good/results.properties.length*100).toFixed(1)}%)`);
    console.log(`   ⚠️ Fair (50-69%): ${qualityBuckets.fair} (${(qualityBuckets.fair/results.properties.length*100).toFixed(1)}%)`);
    console.log(`   ❌ Poor (<50%): ${qualityBuckets.poor} (${(qualityBuckets.poor/results.properties.length*100).toFixed(1)}%)\n`);

    // Source breakdown
    const sourceStats: Record<string, number> = {};
    results.properties.forEach(property => {
      sourceStats[property.source] = (sourceStats[property.source] || 0) + 1;
    });

    console.log('🔍 BY SOURCE\n');
    Object.entries(sourceStats)
      .sort(([,a], [,b]) => b - a)
      .forEach(([source, count]) => {
        const percentage = (count / results.properties.length * 100).toFixed(1);
        console.log(`   ${source}: ${count} properties (${percentage}%)`);
      });

    // Generate detailed extraction stats report
    console.log(ExtractionStats.generateReport());

    // Recommendations
    console.log('💡 RECOMMENDATIONS\n');
    if (avgCompleteness < 70) {
      console.log('   ⚠️ Low average completeness detected');
      console.log('   🔧 Consider improving extraction selectors');
      console.log('   🎯 Focus on sources with poor performance');
    }
    
    if (qualityBuckets.poor > results.properties.length * 0.3) {
      console.log('   ❌ High number of poor quality properties');
      console.log('   🔧 Review PropertyEnhancer fallback logic');
      console.log('   🎯 Implement better data validation');
    }

    if (results.properties.length < 50) {
      console.log('   📉 Low property count');
      console.log('   🔧 Check if scrapers are working correctly');
      console.log('   🎯 Verify URL generation and selectors');
    }

  } catch (error) {
    console.error('❌ Error during extraction quality test:', error);
  }
}

// Run the test
if (require.main === module) {
  testExtractionQuality()
    .then(() => {
      console.log('\n✅ Extraction quality test completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Test failed:', error);
      process.exit(1);
    });
}

export { testExtractionQuality };
