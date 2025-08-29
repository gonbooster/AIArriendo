#!/usr/bin/env tsx

/**
 * Debug script to check images and URLs from Ciencuadras
 */

import { CiencuadrasScraper } from '../core/scraping/scrapers/CiencuadrasScraper';
import { SearchCriteria } from '../core/types/SearchCriteria';
import { RateLimiter } from '../core/scraping/RateLimiter';
import { logger } from '../core/utils/logger';

async function debugImagesAndUrls() {
  console.log('🖼️ Debugging Ciencuadras images and URLs...\n');

  try {
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
          neighborhoods: ['Usaquén']
        },
        minRooms: 3,
        maxRooms: 4,
        minBathrooms: 2,
        maxBathrooms: 3,
        minArea: 70,
        maxArea: 110,
        minTotalPrice: 500000,
        maxTotalPrice: 3500000
      },
      preferences: {
        maxCommute: 30,
        amenities: [],
        preferredNeighborhoods: []
      }
    };

    const properties = await scraper.scrape(criteria, 1);
    console.log(`✅ Found ${properties.length} properties from Ciencuadras\n`);

    if (properties.length === 0) {
      console.log('❌ No properties found');
      return;
    }

    console.log('🔍 DETAILED ANALYSIS OF FIRST 5 PROPERTIES:\n');

    properties.slice(0, 5).forEach((prop, index) => {
      console.log(`🏠 PROPERTY ${index + 1}:`);
      console.log(`   Title: ${prop.title}`);
      console.log(`   Price: $${prop.price.toLocaleString()}`);
      console.log(`   Area: ${prop.area}m²`);
      console.log(`   Rooms: ${prop.rooms}`);
      console.log(`   Bathrooms: ${prop.bathrooms}`);
      console.log(`   Location: ${JSON.stringify(prop.location)}`);
      console.log(`   Images array: ${JSON.stringify(prop.images)}`);
      console.log(`   Images count: ${prop.images.length}`);
      console.log(`   First image: ${prop.images[0] || 'NO IMAGE'}`);
      console.log(`   URL: ${prop.url}`);
      console.log(`   Source: ${prop.source}`);
      
      // Check if image URL is valid
      if (prop.images.length > 0) {
        const imageUrl = prop.images[0];
        console.log(`   ✅ Image URL valid: ${imageUrl.startsWith('http')}`);
        console.log(`   🌐 Image domain: ${imageUrl.includes('amazonaws') ? 'AWS S3' : 'Other'}`);
      } else {
        console.log(`   ❌ NO IMAGES FOUND`);
      }
      
      // Check if URL is specific
      if (prop.url.includes('/inmueble/') || prop.url.includes('/property/')) {
        console.log(`   ✅ URL is specific`);
      } else {
        console.log(`   ⚠️  URL is generic: ${prop.url}`);
      }
      
      console.log('');
    });

    // Summary
    const withImages = properties.filter(p => p.images.length > 0).length;
    const withValidUrls = properties.filter(p => p.url.includes('/inmueble/') || p.url.includes('/property/')).length;
    const withHttpImages = properties.filter(p => p.images.length > 0 && p.images[0].startsWith('http')).length;

    console.log('📊 SUMMARY:');
    console.log(`   Properties with images: ${withImages}/${properties.length} (${Math.round(withImages/properties.length*100)}%)`);
    console.log(`   Properties with HTTP images: ${withHttpImages}/${properties.length} (${Math.round(withHttpImages/properties.length*100)}%)`);
    console.log(`   Properties with specific URLs: ${withValidUrls}/${properties.length} (${Math.round(withValidUrls/properties.length*100)}%)`);

    // Test a sample image URL
    if (properties.length > 0 && properties[0].images.length > 0) {
      const testImageUrl = properties[0].images[0];
      console.log(`\n🧪 TESTING SAMPLE IMAGE URL:`);
      console.log(`   URL: ${testImageUrl}`);
      
      try {
        const fetch = (await import('node-fetch')).default;
        const response = await fetch(testImageUrl, { method: 'HEAD' });
        console.log(`   Status: ${response.status} ${response.statusText}`);
        console.log(`   Content-Type: ${response.headers.get('content-type')}`);
        console.log(`   Content-Length: ${response.headers.get('content-length')}`);
        
        if (response.status === 200) {
          console.log(`   ✅ Image URL is accessible`);
        } else {
          console.log(`   ❌ Image URL is not accessible`);
        }
      } catch (error) {
        console.log(`   ❌ Error testing image URL: ${error.message}`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the debug
debugImagesAndUrls().catch(console.error);
