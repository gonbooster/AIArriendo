#!/usr/bin/env tsx

/**
 * Debug estrato filtering in Ciencuadras properties
 */

import { CiencuadrasScraper } from '../core/scraping/scrapers/CiencuadrasScraper';
import { SearchCriteria } from '../core/types/SearchCriteria';
import { RateLimiter } from '../core/scraping/RateLimiter';
import { logger } from '../core/utils/logger';

async function debugEstratoFilter() {
  console.log('🏢 Debugging estrato filtering in Ciencuadras...\n');

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
    console.log(`   Estrato: 3-5 (from your search)`);
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

    console.log('🏢 ANALYZING ESTRATO IN ALL CIENCUADRAS PROPERTIES:\n');

    let withEstrato = 0;
    let withoutEstrato = 0;
    let estratoValues: number[] = [];
    let estratoCompliant = 0;

    properties.forEach((prop, index) => {
      console.log(`🏠 PROPERTY ${index + 1}:`);
      console.log(`   Title: ${prop.title.substring(0, 60)}...`);
      console.log(`   Price: $${prop.totalPrice.toLocaleString()}`);
      console.log(`   Area: ${prop.area}m²`);
      console.log(`   Rooms: ${prop.rooms}`);
      console.log(`   Location: ${prop.location.address || prop.location.neighborhood || 'N/A'}`);
      
      // Check estrato
      const estrato = (prop as any).stratum || prop.stratum || 0;
      console.log(`   Estrato: ${estrato || 'NO DATA'}`);
      
      if (estrato && estrato > 0) {
        withEstrato++;
        estratoValues.push(estrato);
        
        // Check if it complies with estrato 3-5
        if (estrato >= 3 && estrato <= 5) {
          console.log(`   ✅ Estrato compliant (${estrato} is in range 3-5)`);
          estratoCompliant++;
        } else {
          console.log(`   ❌ Estrato non-compliant (${estrato} is NOT in range 3-5)`);
        }
      } else {
        withoutEstrato++;
        console.log(`   ⚠️  No estrato data available`);
      }
      
      console.log('');
    });

    // Summary
    console.log('📊 ESTRATO ANALYSIS SUMMARY:');
    console.log(`   Total properties: ${properties.length}`);
    console.log(`   Properties with estrato data: ${withEstrato}`);
    console.log(`   Properties without estrato data: ${withoutEstrato}`);
    console.log(`   Properties with compliant estrato (3-5): ${estratoCompliant}`);

    if (estratoValues.length > 0) {
      const uniqueEstratos = [...new Set(estratoValues)].sort();
      const avgEstrato = estratoValues.reduce((a, b) => a + b, 0) / estratoValues.length;
      const minEstrato = Math.min(...estratoValues);
      const maxEstrato = Math.max(...estratoValues);
      
      console.log(`   Estrato range found: ${minEstrato}-${maxEstrato} (avg: ${avgEstrato.toFixed(1)})`);
      console.log(`   Unique estratos found: ${uniqueEstratos.join(', ')}`);
    }

    // Check if estrato filtering is the issue
    if (withoutEstrato === properties.length) {
      console.log('\n⚠️  ISSUE: No properties have estrato data!');
      console.log('   This could mean:');
      console.log('   • Ciencuadras doesn\'t provide estrato information');
      console.log('   • The scraper is not extracting estrato correctly');
      console.log('   • Estrato filtering might be too strict');
    } else if (estratoCompliant === 0 && withEstrato > 0) {
      console.log('\n❌ ISSUE: No properties have estrato 3-5!');
      console.log('   All properties are outside the estrato 3-5 range');
      console.log('   Consider expanding estrato range or removing estrato filter');
    } else if (estratoCompliant > 0) {
      console.log(`\n✅ Good: ${estratoCompliant} properties have compliant estrato (3-5)`);
    }

    // Test without estrato filter
    console.log('\n🧪 TESTING: What if we ignore estrato filter?');
    let wouldPassWithoutEstrato = 0;
    
    properties.forEach((prop) => {
      // Check all other criteria except estrato
      const roomsOk = prop.rooms >= 3 && prop.rooms <= 4;
      const areaOk = prop.area >= 70 && prop.area <= 110;
      const priceOk = prop.totalPrice <= 3500000;
      const locationText = (prop.location.address || prop.location.neighborhood || '').toLowerCase();
      const locationOk = locationText.includes('usaquén') || locationText.includes('usaquen');
      
      if (roomsOk && areaOk && priceOk && locationOk) {
        wouldPassWithoutEstrato++;
      }
    });

    console.log(`   Properties that would pass without estrato filter: ${wouldPassWithoutEstrato}`);
    
    if (wouldPassWithoutEstrato > estratoCompliant) {
      console.log('   🎯 Estrato filter is eliminating some properties!');
      console.log('   Consider removing or relaxing the estrato requirement');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the debug
debugEstratoFilter().catch(console.error);
