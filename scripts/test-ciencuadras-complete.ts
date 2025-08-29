#!/usr/bin/env tsx

/**
 * Test completo de Ciencuadras - verificar datos exactos que llegan al frontend
 */

import { SearchService } from '../core/services/SearchService';
import { SearchCriteria } from '../core/types';

async function testCiencuadrasComplete() {
  console.log('🔍 TEST COMPLETO CIENCUADRAS - DATOS AL FRONTEND\n');

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

    // Filtrar solo Ciencuadras
    const ciencuadrasProps = result.properties.filter(p => p.source === 'Ciencuadras');
    console.log(`🏠 PROPIEDADES DE CIENCUADRAS: ${ciencuadrasProps.length}\n`);

    if (ciencuadrasProps.length === 0) {
      console.log('❌ NO HAY PROPIEDADES DE CIENCUADRAS QUE CUMPLAN LOS FILTROS');
      return;
    }

    console.log('🔍 ANÁLISIS DETALLADO DE CADA PROPIEDAD DE CIENCUADRAS:\n');

    ciencuadrasProps.forEach((prop, index) => {
      console.log(`🏠 PROPIEDAD ${index + 1} DE CIENCUADRAS:`);
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
      
      // Habitaciones
      const roomsOk = prop.rooms >= 3 && prop.rooms <= 4;
      console.log(`   🏠 Habitaciones: ${prop.rooms} ${roomsOk ? '✅' : '❌'} (necesita 3-4)`);
      
      // Baños
      const bathsOk = prop.bathrooms >= 2 && prop.bathrooms <= 3;
      console.log(`   🚿 Baños: ${prop.bathrooms} ${bathsOk ? '✅' : '❌'} (necesita 2-3)`);
      
      // Área
      const areaOk = prop.area >= 70 && prop.area <= 110;
      console.log(`   📐 Área: ${prop.area}m² ${areaOk ? '✅' : '❌'} (necesita 70-110)`);
      
      // Precio
      const priceOk = prop.totalPrice >= 500000 && prop.totalPrice <= 3500000;
      console.log(`   💰 Precio: $${prop.totalPrice.toLocaleString()} ${priceOk ? '✅' : '❌'} (necesita $500K-$3.5M)`);
      
      // Ubicación
      const locationText = (prop.location.address || '').toLowerCase();
      const locationOk = locationText.includes('usaquén') || locationText.includes('usaquen');
      console.log(`   📍 Ubicación: "${locationText}" ${locationOk ? '✅' : '❌'} (necesita Usaquén)`);
      
      // Imagen
      console.log('\n   🖼️  IMAGEN:');
      if (prop.images.length > 0) {
        console.log(`   📷 URL: ${prop.images[0]}`);
        console.log(`   ✅ Imagen válida: ${prop.images[0].startsWith('http')}`);
        console.log(`   🌐 Dominio: ${prop.images[0].includes('amazonaws') ? 'AWS S3' : 'Otro'}`);
      } else {
        console.log(`   ❌ NO HAY IMAGEN`);
      }
      
      // URL
      console.log('\n   🔗 URL:');
      console.log(`   🌐 URL: ${prop.url}`);
      console.log(`   ✅ URL válida: ${prop.url.startsWith('http')}`);
      console.log(`   🎯 URL específica: ${prop.url.includes('/property/')}`);
      
      // Resumen de cumplimiento
      const allFiltersOk = roomsOk && bathsOk && areaOk && priceOk && locationOk;
      console.log(`\n   🎯 CUMPLE TODOS LOS FILTROS: ${allFiltersOk ? '✅ SÍ' : '❌ NO'}`);
      
      console.log('\n' + '='.repeat(80) + '\n');
    });

    // Resumen final
    console.log('📊 RESUMEN FINAL:');
    console.log(`   Total propiedades Ciencuadras: ${ciencuadrasProps.length}`);
    
    const withImages = ciencuadrasProps.filter(p => p.images.length > 0);
    console.log(`   Con imágenes: ${withImages.length}/${ciencuadrasProps.length}`);
    
    const withValidUrls = ciencuadrasProps.filter(p => p.url.startsWith('http'));
    console.log(`   Con URLs válidas: ${withValidUrls.length}/${ciencuadrasProps.length}`);
    
    // Verificar que todas cumplan filtros
    const compliantProps = ciencuadrasProps.filter(p => {
      const roomsOk = p.rooms >= 3 && p.rooms <= 4;
      const bathsOk = p.bathrooms >= 2 && p.bathrooms <= 3;
      const areaOk = p.area >= 70 && p.area <= 110;
      const priceOk = p.totalPrice >= 500000 && p.totalPrice <= 3500000;
      const locationText = (p.location.address || '').toLowerCase();
      const locationOk = locationText.includes('usaquén') || locationText.includes('usaquen');
      return roomsOk && bathsOk && areaOk && priceOk && locationOk;
    });
    
    console.log(`   Cumplen todos los filtros: ${compliantProps.length}/${ciencuadrasProps.length}`);
    
    if (compliantProps.length === ciencuadrasProps.length) {
      console.log('\n🎉 ¡PERFECTO! Todas las propiedades de Ciencuadras cumplen los filtros');
    } else {
      console.log('\n⚠️  Algunas propiedades no cumplen los filtros - revisar lógica de filtrado');
    }

    // Simular datos que llegan al frontend
    console.log('\n📤 DATOS QUE LLEGAN AL FRONTEND (formato JSON):');
    const frontendData = {
      success: true,
      data: {
        properties: ciencuadrasProps.map(p => ({
          id: p.id,
          title: p.title,
          price: p.totalPrice,
          area: p.area,
          rooms: p.rooms,
          bathrooms: p.bathrooms,
          parking: p.parking,
          location: {
            address: p.location.address,
            neighborhood: p.location.neighborhood,
            city: p.location.city
          },
          images: p.images,
          url: p.url,
          source: p.source,
          pricePerM2: p.pricePerM2
        })),
        total: ciencuadrasProps.length
      }
    };

    console.log(JSON.stringify(frontendData, null, 2));

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the test
testCiencuadrasComplete().catch(console.error);
