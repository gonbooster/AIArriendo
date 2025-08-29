#!/usr/bin/env tsx

/**
 * Debug completo de MercadoLibre - verificar datos exactos que llegan al frontend
 */

import { SearchService } from '../core/services/SearchService';
import { SearchCriteria } from '../core/types';

async function debugMercadoLibreComplete() {
  console.log('🔍 DEBUG COMPLETO MERCADOLIBRE - DATOS AL FRONTEND\n');

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

    // Filtrar solo MercadoLibre
    const mercadoLibreProps = result.properties.filter(p => p.source === 'MercadoLibre');
    console.log(`🛒 PROPIEDADES DE MERCADOLIBRE: ${mercadoLibreProps.length}\n`);

    if (mercadoLibreProps.length === 0) {
      console.log('❌ NO HAY PROPIEDADES DE MERCADOLIBRE QUE CUMPLAN LOS FILTROS');
      
      // Buscar todas las propiedades de MercadoLibre sin filtros estrictos
      console.log('\n🔍 BUSCANDO TODAS LAS PROPIEDADES DE MERCADOLIBRE (SIN FILTROS ESTRICTOS)...\n');
      
      const allMercadoLibre = result.properties.filter(p => p.source === 'MercadoLibre');
      console.log(`📊 TOTAL MERCADOLIBRE ENCONTRADAS: ${allMercadoLibre.length}\n`);
      
      if (allMercadoLibre.length > 0) {
        console.log('🔍 ANALIZANDO PRIMERAS 3 PROPIEDADES DE MERCADOLIBRE:\n');
        
        allMercadoLibre.slice(0, 3).forEach((prop, index) => {
          console.log(`🛒 PROPIEDAD ${index + 1} DE MERCADOLIBRE:`);
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
            console.log(`   🌐 Dominio: ${prop.images[0].includes('mlibre') || prop.images[0].includes('mercadolibre') ? 'MercadoLibre' : 'Otro'}`);
          } else {
            console.log(`   ❌ NO HAY IMAGEN`);
          }
          
          // URL
          console.log('\n   🔗 URL:');
          console.log(`   🌐 URL: ${prop.url}`);
          console.log(`   ✅ URL válida: ${prop.url.startsWith('http')}`);
          console.log(`   🎯 URL específica: ${prop.url.includes('mercadolibre.com')}`);
          
          console.log('\n' + '='.repeat(80) + '\n');
        });
      }
      
      return;
    }

    console.log('🔍 ANÁLISIS DETALLADO DE CADA PROPIEDAD DE MERCADOLIBRE:\n');

    mercadoLibreProps.forEach((prop, index) => {
      console.log(`🛒 PROPIEDAD ${index + 1} DE MERCADOLIBRE:`);
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
        console.log(`   🌐 Dominio: ${prop.images[0].includes('mlibre') || prop.images[0].includes('mercadolibre') ? 'MercadoLibre' : 'Otro'}`);
      } else {
        console.log(`   ❌ NO HAY IMAGEN`);
      }
      
      // URL
      console.log('\n   🔗 URL:');
      console.log(`   🌐 URL: ${prop.url}`);
      console.log(`   ✅ URL válida: ${prop.url.startsWith('http')}`);
      console.log(`   🎯 URL específica: ${prop.url.includes('mercadolibre.com')}`);
      
      const allFiltersOk = roomsOk && bathsOk && areaOk && priceOk && locationOk;
      console.log(`\n   🎯 CUMPLE TODOS LOS FILTROS: ${allFiltersOk ? '✅ SÍ' : '❌ NO'}`);
      
      console.log('\n' + '='.repeat(80) + '\n');
    });

    // Resumen final
    console.log('📊 RESUMEN FINAL MERCADOLIBRE:');
    console.log(`   Total propiedades MercadoLibre: ${mercadoLibreProps.length}`);
    
    const withImages = mercadoLibreProps.filter(p => p.images.length > 0);
    console.log(`   Con imágenes: ${withImages.length}/${mercadoLibreProps.length}`);
    
    const withValidUrls = mercadoLibreProps.filter(p => p.url.startsWith('http'));
    console.log(`   Con URLs válidas: ${withValidUrls.length}/${mercadoLibreProps.length}`);
    
    if (withImages.length === 0) {
      console.log('\n🚨 PROBLEMA IDENTIFICADO: MercadoLibre NO tiene imágenes!');
    }
    if (withValidUrls.length < mercadoLibreProps.length) {
      console.log('\n🚨 PROBLEMA IDENTIFICADO: Algunas URLs de MercadoLibre no son válidas!');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Ejecutar el debug
debugMercadoLibreComplete().catch(console.error);
