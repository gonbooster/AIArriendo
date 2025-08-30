#!/usr/bin/env ts-node

/**
 * Debug script to analyze PADS and RENTOLA HTML structure
 */

import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

async function debugPads() {
  console.log('🔍 DEBUGGING PADS...');
  
  const urls = [
    'https://pads.com.co',
    'https://pads.com.co/inmuebles-en-arriendo/bogota/suba',
    'https://pads.com.co/propiedades/26313'
  ];
  
  for (const url of urls) {
    try {
      console.log(`\n📡 Fetching: ${url}`);
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'es-ES,es;q=0.8,en-US;q=0.5,en;q=0.3',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        },
        timeout: 30000,
        maxRedirects: 10
      });
      
      console.log(`✅ Status: ${response.status}`);
      console.log(`📄 Content-Type: ${response.headers['content-type']}`);
      console.log(`📏 Content Length: ${response.data.length} chars`);
      
      // Save HTML for analysis
      const filename = url.replace(/[^a-zA-Z0-9]/g, '_') + '.html';
      const filepath = path.join('debug', filename);
      
      // Create debug directory if it doesn't exist
      if (!fs.existsSync('debug')) {
        fs.mkdirSync('debug');
      }
      
      fs.writeFileSync(filepath, response.data);
      console.log(`💾 HTML saved to: ${filepath}`);
      
      // Analyze content
      const content = response.data.toLowerCase();
      console.log(`🔍 Analysis:`);
      console.log(`   - Contains 'propiedad': ${content.includes('propiedad')}`);
      console.log(`   - Contains 'inmueble': ${content.includes('inmueble')}`);
      console.log(`   - Contains 'apartamento': ${content.includes('apartamento')}`);
      console.log(`   - Contains 'arriendo': ${content.includes('arriendo')}`);
      console.log(`   - Contains 'precio': ${content.includes('precio')}`);
      console.log(`   - Contains 'suba': ${content.includes('suba')}`);
      
      // Look for common selectors
      const selectors = [
        'property-card', 'listing-card', 'inmueble-card', 'propiedad-item',
        'search-result', 'property-item', 'listing-item', 'card'
      ];
      
      console.log(`🎯 Potential selectors found:`);
      selectors.forEach(selector => {
        const found = content.includes(selector) || content.includes(selector.replace('-', '_'));
        if (found) console.log(`   ✅ ${selector}`);
      });
      
    } catch (error: any) {
      console.log(`❌ Error fetching ${url}:`);
      console.log(`   Status: ${error.response?.status || 'N/A'}`);
      console.log(`   Message: ${error.message}`);
      console.log(`   Code: ${error.code || 'N/A'}`);
    }
  }
}

async function debugRentola() {
  console.log('\n\n🔍 DEBUGGING RENTOLA...');
  
  const urls = [
    'https://rentola.com/for-rent',
    'https://rentola.com/for-rent/co/bogota-localidad-suba',
    'https://rentola.com/for-rent/co/bogota'
  ];
  
  for (const url of urls) {
    try {
      console.log(`\n📡 Fetching: ${url}`);
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9,es;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        },
        timeout: 30000,
        maxRedirects: 10
      });
      
      console.log(`✅ Status: ${response.status}`);
      console.log(`📄 Content-Type: ${response.headers['content-type']}`);
      console.log(`📏 Content Length: ${response.data.length} chars`);
      
      // Save HTML for analysis
      const filename = url.replace(/[^a-zA-Z0-9]/g, '_') + '.html';
      const filepath = path.join('debug', filename);
      
      // Create debug directory if it doesn't exist
      if (!fs.existsSync('debug')) {
        fs.mkdirSync('debug');
      }
      
      fs.writeFileSync(filepath, response.data);
      console.log(`💾 HTML saved to: ${filepath}`);
      
      // Analyze content
      const content = response.data.toLowerCase();
      console.log(`🔍 Analysis:`);
      console.log(`   - Contains 'listing': ${content.includes('listing')}`);
      console.log(`   - Contains 'property': ${content.includes('property')}`);
      console.log(`   - Contains 'apartment': ${content.includes('apartment')}`);
      console.log(`   - Contains 'rent': ${content.includes('rent')}`);
      console.log(`   - Contains 'price': ${content.includes('price')}`);
      console.log(`   - Contains 'bogota': ${content.includes('bogota')}`);
      console.log(`   - Contains 'suba': ${content.includes('suba')}`);
      
      // Look for common selectors
      const selectors = [
        'listing-card', 'property-card', 'rental-listing', 'search-result',
        'listing-item', 'property-item', 'card', 'listing'
      ];
      
      console.log(`🎯 Potential selectors found:`);
      selectors.forEach(selector => {
        const found = content.includes(selector) || content.includes(selector.replace('-', '_'));
        if (found) console.log(`   ✅ ${selector}`);
      });
      
    } catch (error: any) {
      console.log(`❌ Error fetching ${url}:`);
      console.log(`   Status: ${error.response?.status || 'N/A'}`);
      console.log(`   Message: ${error.message}`);
      console.log(`   Code: ${error.code || 'N/A'}`);
    }
  }
}

async function main() {
  console.log('🚀 STARTING DEEP ANALYSIS OF PADS AND RENTOLA');
  console.log('='.repeat(80));
  
  await debugPads();
  await debugRentola();
  
  console.log('\n✅ ANALYSIS COMPLETE');
  console.log('Check the debug/ folder for saved HTML files');
}

if (require.main === module) {
  main().catch(console.error);
}

export { debugPads, debugRentola };
