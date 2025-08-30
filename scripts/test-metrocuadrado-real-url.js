#!/usr/bin/env node

/**
 * PROBAR METROCUADRADO CON URL REAL
 */

const axios = require('axios');
const cheerio = require('cheerio');

async function testMetrocuadradoRealUrl() {
  console.log('🔍 PROBANDO METROCUADRADO CON URL REAL');
  console.log('═'.repeat(50));

  // URLs reales basadas en las que proporcionaste
  const urls = [
    'https://www.metrocuadrado.com/inmuebles/arriendo/apartamento/?search=form',
    'https://www.metrocuadrado.com/inmuebles/arriendo/apartamento/bogota/?search=form',
    'https://www.metrocuadrado.com/inmuebles/arriendo/apartamento/chapinero/?search=form',
    'https://www.metrocuadrado.com/inmuebles/arriendo/nuevo/?search=form'
  ];

  for (const url of urls) {
    console.log(`\n🌐 Probando: ${url}`);
    
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
      
      // Buscar selectores específicos de Metrocuadrado
      const selectors = [
        // Selectores basados en la estructura real
        '.card-property',
        '.property-card',
        '.listing-card',
        '.inmueble-card',
        '[data-testid="property-card"]',
        '.search-result',
        '.property-item',
        '.listing-item',
        '[class*="card"]',
        '[class*="property"]',
        '[class*="listing"]',
        '[class*="inmueble"]',
        'article',
        '.item'
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
        const cardHtml = firstCard.html();
        const cardText = firstCard.text();
        
        console.log(`   📋 Primer elemento:`);
        console.log(`      HTML: ${cardHtml?.substring(0, 200)}...`);
        console.log(`      Texto: ${cardText?.substring(0, 100)}...`);
        
        // Buscar precios específicamente
        const priceSelectors = [
          '.price', '.precio', '[class*="price"]', '[class*="precio"]',
          '.value', '.amount', '[class*="value"]', '[class*="amount"]',
          '.cost', '[class*="cost"]'
        ];
        
        for (const priceSelector of priceSelectors) {
          const priceEl = firstCard.find(priceSelector);
          if (priceEl.length > 0) {
            console.log(`   💰 Precio (${priceSelector}): ${priceEl.text()}`);
          }
        }
        
        // Buscar títulos
        const titleSelectors = ['h1', 'h2', 'h3', '.title', '[class*="title"]'];
        for (const titleSelector of titleSelectors) {
          const titleEl = firstCard.find(titleSelector);
          if (titleEl.length > 0) {
            console.log(`   📝 Título (${titleSelector}): ${titleEl.text()}`);
          }
        }
        
      } else {
        console.log(`   ❌ No se encontraron elementos con ningún selector`);
        
        // Verificar si es contenido dinámico
        const bodyText = $('body').text();
        if (bodyText.includes('loading') || bodyText.includes('cargando') || 
            response.data.includes('animate-pulse') || response.data.includes('skeleton')) {
          console.log(`   ⚠️  CONTENIDO DINÁMICO DETECTADO - Necesita headless browser`);
        }
        
        // Buscar scripts que puedan cargar contenido
        const scripts = $('script[src]');
        console.log(`   📜 Scripts externos: ${scripts.length}`);
        
        // Buscar patrones en el HTML
        const patterns = [
          /class="[^"]*card[^"]*"/gi,
          /class="[^"]*property[^"]*"/gi,
          /class="[^"]*listing[^"]*"/gi,
          /data-testid="[^"]*"/gi
        ];

        console.log(`   🔍 Patrones encontrados:`);
        patterns.forEach((pattern, i) => {
          const matches = response.data.match(pattern);
          if (matches && matches.length > 0) {
            console.log(`      Patrón ${i+1}: ${matches.slice(0, 2).join(', ')}${matches.length > 2 ? '...' : ''}`);
          }
        });
      }

    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      if (error.response) {
        console.log(`      Status: ${error.response.status}`);
      }
    }
  }

  console.log('\n🔧 RECOMENDACIONES:');
  console.log('1. Si encontramos elementos: actualizar selectores en el scraper');
  console.log('2. Si no encontramos elementos: usar headless browser obligatorio');
  console.log('3. Verificar que la URL con search=form funcione');
  console.log('4. Probar con diferentes ubicaciones');
}

testMetrocuadradoRealUrl();
