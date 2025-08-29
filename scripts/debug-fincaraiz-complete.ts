#!/usr/bin/env tsx

/**
 * Debug completo de Fincaraiz - análisis potente para dejarlo perfecto
 */

import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import axios from 'axios';

async function debugFincaraizComplete() {
  console.log('🔍 DEBUG COMPLETO FINCARAIZ - ANÁLISIS POTENTE\n');

  try {
    // URLs exactas que me diste
    const searchUrl = 'https://www.fincaraiz.com.co/venta/apartamentos/usaquen/bogota';
    const samplePropertyUrl = 'https://www.fincaraiz.com.co/proyectos-vivienda/ciudad-la-salle-burdeos-apartamentos-en-venta-en-alameda-bogota/7203484';
    
    console.log(`📍 Analizando página de resultados: ${searchUrl}\n`);

    // Método 1: Análisis con Puppeteer (más potente)
    console.log('🚀 MÉTODO 1: Análisis con Puppeteer (JavaScript renderizado)\n');
    
    const browser = await puppeteer.launch({ 
      headless: false, // Para ver qué pasa
      args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    const page = await browser.newPage();
    
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    console.log('📄 Navegando a la página de resultados...');
    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Esperar a que carguen las propiedades
    console.log('⏳ Esperando a que carguen las propiedades...');
    
    // Intentar múltiples selectores
    const possibleSelectors = [
      '.MuiGrid-item',
      '.property-card',
      '.listing-item',
      '[data-testid*="property"]',
      '.card',
      'article',
      '.result-item'
    ];
    
    let foundSelector = '';
    for (const selector of possibleSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 5000 });
        foundSelector = selector;
        console.log(`✅ Encontrado selector: ${selector}`);
        break;
      } catch {
        console.log(`❌ No encontrado: ${selector}`);
      }
    }
    
    if (!foundSelector) {
      console.log('❌ No se encontraron propiedades con selectores conocidos');
      console.log('🔍 Analizando estructura de la página...');
      
      const pageStructure = await page.evaluate(() => {
        const body = document.body;
        const allElements = body.querySelectorAll('*');
        const elementCounts: any = {};
        
        allElements.forEach(el => {
          const tagName = el.tagName.toLowerCase();
          const className = el.className;
          const id = el.id;
          
          if (className && typeof className === 'string') {
            className.split(' ').forEach(cls => {
              if (cls.includes('property') || cls.includes('card') || cls.includes('item') || cls.includes('listing')) {
                elementCounts[`${tagName}.${cls}`] = (elementCounts[`${tagName}.${cls}`] || 0) + 1;
              }
            });
          }
          
          if (id && (id.includes('property') || id.includes('card') || id.includes('item'))) {
            elementCounts[`${tagName}#${id}`] = (elementCounts[`${tagName}#${id}`] || 0) + 1;
          }
        });
        
        return elementCounts;
      });
      
      console.log('📊 Elementos relacionados con propiedades encontrados:');
      Object.entries(pageStructure).forEach(([selector, count]) => {
        console.log(`   ${selector}: ${count} elementos`);
      });
    }
    
    // Extraer información detallada de las primeras 5 propiedades
    console.log('\n🔍 Extrayendo información detallada...\n');
    
    const propertyData = await page.evaluate((selector) => {
      const cards = document.querySelectorAll(selector || '.MuiGrid-item');
      const results: any[] = [];
      
      for (let i = 0; i < Math.min(5, cards.length); i++) {
        const card = cards[i];
        
        // Extraer título
        const titleSelectors = ['h2', 'h3', '.title', '[data-testid*="title"]', '.property-title'];
        let title = '';
        for (const sel of titleSelectors) {
          const titleEl = card.querySelector(sel);
          if (titleEl?.textContent?.trim()) {
            title = titleEl.textContent.trim();
            break;
          }
        }
        
        // Extraer precio
        const priceSelectors = ['.price', '[data-testid*="price"]', '.cost', '.valor'];
        let price = '';
        for (const sel of priceSelectors) {
          const priceEl = card.querySelector(sel);
          if (priceEl?.textContent?.trim()) {
            price = priceEl.textContent.trim();
            break;
          }
        }
        
        // Si no encontramos precio, buscar en todo el texto
        if (!price) {
          const text = card.textContent || '';
          const priceMatch = text.match(/\$[\d.,]+/);
          if (priceMatch) price = priceMatch[0];
        }
        
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
        
        // Extraer TODOS los enlaces posibles
        const allLinks: any[] = [];
        const linkElements = card.querySelectorAll('a');
        
        linkElements.forEach((link, linkIndex) => {
          const href = link.getAttribute('href');
          if (href) {
            allLinks.push({
              index: linkIndex,
              href,
              text: link.textContent?.trim(),
              className: link.className
            });
          }
        });
        
        // Extraer ubicación
        const locationSelectors = ['.location', '[data-testid*="location"]', '.address', '.zona'];
        let location = '';
        for (const sel of locationSelectors) {
          const locationEl = card.querySelector(sel);
          if (locationEl?.textContent?.trim()) {
            location = locationEl.textContent.trim();
            break;
          }
        }
        
        // Extraer características (habitaciones, baños, área)
        const text = card.textContent || '';
        const roomsMatch = text.match(/(\d+)\s*(?:hab|habitacion|alcoba|dormitorio)/i);
        const bathsMatch = text.match(/(\d+)\s*(?:baño|baños|bath)/i);
        const areaMatch = text.match(/(\d+(?:\.\d+)?)\s*m[²2]/i);
        
        results.push({
          index: i,
          title,
          price,
          location,
          rooms: roomsMatch ? roomsMatch[1] : '',
          baths: bathsMatch ? bathsMatch[1] : '',
          area: areaMatch ? areaMatch[1] : '',
          allImages,
          allLinks,
          totalImages: allImages.length,
          totalLinks: allLinks.length,
          cardHTML: card.outerHTML.substring(0, 500) // Primeros 500 caracteres
        });
      }
      
      return results;
    }, foundSelector);
    
    // Analizar los resultados
    propertyData.forEach((prop, index) => {
      console.log(`🏠 PROPIEDAD ${index + 1}:`);
      console.log(`   📝 Título: ${prop.title || 'NO ENCONTRADO'}`);
      console.log(`   💰 Precio: ${prop.price || 'NO ENCONTRADO'}`);
      console.log(`   📍 Ubicación: ${prop.location || 'NO ENCONTRADO'}`);
      console.log(`   🏠 Habitaciones: ${prop.rooms || 'NO ENCONTRADO'}`);
      console.log(`   🚿 Baños: ${prop.baths || 'NO ENCONTRADO'}`);
      console.log(`   📐 Área: ${prop.area || 'NO ENCONTRADO'}m²`);
      console.log(`   🖼️  Total imágenes: ${prop.totalImages}`);
      console.log(`   🔗 Total enlaces: ${prop.totalLinks}`);
      
      // Analizar imágenes
      if (prop.allImages.length === 0) {
        console.log(`   ❌ NO SE ENCONTRARON IMÁGENES`);
      } else {
        prop.allImages.forEach((img: any, imgIndex: number) => {
          console.log(`\n   📷 IMAGEN ${imgIndex + 1}:`);
          console.log(`      src: ${img.src || 'N/A'}`);
          console.log(`      data-src: ${img.dataSrc || 'N/A'}`);
          console.log(`      srcset: ${img.srcset || 'N/A'}`);
          console.log(`      alt: ${img.alt || 'N/A'}`);
          
          const bestUrl = img.src || img.dataSrc || '';
          if (bestUrl && bestUrl.startsWith('http')) {
            console.log(`      ✅ MEJOR URL: ${bestUrl}`);
            console.log(`      🎯 Es Fincaraiz: ${bestUrl.includes('fincaraiz') || bestUrl.includes('finca')}`);
          } else {
            console.log(`      ❌ NO HAY URL VÁLIDA`);
          }
        });
      }
      
      // Analizar enlaces
      if (prop.allLinks.length === 0) {
        console.log(`\n   ❌ NO SE ENCONTRARON ENLACES`);
      } else {
        prop.allLinks.forEach((link: any, linkIndex: number) => {
          console.log(`\n   🔗 ENLACE ${linkIndex + 1}:`);
          console.log(`      href: ${link.href}`);
          console.log(`      texto: ${link.text || 'N/A'}`);
          
          if (link.href.includes('/proyectos-vivienda/') || link.href.includes('/inmueble/')) {
            console.log(`      ✅ ENLACE DE PROPIEDAD VÁLIDO`);
          }
        });
      }
      
      console.log(`\n   📝 HTML snippet: ${prop.cardHTML}...`);
      console.log('\n' + '='.repeat(80) + '\n');
    });
    
    await browser.close();
    
    // Método 2: Análisis de una propiedad específica
    console.log('\n🚀 MÉTODO 2: Análisis de propiedad específica\n');
    console.log(`📍 Analizando: ${samplePropertyUrl}\n`);
    
    const browser2 = await puppeteer.launch({ 
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    const page2 = await browser2.newPage();
    
    await page2.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    console.log('📄 Navegando a la propiedad específica...');
    await page2.goto(samplePropertyUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    
    const propertyDetails = await page2.evaluate(() => {
      // Extraer todas las imágenes de la propiedad
      const images: any[] = [];
      const imgElements = document.querySelectorAll('img');
      
      imgElements.forEach((img, index) => {
        const src = img.getAttribute('src');
        const dataSrc = img.getAttribute('data-src');
        
        if (src && (src.includes('fincaraiz') || src.includes('http'))) {
          images.push({
            index,
            src,
            dataSrc,
            alt: img.getAttribute('alt'),
            className: img.className
          });
        }
      });
      
      // Extraer información de la propiedad
      const title = document.querySelector('h1')?.textContent?.trim() || '';
      const priceEl = document.querySelector('[data-testid*="price"], .price, .valor');
      const price = priceEl?.textContent?.trim() || '';
      
      return {
        title,
        price,
        images,
        totalImages: images.length,
        url: window.location.href
      };
    });
    
    console.log('🏠 DETALLES DE LA PROPIEDAD ESPECÍFICA:');
    console.log(`   📝 Título: ${propertyDetails.title}`);
    console.log(`   💰 Precio: ${propertyDetails.price}`);
    console.log(`   🔗 URL: ${propertyDetails.url}`);
    console.log(`   🖼️  Total imágenes: ${propertyDetails.totalImages}`);
    
    if (propertyDetails.images.length > 0) {
      console.log('\n   📷 IMÁGENES ENCONTRADAS:');
      propertyDetails.images.slice(0, 5).forEach((img: any, index: number) => {
        console.log(`      ${index + 1}. ${img.src}`);
        console.log(`         Alt: ${img.alt || 'N/A'}`);
        console.log(`         Clase: ${img.className || 'N/A'}`);
      });
    } else {
      console.log('\n   ❌ NO SE ENCONTRARON IMÁGENES EN LA PROPIEDAD');
    }
    
    await browser2.close();

  } catch (error) {
    console.error('❌ Error en el análisis:', error);
  }
}

// Ejecutar el análisis
debugFincaraizComplete().catch(console.error);
