#!/usr/bin/env tsx

/**
 * Debug script to understand the location extraction issue in Ciencuadras
 */

import axios from 'axios';
import * as cheerio from 'cheerio';

async function debugCiencuadrasLocation() {
  console.log('🔍 Debugging Ciencuadras location extraction...\n');

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

    const articles = $('article');
    console.log(`📄 Found ${articles.length} article elements\n`);

    // Debug first 3 articles
    articles.slice(0, 3).each((index, card) => {
      const $card = $(card);
      const fullText = $card.text().trim();
      
      console.log(`🏠 Article ${index + 1}:`);
      console.log(`   Full text: ${fullText.substring(0, 200)}...`);
      
      // Test location patterns
      const locationPatterns = [
        { name: 'Pattern 1', regex: /bogotá,\s*([^,\n]+(?:,\s*[^,\n]+)?)/i },
        { name: 'Pattern 2', regex: /([a-záéíóúñ\s]+),\s*bogotá/i },
        { name: 'Pattern 3', regex: /apartamento en arriendo\s*bogotá,\s*([^,\n]+)/i }
      ];

      let location = '';
      
      for (const pattern of locationPatterns) {
        const match = fullText.match(pattern.regex);
        if (match) {
          console.log(`   ✅ ${pattern.name} matched: "${match[1]}"`);
          const neighborhood = match[1].trim();
          location = `${neighborhood}, Bogotá`;
          console.log(`   📍 Final location: "${location}"`);
          console.log(`   📍 Location type: ${typeof location}`);
          break;
        } else {
          console.log(`   ❌ ${pattern.name} no match`);
        }
      }

      if (!location) {
        location = 'Bogotá';
        console.log(`   📍 Default location: "${location}"`);
      }

      // Test the exact same logic as in the scraper
      if (typeof location !== 'string' || !location) {
        location = 'Bogotá';
        console.log(`   🔧 Fixed location: "${location}"`);
      }

      console.log(`   🎯 Final result: "${location}" (type: ${typeof location})\n`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the debug
debugCiencuadrasLocation().catch(console.error);
