#!/usr/bin/env tsx

/**
 * Test script for improved Ciencuadras scraper
 * Tests the new JSON extraction capabilities
 */

import { CiencuadrasScraper } from '../core/scraping/scrapers/CiencuadrasScraper';
import { SearchCriteria } from '../core/types/SearchCriteria';
import { RateLimiter } from '../core/scraping/RateLimiter';
import { logger } from '../core/utils/logger';

async function testCiencuadrasImproved() {
  console.log('🔧 Testing IMPROVED Ciencuadras scraper...\n');

  const rateLimiter = new RateLimiter(1000); // 1 second between requests
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

  try {
    console.log('📍 Testing Ciencuadras with improved JSON extraction...');
    const startTime = Date.now();
    
    const properties = await scraper.scrape(criteria, 1);
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    console.log(`\n✅ Ciencuadras Results (${duration}s):`);
    console.log(`📊 Found ${properties.length} properties`);

    if (properties.length > 0) {
      console.log('\n🏠 Sample Properties:');
      
      properties.slice(0, 5).forEach((prop, index) => {
        console.log(`\n${index + 1}. ${prop.title}`);
        console.log(`   💰 Price: $${prop.price.toLocaleString()}`);
        console.log(`   📐 Area: ${prop.area}m²`);
        console.log(`   🛏️  Rooms: ${prop.rooms}`);
        console.log(`   🚿 Bathrooms: ${prop.bathrooms}`);
        console.log(`   📍 Location: ${prop.location.address || prop.location.neighborhood || 'Bogotá'}`);
        console.log(`   🖼️  Image: ${prop.images[0] ? 'Yes' : 'No'}`);
        console.log(`   🔗 URL: ${prop.url}`);
        
        if (prop.adminFee > 0) {
          console.log(`   🏢 Admin Fee: $${prop.adminFee.toLocaleString()}`);
        }
        
        if (prop.pricePerM2 > 0) {
          console.log(`   📊 Price/m²: $${prop.pricePerM2.toLocaleString()}`);
        }
      });

      // Analyze data quality
      console.log('\n📈 Data Quality Analysis:');
      const withImages = properties.filter(p => p.images.length > 0).length;
      const withArea = properties.filter(p => p.area > 0).length;
      const withRooms = properties.filter(p => p.rooms > 0).length;
      const withBathrooms = properties.filter(p => p.bathrooms > 0).length;
      const withValidUrls = properties.filter(p => p.url.includes('ciencuadras.com')).length;

      console.log(`   🖼️  Properties with images: ${withImages}/${properties.length} (${Math.round(withImages/properties.length*100)}%)`);
      console.log(`   📐 Properties with area: ${withArea}/${properties.length} (${Math.round(withArea/properties.length*100)}%)`);
      console.log(`   🛏️  Properties with rooms: ${withRooms}/${properties.length} (${Math.round(withRooms/properties.length*100)}%)`);
      console.log(`   🚿 Properties with bathrooms: ${withBathrooms}/${properties.length} (${Math.round(withBathrooms/properties.length*100)}%)`);
      console.log(`   🔗 Properties with valid URLs: ${withValidUrls}/${properties.length} (${Math.round(withValidUrls/properties.length*100)}%)`);

      // Check for duplicates
      const uniqueUrls = new Set(properties.map(p => p.url));
      const duplicates = properties.length - uniqueUrls.size;
      if (duplicates > 0) {
        console.log(`   ⚠️  Duplicate properties found: ${duplicates}`);
      } else {
        console.log(`   ✅ No duplicate properties found`);
      }

      // Price analysis
      const prices = properties.map(p => p.price).filter(p => p > 0);
      if (prices.length > 0) {
        const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        
        console.log(`\n💰 Price Analysis:`);
        console.log(`   Average: $${Math.round(avgPrice).toLocaleString()}`);
        console.log(`   Range: $${minPrice.toLocaleString()} - $${maxPrice.toLocaleString()}`);
      }

    } else {
      console.log('❌ No properties found');
    }

  } catch (error) {
    console.error('❌ Error testing Ciencuadras:', error);
  }
}

// Run the test
testCiencuadrasImproved().catch(console.error);
