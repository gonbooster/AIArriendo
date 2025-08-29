#!/usr/bin/env ts-node

/**
 * Test usando DIRECTAMENTE la función search() del SearchController
 */

import { SearchController } from '../controllers/SearchController';

// CRITERIOS EXACTOS del frontend (hardcodeados)
const frontendCriteria = {
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
    "neighborhoods": ["Usaquén"]
  },
  "preferences": {
    "wetAreas": [],
    "sports": [],
    "amenities": []
  }
};

async function testControllerSearch() {
  console.log('🎯 TESTING SEARCH CONTROLLER DIRECTLY');
  console.log('📋 Frontend Criteria:', JSON.stringify(frontendCriteria, null, 2));
  console.log('\n' + '='.repeat(80));

  const controller = new SearchController();
  
  // Mock request y response objects
  const mockReq: any = {
    body: {
      criteria: frontendCriteria,
      page: 1,
      limit: 48
    }
  };

  let responseData: any = null;
  let responseStatus: number = 200;

  const mockRes: any = {
    status: (code: number) => {
      responseStatus = code;
      return mockRes;
    },
    json: (data: any) => {
      responseData = data;
      return mockRes;
    }
  };

  const mockNext: any = (error?: any) => {
    if (error) {
      console.log('❌ Next called with error:', error);
    }
  };

  console.log('🚀 Calling SearchController.search()...');
  const startTime = Date.now();

  try {
    await controller.search(mockReq, mockRes, mockNext);
    const duration = Date.now() - startTime;

    console.log(`✅ Controller responded in ${duration}ms`);
    console.log(`📊 Response Status: ${responseStatus}`);
    
    if (responseData) {
      console.log('\n📋 RESPONSE ANALYSIS:');
      console.log(`   Success: ${responseData.success}`);
      
      if (responseData.success && responseData.data) {
        const properties = responseData.data.properties || [];
        const total = responseData.data.total || 0;
        const summary = responseData.data.summary || {};
        
        console.log(`   🏠 Properties returned: ${properties.length}`);
        console.log(`   📊 Total found: ${total}`);
        
        if (summary.sourceBreakdown) {
          console.log('\n📊 SOURCE BREAKDOWN:');
          Object.entries(summary.sourceBreakdown).forEach(([source, count]) => {
            console.log(`   ${source.toUpperCase()}: ${count}`);
          });
        }
        
        if (properties.length > 0) {
          console.log('\n🏠 SAMPLE PROPERTIES:');
          properties.slice(0, 3).forEach((prop: any, i: number) => {
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
        }
        
        // Análisis de filtros
        console.log('\n🔍 FILTER ANALYSIS:');
        const locationProps = properties.filter((p: any) =>
          p.location?.address || p.location?.neighborhood
        );
        console.log(`   📍 Properties with location: ${locationProps.length}/${properties.length}`);
        
        const priceRange = properties.filter((p: any) => 
          p.price >= frontendCriteria.minPrice && p.price <= frontendCriteria.maxPrice
        );
        console.log(`   💰 In price range: ${priceRange.length}/${properties.length}`);
        
        const roomRange = properties.filter((p: any) => 
          p.rooms === 0 || (p.rooms >= frontendCriteria.minRooms && p.rooms <= frontendCriteria.maxRooms)
        );
        console.log(`   🛏️  In room range: ${roomRange.length}/${properties.length}`);
        
        // Análisis por proveedor
        console.log('\n📊 PROVIDER ANALYSIS:');
        const providerCounts: any = {};
        properties.forEach((p: any) => {
          const provider = p.provider || 'unknown';
          providerCounts[provider] = (providerCounts[provider] || 0) + 1;
        });
        
        Object.entries(providerCounts).forEach(([provider, count]) => {
          console.log(`   ${provider.toUpperCase()}: ${count} properties`);
        });
        
      } else if (responseData.error) {
        console.log(`   ❌ Error: ${responseData.error}`);
      }
      
      if (responseData.pagination) {
        console.log('\n📄 PAGINATION:');
        console.log(`   Page: ${responseData.pagination.page}`);
        console.log(`   Limit: ${responseData.pagination.limit}`);
        console.log(`   Total: ${responseData.pagination.total}`);
        console.log(`   Pages: ${responseData.pagination.pages}`);
      }
      
    } else {
      console.log('❌ No response data received');
    }

  } catch (error) {
    const duration = Date.now() - startTime;
    console.log(`❌ Controller failed in ${duration}ms`);
    console.log(`💥 Error: ${(error as Error).message}`);
    console.log(`📚 Stack: ${(error as Error).stack}`);
  }

  console.log('\n🏁 CONTROLLER TEST COMPLETED');
  
  return {
    success: responseStatus === 200 && responseData?.success,
    properties: responseData?.data?.properties?.length || 0,
    total: responseData?.data?.total || 0,
    duration: Date.now() - startTime,
    sourceBreakdown: responseData?.data?.summary?.sourceBreakdown || {}
  };
}

if (require.main === module) {
  testControllerSearch().then((result) => {
    console.log('\n✅ Test completed');
    console.log(`📊 Final result: ${result.properties} properties, ${result.success ? 'SUCCESS' : 'FAILED'}`);
    process.exit(0);
  }).catch(error => {
    console.error('💥 Test crashed:', error);
    process.exit(1);
  });
}

export { testControllerSearch };
