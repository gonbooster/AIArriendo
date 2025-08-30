#!/usr/bin/env node

/**
 * DIAGNOSTICAR METROCUADRADO ESPECÍFICAMENTE
 */

const axios = require('axios');
const cheerio = require('cheerio');

async function debugMetrocuadrado() {
  console.log('🔍 DIAGNOSTICANDO METROCUADRADO');
  console.log('═'.repeat(50));

  // URLs a probar
  const urls = [
    'https://www.metrocuadrado.com/apartamentos/arriendo/bogota/',
    'https://www.metrocuadrado.com/buscar?operacion=arriendo&tipo_inmueble=apartamento&ciudad=bogota',
    'https://www.metrocuadrado.com/inmuebles?tipo=arriendo&inmueble=apartamento&ubicacion=bogota',
    'https://www.metrocuadrado.com/arriendo/apartamento/bogota'
  ];

  for (const url of urls) {
    console.log(`\n🌐 Probando URL: ${url}`);
    
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'es-CO,es-419;q=0.9,es;q=0.8,en;q=0.7',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1',
          'Cache-Control': 'max-age=0'
        },
        timeout: 30000
      });

      console.log(`   ✅ Status: ${response.status}`);
      console.log(`   📄 Content-Length: ${response.data.length}`);

      const $ = cheerio.load(response.data);
      
      // Buscar selectores comunes
      const selectors = [
        '[data-testid="property-card"]',
        '.property-card',
        '.listing-card',
        '.search-result-item',
        '.inmueble-card',
        '.resultado-busqueda .inmueble',
        '.result-item',
        '[class*="resultado"]',
        '[class*="listing"]',
        '[class*="property"]',
        '[class*="inmueble"]',
        'article[class*="card"]',
        'div[class*="card"]',
        'li[class*="item"]',
        '[data-testid*="card"]',
        '[data-testid*="property"]'
      ];

      let foundCards = 0;
      let bestSelector = '';

      for (const selector of selectors) {
        const cards = $(selector);
        if (cards.length > 0) {
          console.log(`   🎯 ${selector}: ${cards.length} elementos`);
          if (cards.length > foundCards) {
            foundCards = cards.length;
            bestSelector = selector;
          }
        }
      }

      if (foundCards > 0) {
        console.log(`   🏆 MEJOR SELECTOR: ${bestSelector} (${foundCards} elementos)`);
        
        // Analizar el primer elemento
        const firstCard = $(bestSelector).first();
        console.log(`   📋 Contenido del primer elemento:`);
        console.log(`      HTML: ${firstCard.html()?.substring(0, 200)}...`);
        console.log(`      Texto: ${firstCard.text()?.substring(0, 100)}...`);
        
        // Buscar precios
        const priceSelectors = ['.price', '.precio', '[class*="price"]', '[class*="precio"]'];
        for (const priceSelector of priceSelectors) {
          const priceEl = firstCard.find(priceSelector);
          if (priceEl.length > 0) {
            console.log(`   💰 Precio encontrado (${priceSelector}): ${priceEl.text()}`);
          }
        }
      } else {
        console.log(`   ❌ No se encontraron elementos con ningún selector`);
        
        // Buscar patrones en el HTML
        const html = response.data;
        const patterns = [
          /class="[^"]*card[^"]*"/gi,
          /class="[^"]*property[^"]*"/gi,
          /class="[^"]*listing[^"]*"/gi,
          /class="[^"]*inmueble[^"]*"/gi,
          /data-testid="[^"]*"/gi
        ];

        console.log(`   🔍 Buscando patrones en HTML:`);
        patterns.forEach((pattern, i) => {
          const matches = html.match(pattern);
          if (matches && matches.length > 0) {
            console.log(`      Patrón ${i+1}: ${matches.slice(0, 3).join(', ')}${matches.length > 3 ? '...' : ''}`);
          }
        });
      }

    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      if (error.response) {
        console.log(`      Status: ${error.response.status}`);
        console.log(`      Headers: ${JSON.stringify(error.response.headers, null, 2)}`);
      }
    }
  }

  console.log('\n🔧 RECOMENDACIONES:');
  console.log('1. Usar la URL que devuelva más elementos');
  console.log('2. Actualizar selectores en MetrocuadradoScraper.ts');
  console.log('3. Verificar que los precios se extraigan correctamente');
  console.log('4. Probar con headless browser si es necesario');
}

debugMetrocuadrado();
