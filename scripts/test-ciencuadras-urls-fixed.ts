#!/usr/bin/env tsx

/**
 * Test que las URLs de Ciencuadras ahora sean correctas
 */

import { SearchService } from '../core/services/SearchService';
import { SearchCriteria } from '../core/types';
import axios from 'axios';

async function testCiencuadrasUrlsFixed() {
  console.log('🔧 TEST URLS CIENCUADRAS ARREGLADAS\n');

  try {
    const searchService = new SearchService();

    // Criterios exactos
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

    console.log('🔍 Ejecutando búsqueda con URLs arregladas...\n');
    const result = await searchService.search(criteria, 1, 48);
    
    const ciencuadrasProps = result.properties.filter(p => p.source === 'Ciencuadras');
    console.log(`🏠 PROPIEDADES DE CIENCUADRAS: ${ciencuadrasProps.length}\n`);

    if (ciencuadrasProps.length === 0) {
      console.log('❌ NO HAY PROPIEDADES DE CIENCUADRAS');
      return;
    }

    console.log('🔗 VERIFICANDO URLS GENERADAS:\n');

    for (let i = 0; i < ciencuadrasProps.length; i++) {
      const prop = ciencuadrasProps[i];
      
      console.log(`🏠 PROPIEDAD ${i + 1}:`);
      console.log(`   📝 Título: ${prop.title.substring(0, 50)}...`);
      console.log(`   💰 Precio: $${prop.totalPrice.toLocaleString()}`);
      console.log(`   📐 Área: ${prop.area}m²`);
      console.log(`   🏠 Habitaciones: ${prop.rooms}`);
      console.log(`   🔗 URL generada: ${prop.url}`);
      
      // Verificar formato de URL
      const isCorrectFormat = prop.url.includes('/inmueble/');
      console.log(`   ✅ Formato correcto (/inmueble/): ${isCorrectFormat ? 'SÍ' : 'NO'}`);
      
      // Verificar que la URL funcione
      try {
        console.log(`   🧪 Probando URL...`);
        const response = await axios.head(prop.url, { 
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        console.log(`   ✅ Status: ${response.status} - ¡FUNCIONA!`);
      } catch (error: any) {
        const status = error.response?.status || 'Error';
        console.log(`   ❌ Status: ${status} - No funciona`);
        
        // Si no funciona, intentar con /arriendo/
        const alternativeUrl = prop.url.replace('/inmueble/', '/arriendo/');
        try {
          console.log(`   🔄 Probando URL alternativa: ${alternativeUrl}`);
          const altResponse = await axios.head(alternativeUrl, { 
            timeout: 10000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          });
          console.log(`   ✅ URL alternativa Status: ${altResponse.status} - ¡FUNCIONA!`);
          console.log(`   💡 Sugerencia: Usar /arriendo/ en lugar de /inmueble/`);
        } catch (altError: any) {
          const altStatus = altError.response?.status || 'Error';
          console.log(`   ❌ URL alternativa Status: ${altStatus} - Tampoco funciona`);
        }
      }
      
      console.log('');
    }

    // Resumen
    const workingUrls = [];
    const brokenUrls = [];
    
    for (const prop of ciencuadrasProps) {
      try {
        await axios.head(prop.url, { timeout: 5000 });
        workingUrls.push(prop.url);
      } catch {
        brokenUrls.push(prop.url);
      }
    }
    
    console.log('📊 RESUMEN DE URLS:');
    console.log(`   Total URLs: ${ciencuadrasProps.length}`);
    console.log(`   URLs que funcionan: ${workingUrls.length}`);
    console.log(`   URLs rotas: ${brokenUrls.length}`);
    
    if (workingUrls.length === ciencuadrasProps.length) {
      console.log('\n🎉 ¡PERFECTO! Todas las URLs funcionan correctamente');
    } else if (workingUrls.length > 0) {
      console.log('\n⚠️  Algunas URLs funcionan, otras no');
    } else {
      console.log('\n❌ Ninguna URL funciona - necesita más ajustes');
    }

    // Mostrar ejemplos de URLs que funcionan
    if (workingUrls.length > 0) {
      console.log('\n✅ EJEMPLOS DE URLS QUE FUNCIONAN:');
      workingUrls.slice(0, 3).forEach((url, index) => {
        console.log(`   ${index + 1}. ${url}`);
      });
    }

    // Mostrar ejemplos de URLs rotas
    if (brokenUrls.length > 0) {
      console.log('\n❌ EJEMPLOS DE URLS ROTAS:');
      brokenUrls.slice(0, 3).forEach((url, index) => {
        console.log(`   ${index + 1}. ${url}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Ejecutar el test
testCiencuadrasUrlsFixed().catch(console.error);
