#!/usr/bin/env tsx

/**
 * Test del scraper mejorado de Fincaraiz
 */

import { SearchService } from '../core/services/SearchService';
import { SearchCriteria } from '../core/types';

async function testFincaraizImproved() {
  console.log('🔍 TEST SCRAPER MEJORADO DE FINCARAIZ\n');

  try {
    const searchService = new SearchService();

    // Criterios EXACTOS que usas en el frontend
    const criteria: SearchCriteria = {
      hardRequirements: {
        minRooms: 3,
        maxRooms: 4,
        minBathrooms: 2,
        maxBathrooms: 3,
        minParking: 0,
        maxParking: 2,
        minArea: 70,
        maxArea: 110,
        minTotalPrice: 500000,
        maxTotalPrice: 3500000,
        allowAdminOverage: false,
        minStratum: 3,
        maxStratum: 5,
        propertyTypes: ['Apartamento'],
        operation: 'arriendo',
        location: {
          city: 'Bogotá',
          neighborhoods: ['Usaquén'],
          zones: []
        }
      },
      preferences: {
        wetAreas: [],
        sports: [],
        amenities: [],
        weights: {
          wetAreas: 1,
          sports: 1,
          amenities: 0.8,
          location: 0.6,
          pricePerM2: 0.4
        }
      },
      optionalFilters: {}
    };

    console.log('📋 CRITERIOS ENVIADOS:');
    console.log(`   Habitaciones: ${criteria.hardRequirements.minRooms}-${criteria.hardRequirements.maxRooms}`);
    console.log(`   Baños: ${criteria.hardRequirements.minBathrooms}-${criteria.hardRequirements.maxBathrooms}`);
    console.log(`   Área: ${criteria.hardRequirements.minArea}-${criteria.hardRequirements.maxArea} m²`);
    console.log(`   Precio: $${criteria.hardRequirements.minTotalPrice?.toLocaleString()}-$${criteria.hardRequirements.maxTotalPrice.toLocaleString()}`);
    console.log(`   Ubicación: ${criteria.hardRequirements.location.neighborhoods?.join(', ')}`);
    console.log('');

    console.log('🔍 Ejecutando búsqueda...\n');
    const result = await searchService.search(criteria, 1, 48);
    
    console.log(`📊 RESULTADOS TOTALES: ${result.properties.length} propiedades\n`);

    // Filtrar solo Fincaraiz
    const fincaraizProps = result.properties.filter(p => p.source === 'Fincaraiz');
    console.log(`🏠 PROPIEDADES DE FINCARAIZ: ${fincaraizProps.length}\n`);

    if (fincaraizProps.length === 0) {
      console.log('❌ NO HAY PROPIEDADES DE FINCARAIZ QUE CUMPLAN LOS FILTROS');
      
      // Buscar todas las propiedades de Fincaraiz sin filtros estrictos
      console.log('\n🔍 BUSCANDO TODAS LAS PROPIEDADES DE FINCARAIZ (SIN FILTROS ESTRICTOS)...\n');
      
      const allFincaraiz = result.properties.filter(p => p.source === 'Fincaraiz');
      console.log(`📊 TOTAL FINCARAIZ ENCONTRADAS: ${allFincaraiz.length}\n`);
      
      if (allFincaraiz.length > 0) {
        console.log('🔍 ANALIZANDO PRIMERAS 5 PROPIEDADES DE FINCARAIZ:\n');
        
        allFincaraiz.slice(0, 5).forEach((prop, index) => {
          console.log(`🏠 PROPIEDAD ${index + 1} DE FINCARAIZ:`);
          console.log(`   📝 ID: ${prop.id}`);
          console.log(`   📝 Título: ${prop.title}`);
          console.log(`   💰 Precio: $${prop.totalPrice.toLocaleString()}`);
          console.log(`   📐 Área: ${prop.area}m²`);
          console.log(`   🏠 Habitaciones: ${prop.rooms}`);
          console.log(`   🚿 Baños: ${prop.bathrooms}`);
          console.log(`   🚗 Parqueaderos: ${prop.parking || 'N/A'}`);
          console.log(`   📍 Ubicación: ${prop.location.address}`);
          console.log(`   🏘️  Barrio: ${prop.location.neighborhood}`);
          
          // Verificar por qué no cumple filtros
          console.log('\n   ❌ VERIFICACIÓN DE FILTROS:');
          
          const roomsOk = prop.rooms >= 3 && prop.rooms <= 4;
          console.log(`   🏠 Habitaciones: ${prop.rooms} ${roomsOk ? '✅' : '❌'} (necesita 3-4)`);
          
          const bathsOk = prop.bathrooms >= 2 && prop.bathrooms <= 3;
          console.log(`   🚿 Baños: ${prop.bathrooms} ${bathsOk ? '✅' : '❌'} (necesita 2-3)`);
          
          const areaOk = prop.area >= 70 && prop.area <= 110;
          console.log(`   📐 Área: ${prop.area}m² ${areaOk ? '✅' : '❌'} (necesita 70-110)`);
          
          const priceOk = prop.totalPrice >= 500000 && prop.totalPrice <= 3500000;
          console.log(`   💰 Precio: $${prop.totalPrice.toLocaleString()} ${priceOk ? '✅' : '❌'} (necesita $500K-$3.5M)`);
          
          const locationText = (prop.location.address || '').toLowerCase();
          const locationOk = locationText.includes('usaquén') || locationText.includes('usaquen');
          console.log(`   📍 Ubicación: "${locationText}" ${locationOk ? '✅' : '❌'} (necesita Usaquén)`);
          
          // Imagen
          console.log('\n   🖼️  IMAGEN:');
          if (prop.images.length > 0) {
            console.log(`   📷 URL: ${prop.images[0]}`);
            console.log(`   ✅ Imagen válida: ${prop.images[0].startsWith('http')}`);
            console.log(`   🌐 Dominio: ${prop.images[0].includes('fincaraiz') || prop.images[0].includes('cloudfront') || prop.images[0].includes('amazonaws') ? 'Fincaraiz' : 'Otro'}`);
          } else {
            console.log(`   ❌ NO HAY IMAGEN`);
          }
          
          // URL
          console.log('\n   🔗 URL:');
          console.log(`   🌐 URL: ${prop.url}`);
          console.log(`   ✅ URL válida: ${prop.url.startsWith('http')}`);
          console.log(`   🎯 URL específica: ${prop.url.includes('fincaraiz.com')}`);
          console.log(`   🏗️  Es proyecto: ${prop.url.includes('/proyectos-vivienda/')}`);
          
          console.log('\n' + '='.repeat(80) + '\n');
        });
      }
      
      return;
    }

    console.log('🔍 ANÁLISIS DETALLADO DE CADA PROPIEDAD DE FINCARAIZ:\n');

    fincaraizProps.forEach((prop, index) => {
      console.log(`🏠 PROPIEDAD ${index + 1} DE FINCARAIZ:`);
      console.log(`   📝 ID: ${prop.id}`);
      console.log(`   📝 Título: ${prop.title}`);
      console.log(`   💰 Precio: $${prop.totalPrice.toLocaleString()}`);
      console.log(`   📐 Área: ${prop.area}m²`);
      console.log(`   🏠 Habitaciones: ${prop.rooms}`);
      console.log(`   🚿 Baños: ${prop.bathrooms}`);
      console.log(`   🚗 Parqueaderos: ${prop.parking || 'N/A'}`);
      console.log(`   📍 Ubicación: ${prop.location.address}`);
      console.log(`   🏘️  Barrio: ${prop.location.neighborhood}`);
      
      // Verificar filtros
      console.log('\n   ✅ VERIFICACIÓN DE FILTROS:');
      
      const roomsOk = prop.rooms >= 3 && prop.rooms <= 4;
      console.log(`   🏠 Habitaciones: ${prop.rooms} ${roomsOk ? '✅' : '❌'} (necesita 3-4)`);
      
      const bathsOk = prop.bathrooms >= 2 && prop.bathrooms <= 3;
      console.log(`   🚿 Baños: ${prop.bathrooms} ${bathsOk ? '✅' : '❌'} (necesita 2-3)`);
      
      const areaOk = prop.area >= 70 && prop.area <= 110;
      console.log(`   📐 Área: ${prop.area}m² ${areaOk ? '✅' : '❌'} (necesita 70-110)`);
      
      const priceOk = prop.totalPrice >= 500000 && prop.totalPrice <= 3500000;
      console.log(`   💰 Precio: $${prop.totalPrice.toLocaleString()} ${priceOk ? '✅' : '❌'} (necesita $500K-$3.5M)`);
      
      const locationText = (prop.location.address || '').toLowerCase();
      const locationOk = locationText.includes('usaquén') || locationText.includes('usaquen');
      console.log(`   📍 Ubicación: "${locationText}" ${locationOk ? '✅' : '❌'} (necesita Usaquén)`);
      
      // Imagen
      console.log('\n   🖼️  IMAGEN:');
      if (prop.images.length > 0) {
        console.log(`   📷 URL: ${prop.images[0]}`);
        console.log(`   ✅ Imagen válida: ${prop.images[0].startsWith('http')}`);
        console.log(`   🌐 Dominio: ${prop.images[0].includes('fincaraiz') || prop.images[0].includes('cloudfront') || prop.images[0].includes('amazonaws') ? 'Fincaraiz' : 'Otro'}`);
      } else {
        console.log(`   ❌ NO HAY IMAGEN`);
      }
      
      // URL
      console.log('\n   🔗 URL:');
      console.log(`   🌐 URL: ${prop.url}`);
      console.log(`   ✅ URL válida: ${prop.url.startsWith('http')}`);
      console.log(`   🎯 URL específica: ${prop.url.includes('fincaraiz.com')}`);
      console.log(`   🏗️  Es proyecto: ${prop.url.includes('/proyectos-vivienda/')}`);
      
      const allFiltersOk = roomsOk && bathsOk && areaOk && priceOk && locationOk;
      console.log(`\n   🎯 CUMPLE TODOS LOS FILTROS: ${allFiltersOk ? '✅ SÍ' : '❌ NO'}`);
      
      console.log('\n' + '='.repeat(80) + '\n');
    });

    // Resumen final
    console.log('📊 RESUMEN FINAL FINCARAIZ:');
    console.log(`   Total propiedades Fincaraiz: ${fincaraizProps.length}`);
    
    const withImages = fincaraizProps.filter(p => p.images.length > 0);
    console.log(`   Con imágenes: ${withImages.length}/${fincaraizProps.length}`);
    
    const withValidUrls = fincaraizProps.filter(p => p.url.startsWith('http'));
    console.log(`   Con URLs válidas: ${withValidUrls.length}/${fincaraizProps.length}`);
    
    const withProjectUrls = fincaraizProps.filter(p => p.url.includes('/proyectos-vivienda/'));
    console.log(`   Con URLs de proyecto: ${withProjectUrls.length}/${fincaraizProps.length}`);
    
    if (withImages.length === 0) {
      console.log('\n🚨 PROBLEMA IDENTIFICADO: Fincaraiz NO tiene imágenes!');
    }
    if (withValidUrls.length < fincaraizProps.length) {
      console.log('\n🚨 PROBLEMA IDENTIFICADO: Algunas URLs de Fincaraiz no son válidas!');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Ejecutar el test
testFincaraizImproved().catch(console.error);
