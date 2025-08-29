#!/usr/bin/env tsx

/**
 * Test complete flow: Scraper → Parser → API → Frontend format
 * Verifies that all Ciencuadras data flows correctly through the entire system
 */

import { CiencuadrasScraper } from '../core/scraping/scrapers/CiencuadrasScraper';
import { SearchCriteria } from '../core/types/SearchCriteria';
import { RateLimiter } from '../core/scraping/RateLimiter';
import { logger } from '../core/utils/logger';

async function testFullFlowCiencuadras() {
  console.log('🔄 Testing COMPLETE FLOW: Scraper → Parser → API → Frontend\n');

  try {
    // 1. SCRAPER STAGE
    console.log('📊 STAGE 1: SCRAPER');
    console.log('================');

    const rateLimiter = new RateLimiter(1000);
    const source = {
      id: 'ciencuadras',
      name: 'Ciencuadras',
      baseUrl: 'https://www.ciencuadras.com',
      isActive: true
    };
    const scraper = new CiencuadrasScraper(source, rateLimiter);

    const criteria: SearchCriteria = {
      hardRequirements: {
        operation: 'arriendo' as const,
        propertyTypes: ['apartamento'],
        location: {
          city: 'Bogotá',
          neighborhoods: []
        },
        minRooms: 1,
        maxTotalPrice: 3000000,
        minArea: 30
      },
      preferences: {
        maxCommute: 30,
        amenities: [],
        preferredNeighborhoods: []
      }
    };

    const properties = await scraper.scrape(criteria, 1);
    console.log(`✅ Scraped ${properties.length} properties from Ciencuadras\n`);

    if (properties.length === 0) {
      console.log('❌ No properties found, cannot test full flow');
      return;
    }

    // 2. ANALYZE SCRAPED DATA STRUCTURE
    console.log('📊 STAGE 2: SCRAPED DATA ANALYSIS');
    console.log('=================================');

    const sampleProperty = properties[0];
    console.log('🏠 Sample scraped property structure:');
    console.log(`   ID: ${sampleProperty.id}`);
    console.log(`   Title: ${sampleProperty.title}`);
    console.log(`   Price: $${sampleProperty.price.toLocaleString()}`);
    console.log(`   Admin Fee: $${sampleProperty.adminFee.toLocaleString()}`);
    console.log(`   Total Price: $${sampleProperty.totalPrice.toLocaleString()}`);
    console.log(`   Area: ${sampleProperty.area}m²`);
    console.log(`   Rooms: ${sampleProperty.rooms}`);
    console.log(`   Bathrooms: ${sampleProperty.bathrooms}`);
    console.log(`   Location Type: ${typeof sampleProperty.location}`);
    console.log(`   Location: ${JSON.stringify(sampleProperty.location, null, 2)}`);
    console.log(`   Images: ${sampleProperty.images.length} images`);
    console.log(`   URL: ${sampleProperty.url}`);
    console.log(`   Source: ${sampleProperty.source}`);
    console.log(`   Price/m²: $${sampleProperty.pricePerM2.toLocaleString()}\n`);

    // 3. SIMULATE API RESPONSE FORMAT
    console.log('📊 STAGE 3: API RESPONSE SIMULATION');
    console.log('===================================');

    // Simulate what the API would return
    const apiResponse = {
      success: true,
      data: {
        properties: properties.slice(0, 5), // First 5 properties
        pagination: {
          page: 1,
          limit: 20,
          total: properties.length,
          totalPages: Math.ceil(properties.length / 20)
        },
        searchCriteria: criteria,
        executionTime: '0.15s'
      }
    };

    console.log('🔗 API Response structure:');
    console.log(`   Success: ${apiResponse.success}`);
    console.log(`   Properties count: ${apiResponse.data.properties.length}`);
    console.log(`   Total found: ${apiResponse.data.pagination.total}`);
    console.log(`   Execution time: ${apiResponse.data.executionTime}\n`);

    // 4. SIMULATE FRONTEND DATA PROCESSING
    console.log('📊 STAGE 4: FRONTEND DATA PROCESSING');
    console.log('====================================');

    const frontendProperties = apiResponse.data.properties.map(prop => ({
      id: prop.id,
      title: prop.title,
      price: prop.price,
      adminFee: prop.adminFee,
      totalPrice: prop.totalPrice,
      area: prop.area,
      rooms: prop.rooms,
      bathrooms: prop.bathrooms || 0,
      location: {
        display: typeof prop.location === 'string' ? prop.location : 
                 prop.location.address || `${prop.location.neighborhood || ''}, ${prop.location.city || 'Bogotá'}`,
        neighborhood: typeof prop.location === 'object' ? prop.location.neighborhood : '',
        city: typeof prop.location === 'object' ? prop.location.city : 'Bogotá'
      },
      images: prop.images || [],
      url: prop.url,
      source: prop.source,
      pricePerM2: prop.pricePerM2,
      isActive: prop.isActive
    }));

    console.log('🎨 Frontend-ready properties:');
    frontendProperties.slice(0, 3).forEach((prop, index) => {
      console.log(`\n${index + 1}. ${prop.title}`);
      console.log(`   💰 Price: $${prop.price.toLocaleString()}`);
      console.log(`   📐 Area: ${prop.area}m²`);
      console.log(`   🛏️  Rooms: ${prop.rooms}`);
      console.log(`   🚿 Bathrooms: ${prop.bathrooms}`);
      console.log(`   📍 Location: ${prop.location.display}`);
      console.log(`   🖼️  Images: ${prop.images.length} available`);
      console.log(`   🔗 URL: ${prop.url}`);
      console.log(`   📊 Price/m²: $${prop.pricePerM2.toLocaleString()}`);
    });

    // 5. DATA QUALITY VERIFICATION
    console.log('\n📊 STAGE 5: DATA QUALITY VERIFICATION');
    console.log('=====================================');

    const qualityChecks = {
      hasValidPrices: frontendProperties.filter(p => p.price > 0).length,
      hasValidAreas: frontendProperties.filter(p => p.area > 0).length,
      hasValidRooms: frontendProperties.filter(p => p.rooms > 0).length,
      hasValidBathrooms: frontendProperties.filter(p => p.bathrooms > 0).length,
      hasValidLocations: frontendProperties.filter(p => p.location.display && p.location.display !== '[object Object]').length,
      hasValidImages: frontendProperties.filter(p => p.images.length > 0).length,
      hasValidUrls: frontendProperties.filter(p => p.url && p.url.includes('ciencuadras')).length,
      hasValidPricePerM2: frontendProperties.filter(p => p.pricePerM2 > 0).length
    };

    const total = frontendProperties.length;
    console.log('✅ Data Quality Report:');
    console.log(`   Valid Prices: ${qualityChecks.hasValidPrices}/${total} (${Math.round(qualityChecks.hasValidPrices/total*100)}%)`);
    console.log(`   Valid Areas: ${qualityChecks.hasValidAreas}/${total} (${Math.round(qualityChecks.hasValidAreas/total*100)}%)`);
    console.log(`   Valid Rooms: ${qualityChecks.hasValidRooms}/${total} (${Math.round(qualityChecks.hasValidRooms/total*100)}%)`);
    console.log(`   Valid Bathrooms: ${qualityChecks.hasValidBathrooms}/${total} (${Math.round(qualityChecks.hasValidBathrooms/total*100)}%)`);
    console.log(`   Valid Locations: ${qualityChecks.hasValidLocations}/${total} (${Math.round(qualityChecks.hasValidLocations/total*100)}%)`);
    console.log(`   Valid Images: ${qualityChecks.hasValidImages}/${total} (${Math.round(qualityChecks.hasValidImages/total*100)}%)`);
    console.log(`   Valid URLs: ${qualityChecks.hasValidUrls}/${total} (${Math.round(qualityChecks.hasValidUrls/total*100)}%)`);
    console.log(`   Valid Price/m²: ${qualityChecks.hasValidPricePerM2}/${total} (${Math.round(qualityChecks.hasValidPricePerM2/total*100)}%)`);

    // 6. FINAL VERDICT
    console.log('\n🎯 FINAL VERDICT');
    console.log('================');

    const allFieldsValid = Object.values(qualityChecks).every(count => count === total);
    const mostFieldsValid = Object.values(qualityChecks).filter(count => count === total).length >= 6;

    if (allFieldsValid) {
      console.log('🎉 PERFECT! All data flows correctly through the entire system');
      console.log('✅ Ready for production use');
    } else if (mostFieldsValid) {
      console.log('✅ EXCELLENT! Most data flows correctly');
      console.log('⚠️  Minor issues detected but system is functional');
    } else {
      console.log('⚠️  ISSUES DETECTED in data flow');
      console.log('🔧 Some fields need attention');
    }

  } catch (error) {
    console.error('❌ Error in full flow test:', error);
  }
}

// Run the complete flow test
testFullFlowCiencuadras().catch(console.error);
