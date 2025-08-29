#!/usr/bin/env tsx

/**
 * Debug específico para imágenes de MercadoLibre
 */

import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import axios from 'axios';

async function debugMercadoLibreImages() {
  console.log('🔍 DEBUG ESPECÍFICO IMÁGENES MERCADOLIBRE\n');

  try {
    const searchUrl = 'https://inmuebles.mercadolibre.com.co/apartamentos/arriendo/bogota/usaquen';
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
    await page.waitForSelector('.ui-search-result__wrapper', { timeout: 10000 });
    
    // Extraer información detallada de las primeras 5 propiedades
    console.log('🔍 Extrayendo información detallada...\n');
    
    const propertyData = await page.evaluate(() => {
      const cards = document.querySelectorAll('.ui-search-result__wrapper');
      const results: any[] = [];
      
      for (let i = 0; i < Math.min(5, cards.length); i++) {
        const card = cards[i];
        
        // Extraer título
        const titleEl = card.querySelector('h2, .ui-search-item__title');
        const title = titleEl?.textContent?.trim() || '';
        
        // Extraer precio
        const priceEl = card.querySelector('.andes-money-amount__fraction, .ui-search-price__part, .price-tag-amount');
        const price = priceEl?.textContent?.trim() || '';
        
        // Extraer TODAS las imágenes posibles
        const allImages: any[] = [];
        const imgElements = card.querySelectorAll('img');
        
        imgElements.forEach((img, imgIndex) => {
          allImages.push({
            index: imgIndex,
            src: img.getAttribute('src'),
            dataSrc: img.getAttribute('data-src'),
            dataLazy: img.getAttribute('data-lazy'),
            dataOriginal: img.getAttribute('data-original'),
            srcset: img.getAttribute('srcset'),
            alt: img.getAttribute('alt'),
            className: img.className,
            outerHTML: img.outerHTML.substring(0, 200)
          });
        });
        
        // Extraer URL de la propiedad
        const linkEl = card.querySelector('a.ui-search-link, a');
        const url = linkEl?.getAttribute('href') || '';
        
        // Extraer ubicación
        const locationEl = card.querySelector('.ui-search-item__location, [class*="location"]');
        const location = locationEl?.textContent?.trim() || '';
        
        results.push({
          index: i,
          title,
          price,
          url,
          location,
          allImages,
          totalImages: allImages.length,
          cardHTML: card.outerHTML.substring(0, 500) // Primeros 500 caracteres
        });
      }
      
      return results;
    });
    
    // Analizar los resultados
    propertyData.forEach((prop, index) => {
      console.log(`🛒 PROPIEDAD ${index + 1}:`);
      console.log(`   📝 Título: ${prop.title}`);
      console.log(`   💰 Precio: ${prop.price}`);
      console.log(`   📍 Ubicación: ${prop.location}`);
      console.log(`   🔗 URL: ${prop.url}`);
      console.log(`   🖼️  Total imágenes encontradas: ${prop.totalImages}`);
      
      if (prop.allImages.length === 0) {
        console.log(`   ❌ NO SE ENCONTRARON IMÁGENES`);
      } else {
        prop.allImages.forEach((img: any, imgIndex: number) => {
          console.log(`\n   📷 IMAGEN ${imgIndex + 1}:`);
          console.log(`      src: ${img.src || 'N/A'}`);
          console.log(`      data-src: ${img.dataSrc || 'N/A'}`);
          console.log(`      data-lazy: ${img.dataLazy || 'N/A'}`);
          console.log(`      data-original: ${img.dataOriginal || 'N/A'}`);
          console.log(`      srcset: ${img.srcset || 'N/A'}`);
          console.log(`      alt: ${img.alt || 'N/A'}`);
          console.log(`      className: ${img.className || 'N/A'}`);
          
          // Determinar cuál es la mejor URL
          const bestUrl = img.src || img.dataSrc || img.dataLazy || img.dataOriginal || '';
          if (bestUrl) {
            console.log(`      ✅ MEJOR URL: ${bestUrl}`);
            console.log(`      🌐 Es válida: ${bestUrl.startsWith('http')}`);
            console.log(`      🎯 Es MercadoLibre: ${bestUrl.includes('mlstatic') || bestUrl.includes('mercadolibre')}`);
          } else {
            console.log(`      ❌ NO HAY URL VÁLIDA`);
          }
        });
      }
      
      console.log(`\n   📝 HTML snippet: ${prop.cardHTML}...`);
      console.log('\n' + '='.repeat(80) + '\n');
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
    
    $('.ui-search-result__wrapper').each((index, element) => {
      if (index >= 3) return; // Solo las primeras 3
      
      const $card = $(element);
      console.log(`\n🛒 PROPIEDAD ${index + 1} (HTML estático):`);
      
      // Buscar todas las imágenes
      const images: string[] = [];
      $card.find('img').each((_, imgEl) => {
        const $img = $(imgEl);
        const src = $img.attr('src');
        const dataSrc = $img.attr('data-src');
        const dataLazy = $img.attr('data-lazy');
        
        console.log(`   📷 Imagen encontrada:`);
        console.log(`      src: ${src || 'N/A'}`);
        console.log(`      data-src: ${dataSrc || 'N/A'}`);
        console.log(`      data-lazy: ${dataLazy || 'N/A'}`);
        
        if (src) images.push(src);
        if (dataSrc) images.push(dataSrc);
        if (dataLazy) images.push(dataLazy);
      });
      
      console.log(`   📊 Total URLs de imagen: ${images.length}`);
      images.forEach((img, i) => {
        console.log(`      ${i + 1}. ${img}`);
      });
    });

  } catch (error) {
    console.error('❌ Error en el análisis:', error);
  }
}

// Ejecutar el análisis
debugMercadoLibreImages().catch(console.error);
