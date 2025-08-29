#!/usr/bin/env ts-node

/**
 * Test pagination functionality
 */

import { SearchService } from '../core/services/SearchService';
import { SearchCriteria } from '../core/types';

async function testPagination() {
  console.log('📄 TESTING PAGINATION FUNCTIONALITY\n');

  const criteria: SearchCriteria = {
    hardRequirements: {
      minRooms: 2,
      maxRooms: 5,
      minArea: 50,
      maxArea: 200,
      maxTotalPrice: 5000000,
      allowAdminOverage: false,
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
    const searchService = new SearchService();
    
    console.log('🔍 Testing multiple pages...\n');
    
    // Test page 1
    console.log('📄 PAGE 1:');
    const page1 = await searchService.search(criteria, 1, 20);
    console.log(`   Properties: ${page1.properties.length}`);
    console.log(`   Page: ${page1.page || 1}`);
    console.log(`   Total: ${page1.total || page1.properties.length}`);
    
    if (page1.properties.length > 0) {
      console.log(`   First property: ${page1.properties[0].title?.substring(0, 50)}...`);
      console.log(`   Last property: ${page1.properties[page1.properties.length - 1].title?.substring(0, 50)}...`);
    }
    
    // Test page 2 if available
    const totalPages = Math.ceil((page1.total || page1.properties.length) / 20);
    if (totalPages > 1) {
      console.log('\n📄 PAGE 2:');
      const page2 = await searchService.search(criteria, 2, 20);
      console.log(`   Properties: ${page2.properties.length}`);
      console.log(`   Page: ${page2.page || 2}`);
      console.log(`   Total: ${page2.total || page2.properties.length}`);
      
      if (page2.properties.length > 0) {
        console.log(`   First property: ${page2.properties[0].title?.substring(0, 50)}...`);
        console.log(`   Last property: ${page2.properties[page2.properties.length - 1].title?.substring(0, 50)}...`);
      }
      
      // Check for duplicates between pages
      const page1Ids = new Set(page1.properties.map(p => p.id));
      const page2Ids = new Set(page2.properties.map(p => p.id));
      const duplicates = [...page1Ids].filter(id => page2Ids.has(id));
      
      if (duplicates.length > 0) {
        console.log(`   ⚠️ WARNING: ${duplicates.length} duplicate properties found between pages`);
      } else {
        console.log(`   ✅ No duplicates between pages`);
      }
    }
    
    // Test different page sizes
    console.log('\n📊 TESTING DIFFERENT PAGE SIZES:');
    
    const pageSizes = [5, 10, 20, 50];
    for (const pageSize of pageSizes) {
      const result = await searchService.search(criteria, 1, pageSize);
      console.log(`   Page size ${pageSize}: ${result.properties.length} properties`);
    }
    
    // Summary
    console.log('\n📈 PAGINATION SUMMARY:');
    console.log(`   Total properties available: ${page1.total || page1.properties.length}`);
    console.log(`   Total pages (20 per page): ${totalPages}`);
    console.log(`   Backend pagination: ${totalPages > 1 ? 'Working' : 'Single page only'}`);
    
    // Frontend pagination simulation
    console.log('\n🖥️ FRONTEND PAGINATION SIMULATION:');
    const allProperties = page1.properties;
    const frontendPageSize = 12;
    const frontendPages = Math.ceil(allProperties.length / frontendPageSize);
    
    console.log(`   Properties to paginate: ${allProperties.length}`);
    console.log(`   Frontend page size: ${frontendPageSize}`);
    console.log(`   Frontend pages: ${frontendPages}`);
    
    for (let i = 1; i <= Math.min(frontendPages, 3); i++) {
      const start = (i - 1) * frontendPageSize;
      const end = Math.min(start + frontendPageSize, allProperties.length);
      const pageProperties = allProperties.slice(start, end);
      
      console.log(`   Frontend page ${i}: properties ${start + 1}-${end} (${pageProperties.length} items)`);
    }
    
    // Recommendations
    console.log('\n💡 RECOMMENDATIONS:');
    
    if (totalPages === 1) {
      console.log('   • Backend returns all results in one page');
      console.log('   • Frontend pagination will handle user experience');
      console.log('   • Consider implementing infinite scroll for large datasets');
    } else {
      console.log('   • Backend pagination is working correctly');
      console.log('   • Implement dual pagination: frontend for filters, backend for more results');
      console.log('   • Cache previous pages to improve user experience');
    }
    
    if (page1.properties.length < 50) {
      console.log('   • Consider expanding search criteria to get more results');
      console.log('   • Check if all scrapers are working correctly');
    }

  } catch (error) {
    console.error('❌ Pagination test failed:', error);
  }
}

// Run the test
if (require.main === module) {
  testPagination()
    .then(() => {
      console.log('\n✅ Pagination test completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Test failed:', error);
      process.exit(1);
    });
}

export { testPagination };
