#!/usr/bin/env tsx

/**
 * Test script to specifically test JSON extraction from Ciencuadras
 */

import axios from 'axios';
import * as cheerio from 'cheerio';

async function testCiencuadrasJsonExtraction() {
  console.log('🔍 Testing Ciencuadras JSON extraction...\n');

  try {
    const url = 'https://www.ciencuadras.com/arriendo/bogota/apartamento?q=bogota';
    console.log(`📍 Fetching: ${url}`);

    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'es-CO,es;q=0.9,en;q=0.8',
        'Referer': 'https://www.ciencuadras.com/',
        'Connection': 'keep-alive'
      },
      timeout: 30000
    });

    const $ = cheerio.load(response.data);
    console.log('✅ Page loaded successfully');

    // Look for JSON data in script tags
    const scripts = $('script').toArray();
    console.log(`📜 Found ${scripts.length} script tags`);

    let foundData = false;

    for (let i = 0; i < scripts.length; i++) {
      const script = scripts[i];
      const scriptContent = $(script).html() || '';
      
      if (scriptContent.length > 1000) { // Only check substantial scripts
        console.log(`\n🔍 Analyzing script ${i + 1} (${scriptContent.length} chars)...`);

        // Look for different JSON patterns
        const patterns = [
          { name: 'NUXT State', regex: /window\.__NUXT__\s*=\s*({.*?});/s },
          { name: 'Initial State', regex: /window\.__INITIAL_STATE__\s*=\s*({.*?});/s },
          { name: 'Search Results', regex: /"searchResults":\s*({.*?"properties":\s*\[.*?\]})/s },
          { name: 'Results Array', regex: /"results":\s*(\[.*?\])/s },
          { name: 'Properties Array', regex: /"properties":\s*(\[.*?\])/s },
          { name: 'Individual Property', regex: /\{[^}]*"id":\s*\d+[^}]*"rentPrice":[^}]*\}/g },
          { name: 'Lease Fee Property', regex: /\{[^}]*"id":\s*\d+[^}]*"leaseFee":[^}]*\}/g }
        ];

        for (const pattern of patterns) {
          const matches = scriptContent.match(pattern.regex);
          if (matches) {
            console.log(`   ✅ Found ${pattern.name}: ${matches.length} matches`);
            foundData = true;

            if (pattern.name.includes('Property') && matches.length > 0) {
              // Try to parse individual properties
              let validProperties = 0;
              for (let j = 0; j < Math.min(3, matches.length); j++) {
                try {
                  const data = JSON.parse(matches[j]);
                  if (data.id && (data.rentPrice || data.leaseFee)) {
                    validProperties++;
                    console.log(`      📋 Property ${data.id}: $${data.rentPrice || data.leaseFee}, ${data.areaPrivate || 'N/A'}m², ${data.numRooms || 'N/A'} rooms`);
                  }
                } catch (e) {
                  // Skip invalid JSON
                }
              }
              console.log(`      ✅ Valid properties: ${validProperties}/${matches.length}`);
            } else if (matches[1]) {
              // Try to parse structured data
              try {
                const data = JSON.parse(matches[1]);
                console.log(`      📊 Data structure keys:`, Object.keys(data).slice(0, 10));
                
                // Look for properties in the data
                if (data.properties && Array.isArray(data.properties)) {
                  console.log(`      🏠 Found ${data.properties.length} properties in array`);
                } else if (Array.isArray(data)) {
                  console.log(`      🏠 Found array with ${data.length} items`);
                }
              } catch (e) {
                console.log(`      ❌ Could not parse JSON: ${e.message}`);
              }
            }
          }
        }

        // Look for any JSON-like structures with property data
        const propertyKeywords = ['rentPrice', 'leaseFee', 'areaPrivate', 'numRooms', 'apartamento'];
        const hasPropertyData = propertyKeywords.some(keyword => scriptContent.includes(keyword));
        
        if (hasPropertyData) {
          console.log(`   🎯 Script contains property keywords: ${propertyKeywords.filter(k => scriptContent.includes(k)).join(', ')}`);
        }
      }
    }

    if (!foundData) {
      console.log('\n❌ No JSON property data found in any script tags');
      
      // Try to extract from HTML as fallback
      console.log('\n🔄 Trying HTML extraction as fallback...');
      const articles = $('article');
      console.log(`📄 Found ${articles.length} article elements`);
      
      if (articles.length > 0) {
        articles.slice(0, 3).each((i, el) => {
          const $el = $(el);
          const text = $el.text().trim();
          console.log(`\n📋 Article ${i + 1}:`);
          console.log(`   Text length: ${text.length} chars`);
          console.log(`   Contains price: ${text.includes('$')}`);
          console.log(`   Contains m²: ${text.includes('m²') || text.includes('m2')}`);
          console.log(`   Sample: ${text.substring(0, 100)}...`);
        });
      }
    } else {
      console.log('\n✅ JSON data extraction analysis complete!');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the test
testCiencuadrasJsonExtraction().catch(console.error);
