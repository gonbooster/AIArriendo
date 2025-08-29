#!/usr/bin/env tsx

/**
 * Debug why Ciencuadras properties are not passing the strict filters
 */

import { CiencuadrasScraper } from '../core/scraping/scrapers/CiencuadrasScraper';
import { SearchCriteria } from '../core/types/SearchCriteria';
import { RateLimiter } from '../core/scraping/RateLimiter';
import { logger } from '../core/utils/logger';

async function debugCiencuadrasFilters() {
  console.log('🔍 Debugging why Ciencuadras properties are filtered out...\n');

  try {
    const rateLimiter = new RateLimiter(1000);
    const source = {
      id: 'ciencuadras',
      name: 'Ciencuadras',
      baseUrl: 'https://www.ciencuadras.com',
      isActive: true
    };
    const scraper = new CiencuadrasScraper(source, rateLimiter);

    // Your exact search criteria
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
        minArea: 70,
        maxArea: 110,
        maxTotalPrice: 3500000
      },
      preferences: {
        maxCommute: 30,
        amenities: [],
        preferredNeighborhoods: []
      }
    };

    console.log('📋 SEARCH CRITERIA:');
    console.log(`   Rooms: ${criteria.hardRequirements.minRooms}-${criteria.hardRequirements.maxRooms}`);
    console.log(`   Area: ${criteria.hardRequirements.minArea}-${criteria.hardRequirements.maxArea} m²`);
    console.log(`   Max Price: $${criteria.hardRequirements.maxTotalPrice?.toLocaleString()}`);
    console.log(`   Location: ${criteria.hardRequirements.location.neighborhoods?.join(', ')}`);
    console.log('');

    const properties = await scraper.scrape(criteria, 1);
    console.log(`✅ Ciencuadras scraped ${properties.length} properties\n`);

    if (properties.length === 0) {
      console.log('❌ No properties found from Ciencuadras scraper');
      return;
    }

    console.log('🔍 ANALYZING ALL CIENCUADRAS PROPERTIES:\n');

    let compliantCount = 0;
    let roomsIssues = 0;
    let areaIssues = 0;
    let priceIssues = 0;
    let locationIssues = 0;

    properties.forEach((prop, index) => {
      console.log(`🏠 PROPERTY ${index + 1}:`);
      console.log(`   Title: ${prop.title}`);
      console.log(`   Price: $${prop.totalPrice.toLocaleString()}`);
      console.log(`   Area: ${prop.area}m²`);
      console.log(`   Rooms: ${prop.rooms}`);
      console.log(`   Bathrooms: ${prop.bathrooms || 'N/A'}`);
      console.log(`   Location: ${prop.location.address || prop.location.neighborhood || 'N/A'}`);
      
      // Check compliance with each filter
      const issues = [];
      let isCompliant = true;

      // Rooms check
      if (prop.rooms < 3 || prop.rooms > 4) {
        issues.push(`❌ Rooms: ${prop.rooms} (need 3-4)`);
        roomsIssues++;
        isCompliant = false;
      } else {
        issues.push(`✅ Rooms: ${prop.rooms}`);
      }

      // Area check
      if (prop.area < 70 || prop.area > 110) {
        issues.push(`❌ Area: ${prop.area}m² (need 70-110)`);
        areaIssues++;
        isCompliant = false;
      } else {
        issues.push(`✅ Area: ${prop.area}m²`);
      }

      // Price check
      if (prop.totalPrice > 3500000) {
        issues.push(`❌ Price: $${prop.totalPrice.toLocaleString()} (max $3.5M)`);
        priceIssues++;
        isCompliant = false;
      } else {
        issues.push(`✅ Price: $${prop.totalPrice.toLocaleString()}`);
      }

      // Location check
      const locationText = (prop.location.address || prop.location.neighborhood || '').toLowerCase();
      const hasUsaquen = locationText.includes('usaquén') || locationText.includes('usaquen');
      if (!hasUsaquen) {
        issues.push(`❌ Location: "${locationText}" (need Usaquén)`);
        locationIssues++;
        isCompliant = false;
      } else {
        issues.push(`✅ Location: contains Usaquén`);
      }

      console.log(`   ${issues.join(', ')}`);
      
      if (isCompliant) {
        console.log(`   🎉 PASSES ALL FILTERS!`);
        compliantCount++;
      } else {
        console.log(`   ❌ Filtered out`);
      }
      
      console.log('');
    });

    // Summary
    console.log('📊 FILTER ANALYSIS SUMMARY:');
    console.log(`   Total properties: ${properties.length}`);
    console.log(`   Compliant properties: ${compliantCount}`);
    console.log(`   Properties with room issues: ${roomsIssues}`);
    console.log(`   Properties with area issues: ${areaIssues}`);
    console.log(`   Properties with price issues: ${priceIssues}`);
    console.log(`   Properties with location issues: ${locationIssues}`);

    if (compliantCount === 0) {
      console.log('\n🔧 SUGGESTIONS TO GET CIENCUADRAS RESULTS:');
      
      if (roomsIssues > properties.length * 0.5) {
        console.log('   • Try expanding rooms to 2-4 or 1-4');
      }
      if (areaIssues > properties.length * 0.5) {
        console.log('   • Try expanding area to 50-150 m²');
      }
      if (priceIssues > properties.length * 0.5) {
        console.log('   • Try increasing max price to $5M or $6M');
      }
      if (locationIssues > properties.length * 0.5) {
        console.log('   • Try searching in broader Bogotá area or different neighborhoods');
      }

      // Find the most common values
      const roomCounts = properties.map(p => p.rooms).filter(r => r > 0);
      const areaSizes = properties.map(p => p.area).filter(a => a > 0);
      const prices = properties.map(p => p.totalPrice).filter(p => p > 0);

      if (roomCounts.length > 0) {
        const avgRooms = Math.round(roomCounts.reduce((a, b) => a + b, 0) / roomCounts.length);
        const minRooms = Math.min(...roomCounts);
        const maxRooms = Math.max(...roomCounts);
        console.log(`   • Ciencuadras rooms range: ${minRooms}-${maxRooms} (avg: ${avgRooms})`);
      }

      if (areaSizes.length > 0) {
        const avgArea = Math.round(areaSizes.reduce((a, b) => a + b, 0) / areaSizes.length);
        const minArea = Math.min(...areaSizes);
        const maxArea = Math.max(...areaSizes);
        console.log(`   • Ciencuadras area range: ${minArea}-${maxArea}m² (avg: ${avgArea}m²)`);
      }

      if (prices.length > 0) {
        const avgPrice = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        console.log(`   • Ciencuadras price range: $${minPrice.toLocaleString()}-$${maxPrice.toLocaleString()} (avg: $${avgPrice.toLocaleString()})`);
      }
    } else {
      console.log(`\n🎉 Great! ${compliantCount} Ciencuadras properties should appear in your search results.`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the debug
debugCiencuadrasFilters().catch(console.error);
