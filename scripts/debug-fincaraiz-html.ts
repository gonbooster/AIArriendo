#!/usr/bin/env tsx

/**
 * Debug Fincaraiz con HTML estático - análisis directo
 */

import * as cheerio from 'cheerio';
import axios from 'axios';

async function debugFincaraizHtml() {
  console.log('🔍 DEBUG FINCARAIZ HTML ESTÁTICO\n');

  try {
    // URLs exactas
    const searchUrl = 'https://www.fincaraiz.com.co/venta/apartamentos/usaquen/bogota';
    const samplePropertyUrl = 'https://www.fincaraiz.com.co/proyectos-vivienda/ciudad-la-salle-burdeos-apartamentos-en-venta-en-alameda-bogota/7203484';
    
    console.log(`📍 Analizando página de resultados: ${searchUrl}\n`);

    // Método 1: Análisis con Axios + Cheerio (HTML estático)
    console.log('🚀 MÉTODO 1: Análisis con Axios + Cheerio (HTML estático)\n');
    
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'es-CO,es;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    });
    
    const $ = cheerio.load(response.data);
    
    console.log('📄 Analizando HTML estático...');
    console.log(`📊 Tamaño del HTML: ${response.data.length} caracteres\n`);
    
    // Buscar diferentes selectores posibles
    const possibleSelectors = [
      '.MuiGrid-item',
      '.property-card',
      '.listing-item',
      '[data-testid*="property"]',
      '.card',
      'article',
      '.result-item',
      '.property',
      '.inmueble',
      '.listing',
      '.item'
    ];
    
    console.log('🔍 Buscando selectores de propiedades:');
    possibleSelectors.forEach(selector => {
      const count = $(selector).length;
      console.log(`   ${selector}: ${count} elementos`);
    });
    
    // Buscar patrones en el HTML
    console.log('\n🔍 Buscando patrones en el HTML:');
    const htmlContent = response.data;
    
    // Buscar clases que contengan palabras clave
    const classMatches = htmlContent.match(/class="[^"]*(?:property|inmueble|listing|card|item)[^"]*"/gi) || [];
    console.log(`   Clases con palabras clave: ${classMatches.length}`);
    classMatches.slice(0, 10).forEach((match, index) => {
      console.log(`      ${index + 1}. ${match}`);
    });
    
    // Buscar data-testid
    const testIdMatches = htmlContent.match(/data-testid="[^"]*"/gi) || [];
    console.log(`\n   Data-testid encontrados: ${testIdMatches.length}`);
    testIdMatches.slice(0, 10).forEach((match, index) => {
      console.log(`      ${index + 1}. ${match}`);
    });
    
    // Buscar imágenes
    console.log('\n🖼️  ANÁLISIS DE IMÁGENES:');
    const images = $('img');
    console.log(`   Total imágenes: ${images.length}`);
    
    const fincaraizImages: string[] = [];
    images.each((index, img) => {
      const $img = $(img);
      const src = $img.attr('src');
      const dataSrc = $img.attr('data-src');
      const alt = $img.attr('alt');
      
      if (src && (src.includes('fincaraiz') || src.includes('finca'))) {
        fincaraizImages.push(src);
        console.log(`   📷 Imagen Fincaraiz ${fincaraizImages.length}: ${src}`);
        console.log(`      Alt: ${alt || 'N/A'}`);
      }
    });
    
    console.log(`\n   Imágenes de Fincaraiz encontradas: ${fincaraizImages.length}`);
    
    // Buscar enlaces de propiedades
    console.log('\n🔗 ANÁLISIS DE ENLACES:');
    const links = $('a');
    console.log(`   Total enlaces: ${links.length}`);
    
    const propertyLinks: string[] = [];
    links.each((index, link) => {
      const $link = $(link);
      const href = $link.attr('href');
      
      if (href && (href.includes('/proyectos-vivienda/') || href.includes('/inmueble/'))) {
        propertyLinks.push(href);
        console.log(`   🔗 Enlace de propiedad ${propertyLinks.length}: ${href}`);
      }
    });
    
    console.log(`\n   Enlaces de propiedades encontrados: ${propertyLinks.length}`);
    
    // Buscar precios
    console.log('\n💰 ANÁLISIS DE PRECIOS:');
    const priceMatches = htmlContent.match(/\$[\d.,]+/g) || [];
    console.log(`   Precios encontrados: ${priceMatches.length}`);
    priceMatches.slice(0, 10).forEach((price, index) => {
      console.log(`      ${index + 1}. ${price}`);
    });
    
    // Método 2: Análisis de propiedad específica
    console.log('\n🚀 MÉTODO 2: Análisis de propiedad específica\n');
    console.log(`📍 Analizando: ${samplePropertyUrl}\n`);
    
    const propertyResponse = await axios.get(samplePropertyUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    
    const $property = cheerio.load(propertyResponse.data);
    
    console.log('📄 Analizando propiedad específica...');
    console.log(`📊 Tamaño del HTML: ${propertyResponse.data.length} caracteres\n`);
    
    // Extraer información de la propiedad
    const title = $property('h1').first().text().trim();
    console.log(`📝 Título: ${title || 'NO ENCONTRADO'}`);
    
    // Buscar precio
    const priceSelectors = ['.price', '[data-testid*="price"]', '.valor', '.cost'];
    let price = '';
    for (const selector of priceSelectors) {
      const priceEl = $property(selector).first();
      if (priceEl.length > 0) {
        price = priceEl.text().trim();
        break;
      }
    }
    
    if (!price) {
      const propertyText = $property.text();
      const priceMatch = propertyText.match(/\$[\d.,]+/);
      if (priceMatch) price = priceMatch[0];
    }
    
    console.log(`💰 Precio: ${price || 'NO ENCONTRADO'}`);
    
    // Buscar imágenes de la propiedad
    console.log('\n🖼️  IMÁGENES DE LA PROPIEDAD:');
    const propertyImages = $property('img');
    console.log(`   Total imágenes: ${propertyImages.length}`);
    
    const validImages: string[] = [];
    propertyImages.each((index, img) => {
      const $img = $property(img);
      const src = $img.attr('src');
      const dataSrc = $img.attr('data-src');
      const alt = $img.attr('alt');
      
      if (src && src.startsWith('http') && (src.includes('fincaraiz') || src.includes('finca') || src.includes('cloudfront') || src.includes('amazonaws'))) {
        validImages.push(src);
        console.log(`   📷 Imagen válida ${validImages.length}: ${src}`);
        console.log(`      Alt: ${alt || 'N/A'}`);
      }
    });
    
    console.log(`\n   Imágenes válidas encontradas: ${validImages.length}`);
    
    // Buscar características
    console.log('\n🏠 CARACTERÍSTICAS:');
    const propertyText = $property.text();
    
    const roomsMatch = propertyText.match(/(\d+)\s*(?:hab|habitacion|alcoba|dormitorio)/i);
    const bathsMatch = propertyText.match(/(\d+)\s*(?:baño|baños|bath)/i);
    const areaMatch = propertyText.match(/(\d+(?:\.\d+)?)\s*m[²2]/i);
    
    console.log(`   🏠 Habitaciones: ${roomsMatch ? roomsMatch[1] : 'NO ENCONTRADO'}`);
    console.log(`   🚿 Baños: ${bathsMatch ? bathsMatch[1] : 'NO ENCONTRADO'}`);
    console.log(`   📐 Área: ${areaMatch ? areaMatch[1] : 'NO ENCONTRADO'}m²`);
    
    // Resumen final
    console.log('\n📊 RESUMEN FINAL:');
    console.log(`   Página de resultados:`);
    console.log(`     - Enlaces de propiedades: ${propertyLinks.length}`);
    console.log(`     - Imágenes de Fincaraiz: ${fincaraizImages.length}`);
    console.log(`     - Precios encontrados: ${priceMatches.length}`);
    console.log(`   Propiedad específica:`);
    console.log(`     - Título: ${title ? 'SÍ' : 'NO'}`);
    console.log(`     - Precio: ${price ? 'SÍ' : 'NO'}`);
    console.log(`     - Imágenes válidas: ${validImages.length}`);
    console.log(`     - Características: ${roomsMatch && bathsMatch && areaMatch ? 'COMPLETAS' : 'INCOMPLETAS'}`);

  } catch (error) {
    console.error('❌ Error en el análisis:', error);
  }
}

// Ejecutar el análisis
debugFincaraizHtml().catch(console.error);
