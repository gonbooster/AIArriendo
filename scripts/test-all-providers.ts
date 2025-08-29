#!/usr/bin/env ts-node

/**
 * Test ALL 7 providers with exact parameters from frontend
 */

import { UniversalScraper } from '../core/scrapers-v2/universal-scraper';
import { WebSearchCriteria } from '../core/schemas/base-provider-schema';

// EXACT criteria from frontend
const webCriteria: WebSearchCriteria = {
  "operation": "arriendo",
  "propertyTypes": [
    "Apartamento"
  ],
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
    "neighborhoods": [
      "Chapinero"
    ]
  },
  "preferences": {
    "wetAreas": [],
    "sports": [],
    "amenities": []
  }
};

// ALL 7 providers
const providers = [
  'mercadolibre',
  'properati', 
  'ciencuadras',
  'metrocuadrado',
  'fincaraiz',
  'pads',
  'trovit'
];

async function testAllProviders() {
  console.log('🚀 TESTING ALL 7 PROVIDERS');
  console.log('📋 Criteria:', JSON.stringify(webCriteria, null, 2));
  console.log('\n' + '='.repeat(80));

  const results: any[] = [];

  for (const providerId of providers) {
    console.log(`\n🔍 === TESTING ${providerId.toUpperCase()} ===`);
    
    const startTime = Date.now();
    
    try {
      const scraper = new UniversalScraper(providerId, webCriteria);
      const properties = await scraper.scrape(1); // 1 page only for speed
      
      const duration = Date.now() - startTime;
      
      const result: any = {
        provider: providerId,
        status: 'SUCCESS',
        duration: duration,
        properties: properties.length,
        sample: properties.slice(0, 2).map(p => ({
          title: p.title,
          price: p.price,
          area: p.area,
          rooms: p.rooms,
          bathrooms: p.bathrooms,
          parking: p.parking || 0,
          location: p.location.address,
          neighborhood: p.location.neighborhood,
          url: p.url,
          images: p.images.length
        }))
      };

      // Validation stats
      const withTitle = properties.filter(p => p.title && p.title.length > 0).length;
      const withPrice = properties.filter(p => p.price > 0).length;
      const withArea = properties.filter(p => p.area > 0).length;
      const withRooms = properties.filter(p => p.rooms > 0).length;
      const withBathrooms = properties.filter(p => p.bathrooms > 0).length;
      const withParking = properties.filter(p => (p.parking || 0) > 0).length;
      const withImages = properties.filter(p => p.images.length > 0).length;
      const withUrl = properties.filter(p => p.url && p.url.length > 0).length;
      
      result.validation = {
        titles: `${withTitle}/${properties.length} (${Math.round(withTitle/properties.length*100)}%)`,
        prices: `${withPrice}/${properties.length} (${Math.round(withPrice/properties.length*100)}%)`,
        areas: `${withArea}/${properties.length} (${Math.round(withArea/properties.length*100)}%)`,
        rooms: `${withRooms}/${properties.length} (${Math.round(withRooms/properties.length*100)}%)`,
        bathrooms: `${withBathrooms}/${properties.length} (${Math.round(withBathrooms/properties.length*100)}%)`,
        parking: `${withParking}/${properties.length} (${Math.round(withParking/properties.length*100)}%)`,
        images: `${withImages}/${properties.length} (${Math.round(withImages/properties.length*100)}%)`,
        urls: `${withUrl}/${properties.length} (${Math.round(withUrl/properties.length*100)}%)`
      };

      // Filter validation
      const inPriceRange = properties.filter(p => p.price >= webCriteria.minPrice! && p.price <= webCriteria.maxPrice!).length;
      const inRoomRange = properties.filter(p => p.rooms === 0 || (p.rooms >= webCriteria.minRooms! && p.rooms <= webCriteria.maxRooms!)).length;
      const inAreaRange = properties.filter(p => p.area === 0 || (p.area >= webCriteria.minArea! && p.area <= webCriteria.maxArea!)).length;
      const withLocation = properties.filter(p =>
        p.location.address || p.location.neighborhood
      ).length;

      result.filters = {
        priceRange: `${inPriceRange}/${properties.length}`,
        roomRange: `${inRoomRange}/${properties.length}`,
        areaRange: `${inAreaRange}/${properties.length}`,
        withLocation: `${withLocation}/${properties.length}`
      };

      console.log(`✅ ${providerId.toUpperCase()}: ${properties.length} properties in ${duration}ms`);
      console.log(`   📊 URLs: ${result.validation.urls}`);
      console.log(`   🎯 Filters: Price ${result.filters.priceRange}, Rooms ${result.filters.roomRange}, Area ${result.filters.areaRange}, Location ${result.filters.withLocation}`);
      
      results.push(result);
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      const result: any = {
        provider: providerId,
        status: 'ERROR',
        duration: duration,
        properties: 0,
        error: (error as Error).message,
        validation: {},
        filters: {},
        sample: []
      };
      
      console.log(`❌ ${providerId.toUpperCase()}: ERROR in ${duration}ms - ${(error as Error).message}`);
      results.push(result);
    }
  }

  // SUMMARY
  console.log('\n' + '='.repeat(80));
  console.log('📊 FINAL SUMMARY - ALL 7 PROVIDERS');
  console.log('='.repeat(80));

  const successful = results.filter(r => r.status === 'SUCCESS');
  const failed = results.filter(r => r.status === 'ERROR');
  const totalProperties = successful.reduce((sum, r) => sum + r.properties, 0);

  console.log(`\n🎯 OVERVIEW:`);
  console.log(`   ✅ Successful providers: ${successful.length}/7`);
  console.log(`   ❌ Failed providers: ${failed.length}/7`);
  console.log(`   🏠 Total properties: ${totalProperties}`);

  console.log(`\n📋 DETAILED RESULTS:`);
  results.forEach(result => {
    if (result.status === 'SUCCESS') {
      console.log(`\n✅ ${result.provider.toUpperCase()}:`);
      console.log(`   🏠 Properties: ${result.properties}`);
      console.log(`   ⏱️  Duration: ${result.duration}ms`);
      console.log(`   📊 URLs: ${result.validation.urls}`);
      console.log(`   📍 Location: ${result.filters.withLocation}`);
    } else {
      console.log(`\n❌ ${result.provider.toUpperCase()}:`);
      console.log(`   💥 Error: ${result.error}`);
      console.log(`   ⏱️  Duration: ${result.duration}ms`);
    }
  });

  console.log(`\n🔗 URL SUMMARY:`);
  successful.forEach(result => {
    console.log(`   ${result.provider.toUpperCase()}: ${result.validation.urls}`);
  });

  console.log('\n🎉 ALL 7 PROVIDERS TESTED!');
  
  return results;
}

if (require.main === module) {
  testAllProviders().then(() => {
    console.log('\n🏁 Test completed');
    process.exit(0);
  }).catch(error => {
    console.error('💥 Test crashed:', error);
    process.exit(1);
  });
}

export { testAllProviders };
