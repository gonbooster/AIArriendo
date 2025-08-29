import { MetrocuadradoScraper } from '../core/scraping/scrapers/MetrocuadradoScraper';
import { SearchCriteria, ScrapingSource, RateLimit } from '../core/types';
import { RateLimiter } from '../core/scraping/RateLimiter';
import axios from 'axios';
import * as cheerio from 'cheerio';

async function debugMetrocuadrado() {
  console.log('🔍 DEBUGGING METROCUADRADO SCRAPER\n');
  console.log('=' .repeat(60));

  // Crear source y rate limiter para el scraper
  const source: ScrapingSource = {
    id: 'metrocuadrado',
    name: 'Metrocuadrado',
    baseUrl: 'https://www.metrocuadrado.com',
    isActive: true,
    priority: 1,
    rateLimit: {
      requestsPerMinute: 25,
      delayBetweenRequests: 2500,
      maxConcurrentRequests: 2
    },
    selectors: {
      propertyCard: '.property-card',
      title: '.title',
      price: '.price',
      area: '.area',
      rooms: '.rooms',
      location: '.location',
      link: '.link'
    }
  };

  const rateLimiter = new RateLimiter(source.rateLimit);
  const scraper = new MetrocuadradoScraper(source, rateLimiter);
  
  // Criterios básicos para obtener propiedades
  const basicCriteria: SearchCriteria = {
    hardRequirements: {
      minRooms: 1,
      minArea: 30,
      maxTotalPrice: 10000000,
      allowAdminOverage: false,
      operation: 'arriendo',
      propertyTypes: ['Apartamento'],
      location: {
        city: 'Bogotá'
      }
    },
    preferences: {
      wetAreas: [],
      sports: [],
      amenities: [],
      weights: {
        wetAreas: 1,
        sports: 1,
        amenities: 1,
        location: 1,
        pricePerM2: 1
      }
    }
  };

  try {
    console.log('🚀 PASO 1: Probando conectividad básica a Metrocuadrado...\n');
    
    const testUrls = [
      'https://www.metrocuadrado.com',
      'https://www.metrocuadrado.com/apartamentos/arriendo/bogota/',
      'https://www.metrocuadrado.com/apartamentos/arriendo/bogota/?orden=relevancia'
    ];

    for (const url of testUrls) {
      try {
        console.log(`🧪 Probando: ${url}`);
        const response = await axios.head(url, { 
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          }
        });
        console.log(`   ✅ Status: ${response.status} - Conectividad OK`);
      } catch (error: any) {
        console.log(`   ❌ Status: ${error.response?.status || 'Error'} - ${error.message}`);
      }
    }

    console.log('\n🚀 PASO 2: Analizando contenido HTML de la página principal...\n');
    
    const mainUrl = 'https://www.metrocuadrado.com/apartamentos/arriendo/bogota/?orden=relevancia';
    
    try {
      const response = await axios.get(mainUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'es-CO,es;q=0.9,en;q=0.8',
          'Referer': 'https://www.metrocuadrado.com/',
          'Connection': 'keep-alive'
        },
        timeout: 30000
      });

      console.log(`📄 Respuesta recibida: ${response.status}`);
      console.log(`📊 Tamaño del contenido: ${response.data.length} caracteres`);

      const $ = cheerio.load(response.data);
      
      // Analizar estructura de la página
      console.log('\n🔍 ANÁLISIS DE ESTRUCTURA HTML:');
      
      const selectors = [
        '.resultado-busqueda .inmueble',
        '.listing-card',
        '.result-item',
        '[class*="resultado"]',
        '[class*="listing"]',
        'article',
        'li',
        '[class*="card"]',
        '[data-testid*="card"]',
        '.property-card',
        '.property-item'
      ];

      let totalElements = 0;
      selectors.forEach(selector => {
        const elements = $(selector);
        console.log(`   ${selector}: ${elements.length} elementos`);
        totalElements += elements.length;
      });

      console.log(`\n📊 Total elementos encontrados: ${totalElements}`);

      // Buscar patrones de precios en el HTML
      console.log('\n💰 BÚSQUEDA DE PATRONES DE PRECIOS:');
      const pricePatterns = [
        /\$\s*[\d,\.]+/g,
        /[\d,\.]+\s*pesos/gi,
        /precio[:\s]*\$?[\d,\.]+/gi
      ];

      let totalPrices = 0;
      pricePatterns.forEach((pattern, index) => {
        const matches = response.data.match(pattern);
        const count = matches ? matches.length : 0;
        console.log(`   Patrón ${index + 1}: ${count} coincidencias`);
        if (matches && matches.length > 0) {
          console.log(`      Ejemplos: ${matches.slice(0, 3).join(', ')}`);
        }
        totalPrices += count;
      });

      console.log(`\n📊 Total patrones de precios: ${totalPrices}`);

      // Analizar si la página usa JavaScript para cargar contenido
      console.log('\n🔍 ANÁLISIS DE JAVASCRIPT:');
      const scripts = $('script');
      console.log(`   📜 Total scripts: ${scripts.length}`);
      
      let hasReactOrVue = false;
      let hasAjaxCalls = false;
      
      scripts.each((i, script) => {
        const content = $(script).html() || '';
        if (content.includes('React') || content.includes('Vue') || content.includes('Angular')) {
          hasReactOrVue = true;
        }
        if (content.includes('ajax') || content.includes('fetch') || content.includes('XMLHttpRequest')) {
          hasAjaxCalls = true;
        }
      });

      console.log(`   ⚛️  Usa frameworks JS: ${hasReactOrVue ? 'SÍ' : 'NO'}`);
      console.log(`   🌐 Hace llamadas AJAX: ${hasAjaxCalls ? 'SÍ' : 'NO'}`);

      // Buscar indicadores de contenido dinámico
      const bodyText = $('body').text();
      const hasLoadingIndicators = bodyText.includes('Cargando') || bodyText.includes('Loading') || 
                                   bodyText.includes('Buscando') || bodyText.includes('Searching');
      
      console.log(`   ⏳ Indicadores de carga: ${hasLoadingIndicators ? 'SÍ' : 'NO'}`);

      if (totalElements === 0 && totalPrices === 0) {
        console.log('\n❌ PROBLEMA IDENTIFICADO: La página no contiene propiedades en HTML estático');
        console.log('💡 Posibles causas:');
        console.log('   - Contenido cargado dinámicamente con JavaScript');
        console.log('   - Protección anti-bot');
        console.log('   - Cambio en la estructura del sitio');
        console.log('   - Requiere autenticación o cookies específicas');
      }

    } catch (error: any) {
      console.log(`❌ Error obteniendo contenido: ${error.message}`);
    }

    console.log('\n🚀 PASO 3: Probando el scraper real...\n');
    
    const properties = await scraper.scrape(basicCriteria);
    
    console.log(`📊 PROPIEDADES ENCONTRADAS: ${properties.length}\n`);

    if (properties.length === 0) {
      console.log('❌ El scraper no encontró propiedades');
      console.log('💡 Recomendaciones:');
      console.log('   1. Verificar si el sitio cambió su estructura');
      console.log('   2. Implementar scraping con Puppeteer para contenido dinámico');
      console.log('   3. Actualizar selectores CSS');
      console.log('   4. Verificar si hay protección anti-bot');
    } else {
      properties.forEach((property, index) => {
        console.log(`🏠 PROPIEDAD ${index + 1}:`);
        console.log(`   📝 Título: ${property.title}`);
        console.log(`   💰 Precio: $${property.price?.toLocaleString()}`);
        console.log(`   📐 Área: ${property.area} m²`);
        console.log(`   🛏️  Habitaciones: ${property.rooms}`);
        console.log(`   🚿 Baños: ${property.bathrooms}`);
        console.log(`   📍 Ubicación: ${property.location.address}`);
        console.log(`   🖼️  Imágenes: ${property.images?.length || 0}`);
        console.log(`   🔗 URL: ${property.url}`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('❌ Error durante el debug:', error);
  }
}

// Ejecutar debug
debugMetrocuadrado().catch(console.error);
