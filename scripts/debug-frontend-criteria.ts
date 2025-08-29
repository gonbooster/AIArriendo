#!/usr/bin/env tsx

/**
 * Debug con los criterios EXACTOS que envía el frontend
 */

import { SearchService } from '../core/services/SearchService';
import { SearchCriteria } from '../core/types';

async function debugFrontendCriteria() {
  console.log('🔍 DEBUG CON CRITERIOS EXACTOS DEL FRONTEND\n');

  try {
    const searchService = new SearchService();

    // CRITERIOS EXACTOS que envía el frontend (copiados del log)
    const frontendCriteria = {
      "operation": "arriendo",
      "propertyTypes": ["Apartamento"],
      "minRooms": 3,
      "maxRooms": 4,
      "minBathrooms": 2,
      "maxBathrooms": 3,
      "minParking": 0,
      "maxParking": 2,
      "minArea": 70,
      "maxArea": 110,
      "minPrice": 500000,
      "maxPrice": 3500000,
      "allowAdminOverage": false,
      "minStratum": 3,
      "maxStratum": 5,
      "location": {
        "neighborhoods": ["Usaquén"]
      },
      "preferences": {
        "wetAreas": [],
        "sports": [],
        "amenities": []
      }
    };

    // Convertir a SearchCriteria (formato del backend)
    const criteria: SearchCriteria = {
      hardRequirements: {
        minRooms: frontendCriteria.minRooms,
        maxRooms: frontendCriteria.maxRooms,
        minBathrooms: frontendCriteria.minBathrooms,
        maxBathrooms: frontendCriteria.maxBathrooms,
        minParking: frontendCriteria.minParking,
        maxParking: frontendCriteria.maxParking,
        minArea: frontendCriteria.minArea,
        maxArea: frontendCriteria.maxArea,
        minTotalPrice: frontendCriteria.minPrice,
        maxTotalPrice: frontendCriteria.maxPrice,
        allowAdminOverage: frontendCriteria.allowAdminOverage,
        minStratum: frontendCriteria.minStratum,
        maxStratum: frontendCriteria.maxStratum,
        propertyTypes: frontendCriteria.propertyTypes,
        operation: frontendCriteria.operation,
        location: {
          city: 'Bogotá',
          neighborhoods: frontendCriteria.location.neighborhoods,
          zones: []
        }
      },
      preferences: {
        wetAreas: frontendCriteria.preferences.wetAreas,
        sports: frontendCriteria.preferences.sports,
        amenities: frontendCriteria.preferences.amenities,
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

    console.log('📋 CRITERIOS FRONTEND (ORIGINALES):');
    console.log(JSON.stringify(frontendCriteria, null, 2));
    console.log('');

    console.log('📋 CRITERIOS BACKEND (CONVERTIDOS):');
    console.log(JSON.stringify(criteria, null, 2));
    console.log('');

    console.log('🔍 Ejecutando búsqueda con criterios exactos del frontend...\n');
    const result = await searchService.search(criteria, 1, 48);
    
    console.log(`📊 RESULTADOS TOTALES: ${result.properties.length} propiedades\n`);

    if (result.properties.length === 0) {
      console.log('❌ NO HAY PROPIEDADES - MISMO PROBLEMA QUE EL FRONTEND');
      console.log('🔍 Vamos a investigar qué está pasando...\n');
      
      // Probar con criterios más relajados
      console.log('🔍 PROBANDO CON CRITERIOS MÁS RELAJADOS...\n');
      
      const relaxedCriteria: SearchCriteria = {
        hardRequirements: {
          minRooms: 2,
          maxRooms: 5,
          minBathrooms: 1,
          maxBathrooms: 4,
          minParking: 0,
          maxParking: 3,
          minArea: 50,
          maxArea: 150,
          minTotalPrice: 300000,
          maxTotalPrice: 5000000,
          allowAdminOverage: false,
          minStratum: 1,
          maxStratum: 6,
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
      
      const relaxedResult = await searchService.search(relaxedCriteria, 1, 48);
      console.log(`📊 RESULTADOS CON CRITERIOS RELAJADOS: ${relaxedResult.properties.length} propiedades\n`);
      
      if (relaxedResult.properties.length > 0) {
        console.log('✅ CON CRITERIOS RELAJADOS SÍ HAY PROPIEDADES');
        console.log('🚨 PROBLEMA: Los criterios del frontend son demasiado estrictos\n');
        
        // Analizar las primeras 3 propiedades
        relaxedResult.properties.slice(0, 3).forEach((prop, index) => {
          console.log(`🏠 PROPIEDAD ${index + 1}:`);
          console.log(`   📝 Fuente: ${prop.source}`);
          console.log(`   📝 Título: ${prop.title}`);
          console.log(`   💰 Precio: $${prop.totalPrice.toLocaleString()}`);
          console.log(`   📐 Área: ${prop.area}m²`);
          console.log(`   🏠 Habitaciones: ${prop.rooms}`);
          console.log(`   🚿 Baños: ${prop.bathrooms}`);
          console.log(`   📍 Ubicación: ${prop.location.address}`);
          
          // Verificar por qué no cumple los criterios estrictos
          console.log('\n   ❌ VERIFICACIÓN CRITERIOS ESTRICTOS:');
          
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
          
          console.log('\n' + '='.repeat(80) + '\n');
        });
      } else {
        console.log('❌ NI CON CRITERIOS RELAJADOS HAY PROPIEDADES');
        console.log('🚨 PROBLEMA: El backend no está funcionando correctamente');
      }
      
      return;
    }

    console.log('✅ SÍ HAY PROPIEDADES - EL BACKEND FUNCIONA CORRECTAMENTE');
    console.log('🔍 ANALIZANDO CADA PROPIEDAD:\n');

    result.properties.forEach((prop, index) => {
      console.log(`🏠 PROPIEDAD ${index + 1}:`);
      console.log(`   📝 Fuente: ${prop.source}`);
      console.log(`   📝 Título: ${prop.title}`);
      console.log(`   💰 Precio: $${prop.totalPrice.toLocaleString()}`);
      console.log(`   📐 Área: ${prop.area}m²`);
      console.log(`   🏠 Habitaciones: ${prop.rooms}`);
      console.log(`   🚿 Baños: ${prop.bathrooms}`);
      console.log(`   📍 Ubicación: ${prop.location.address}`);
      console.log(`   🖼️  Imagen: ${prop.images.length > 0 ? prop.images[0] : 'NO HAY'}`);
      console.log(`   🔗 URL: ${prop.url}`);
      console.log('\n' + '='.repeat(80) + '\n');
    });

    // Resumen final
    console.log('📊 RESUMEN FINAL:');
    console.log(`   Total propiedades encontradas: ${result.properties.length}`);
    
    const bySources = result.properties.reduce((acc, prop) => {
      acc[prop.source] = (acc[prop.source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('   Por fuente:');
    Object.entries(bySources).forEach(([source, count]) => {
      console.log(`     ${source}: ${count} propiedades`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Ejecutar el debug
debugFrontendCriteria().catch(console.error);
