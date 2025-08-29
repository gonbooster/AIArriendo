#!/usr/bin/env tsx

/**
 * Test directo de la API con los criterios exactos del frontend
 */

import axios from 'axios';

async function testApiDirect() {
  console.log('🔍 TEST DIRECTO DE LA API\n');

  try {
    const apiUrl = 'http://localhost:3001/api/search';
    
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

    const requestBody = {
      criteria: frontendCriteria,
      page: 1,
      limit: 48
    };

    console.log('📋 CRITERIOS ENVIADOS A LA API:');
    console.log(JSON.stringify(requestBody, null, 2));
    console.log('');

    console.log(`🔗 Enviando POST a: ${apiUrl}`);
    console.log('⏳ Esperando respuesta...\n');

    const startTime = Date.now();
    const response = await axios.post(apiUrl, requestBody, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 60000 // 60 segundos
    });
    const endTime = Date.now();

    console.log(`✅ RESPUESTA RECIBIDA (${endTime - startTime}ms):`);
    console.log(`   Status: ${response.status}`);
    console.log(`   Headers: ${JSON.stringify(response.headers, null, 2)}`);
    console.log('');

    const data = response.data;
    console.log('📊 DATOS DE LA RESPUESTA:');
    console.log(`   Success: ${data.success}`);
    
    if (data.success) {
      console.log(`   Properties: ${data.data?.properties?.length || 0}`);
      console.log(`   Total: ${data.data?.total || 0}`);
      console.log(`   Page: ${data.pagination?.page || 'N/A'}`);
      console.log(`   Limit: ${data.pagination?.limit || 'N/A'}`);
      console.log(`   Execution Time: ${data.metadata?.executionTime || 'N/A'}`);
      console.log('');

      if (data.data?.properties?.length > 0) {
        console.log('🏠 PROPIEDADES ENCONTRADAS:');
        data.data.properties.forEach((prop: any, index: number) => {
          console.log(`\n   ${index + 1}. ${prop.source} - ${prop.title}`);
          console.log(`      💰 Precio: $${prop.totalPrice?.toLocaleString()}`);
          console.log(`      📐 Área: ${prop.area}m²`);
          console.log(`      🏠 Habitaciones: ${prop.rooms}`);
          console.log(`      🚿 Baños: ${prop.bathrooms}`);
          console.log(`      📍 Ubicación: ${prop.location?.address}`);
          console.log(`      🖼️  Imagen: ${prop.images?.length > 0 ? prop.images[0] : 'NO HAY'}`);
          console.log(`      🔗 URL: ${prop.url}`);
        });
      } else {
        console.log('❌ NO HAY PROPIEDADES EN LA RESPUESTA');
        console.log('🚨 PROBLEMA: La API devuelve success=true pero 0 propiedades');
      }
    } else {
      console.log(`   Error: ${data.error}`);
      console.log('❌ LA API DEVOLVIÓ UN ERROR');
    }

    console.log('\n📄 RESPUESTA COMPLETA:');
    console.log(JSON.stringify(data, null, 2));

  } catch (error: any) {
    console.error('❌ ERROR EN LA LLAMADA A LA API:');
    
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Data: ${JSON.stringify(error.response.data, null, 2)}`);
    } else if (error.request) {
      console.error('   No se recibió respuesta del servidor');
      console.error(`   Request: ${error.request}`);
    } else {
      console.error(`   Error: ${error.message}`);
    }
    
    console.error(`   Stack: ${error.stack}`);
  }
}

// Ejecutar el test
testApiDirect().catch(console.error);
