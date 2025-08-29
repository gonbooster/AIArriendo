#!/usr/bin/env tsx

/**
 * Debug potente para analizar URLs de Ciencuadras y conseguir las correctas
 */

import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import axios from 'axios';

async function debugCiencuadrasUrls() {
  console.log('🔍 ANÁLISIS POTENTE DE URLS CIENCUADRAS\n');

  try {
    // 1. Primero vamos a la página principal y analizamos la estructura
    const searchUrl = 'https://www.ciencuadras.com/arriendo/apartamento/bogota/usaquen';
    console.log(`📍 Analizando página: ${searchUrl}\n`);

    // Método 1: Análisis con Puppeteer (más potente)
    console.log('🚀 MÉTODO 1: Análisis con Puppeteer (JavaScript renderizado)\n');
    
    const browser = await puppeteer.launch({ 
      headless: false, // Para ver qué pasa
      args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    const page = await browser.newPage();
    
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    console.log('📄 Navegando a la página...');
    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Esperar a que carguen las propiedades
    console.log('⏳ Esperando a que carguen las propiedades...');
    await page.waitForSelector('article', { timeout: 10000 });
    
    // Extraer información detallada de las primeras 5 propiedades
    console.log('🔍 Extrayendo información detallada...\n');
    
    const propertyData = await page.evaluate(() => {
      const articles = document.querySelectorAll('article');
      const results: any[] = [];
      
      for (let i = 0; i < Math.min(5, articles.length); i++) {
        const article = articles[i];
        
        // Extraer todos los enlaces posibles
        const allLinks = Array.from(article.querySelectorAll('a')).map(a => ({
          href: a.getAttribute('href'),
          text: a.textContent?.trim(),
          innerHTML: a.innerHTML
        }));
        
        // Extraer todos los atributos data-*
        const dataAttributes: any = {};
        for (const attr of article.attributes) {
          if (attr.name.startsWith('data-')) {
            dataAttributes[attr.name] = attr.value;
          }
        }
        
        // Extraer información del precio y características
        const priceText = article.textContent?.match(/\$[\d.,]+/)?.[0] || '';
        const areaText = article.textContent?.match(/(\d+\.?\d*)\s*m2/i)?.[1] || '';
        const roomsText = article.textContent?.match(/Habit\.\s*(\d+)/i)?.[1] || '';
        
        // Buscar IDs únicos en el HTML
        const htmlContent = article.outerHTML;
        const idMatches = htmlContent.match(/id="([^"]+)"/g) || [];
        const classMatches = htmlContent.match(/class="([^"]+)"/g) || [];
        
        results.push({
          index: i,
          price: priceText,
          area: areaText,
          rooms: roomsText,
          allLinks,
          dataAttributes,
          idMatches,
          classMatches: classMatches.slice(0, 3), // Solo las primeras 3 clases
          outerHTML: htmlContent.substring(0, 500) // Primeros 500 caracteres
        });
      }
      
      return results;
    });
    
    // Analizar los resultados
    propertyData.forEach((prop, index) => {
      console.log(`🏠 PROPIEDAD ${index + 1}:`);
      console.log(`   💰 Precio: ${prop.price}`);
      console.log(`   📐 Área: ${prop.area}m²`);
      console.log(`   🏠 Habitaciones: ${prop.rooms}`);
      console.log(`   🔗 Enlaces encontrados: ${prop.allLinks.length}`);
      
      prop.allLinks.forEach((link: any, linkIndex: number) => {
        if (link.href) {
          console.log(`      Link ${linkIndex + 1}: ${link.href}`);
          console.log(`         Texto: "${link.text}"`);
        }
      });
      
      console.log(`   📊 Data attributes:`, Object.keys(prop.dataAttributes));
      Object.entries(prop.dataAttributes).forEach(([key, value]) => {
        console.log(`      ${key}: ${value}`);
      });
      
      console.log(`   🆔 IDs encontrados: ${prop.idMatches.join(', ')}`);
      console.log(`   📝 HTML snippet: ${prop.outerHTML.substring(0, 200)}...`);
      console.log('');
    });
    
    await browser.close();
    
    // Método 2: Análisis con Axios + Cheerio (HTML estático)
    console.log('\n🚀 MÉTODO 2: Análisis con Axios + Cheerio (HTML estático)\n');
    
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    
    console.log('📄 Analizando HTML estático...');
    
    $('article').each((index, element) => {
      if (index >= 3) return; // Solo las primeras 3
      
      const $article = $(element);
      console.log(`\n🏠 PROPIEDAD ${index + 1} (HTML estático):`);
      
      // Buscar todos los enlaces
      const links: string[] = [];
      $article.find('a').each((_, linkEl) => {
        const href = $(linkEl).attr('href');
        if (href) {
          links.push(href);
          console.log(`   🔗 Link: ${href}`);
        }
      });
      
      // Buscar atributos data-*
      const dataAttrs: any = {};
      Object.keys(element.attribs || {}).forEach(attr => {
        if (attr.startsWith('data-')) {
          dataAttrs[attr] = element.attribs[attr];
        }
      });
      
      console.log(`   📊 Data attributes:`, dataAttrs);
      
      // Buscar patrones en el HTML
      const html = $article.html() || '';
      const urlPatterns = html.match(/https?:\/\/[^\s"'<>]+/g) || [];
      console.log(`   🌐 URLs en HTML: ${urlPatterns.join(', ')}`);
      
      // Buscar IDs de propiedades
      const idPatterns = html.match(/\b\d{7,}\b/g) || [];
      console.log(`   🆔 Posibles IDs: ${idPatterns.join(', ')}`);
    });
    
    // Método 3: Probar diferentes patrones de URL
    console.log('\n🚀 MÉTODO 3: Probando patrones de URL conocidos\n');
    
    const testUrls = [
      'https://www.ciencuadras.com/inmueble/3176000-88-3-3',
      'https://www.ciencuadras.com/property/3176000-88-3-3',
      'https://www.ciencuadras.com/detalle/3176000-88-3-3',
      'https://www.ciencuadras.com/apartamento/3176000-88-3-3',
      'https://www.ciencuadras.com/arriendo/3176000-88-3-3'
    ];
    
    for (const testUrl of testUrls) {
      try {
        console.log(`🧪 Probando: ${testUrl}`);
        const testResponse = await axios.head(testUrl, { timeout: 5000 });
        console.log(`   ✅ Status: ${testResponse.status} - ¡FUNCIONA!`);
      } catch (error: any) {
        console.log(`   ❌ Status: ${error.response?.status || 'Error'} - No funciona`);
      }
    }

  } catch (error) {
    console.error('❌ Error en el análisis:', error);
  }
}

// Ejecutar el análisis
debugCiencuadrasUrls().catch(console.error);
