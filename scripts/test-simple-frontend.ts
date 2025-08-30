/**
 * Script para probar la funcionalidad del frontend simplificado
 * Simula una búsqueda con criterios mínimos como lo haría el frontend
 */

import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api';

interface SimpleSearchCriteria {
  operation: string;
  location: {
    neighborhoods: string[];
  };
}

async function testSimpleFrontendSearch() {
  console.log('🧪 PROBANDO FRONTEND SIMPLIFICADO');
  console.log('==================================');

  // Criterios mínimos como los envía el frontend
  const simpleCriteria: SimpleSearchCriteria = {
    operation: 'arriendo',
    location: {
      neighborhoods: ['Chapinero']
    }
  };

  console.log('📋 Criterios enviados (mínimos):');
  console.log(JSON.stringify(simpleCriteria, null, 2));

  try {
    console.log('\n🚀 Enviando búsqueda al backend...');
    
    const response = await axios.post(`${API_BASE_URL}/search`, {
      criteria: simpleCriteria,
      page: 1,
      limit: 10
    });

    if (response.data.success) {
      const { properties, total } = response.data.data;
      
      console.log('\n✅ BÚSQUEDA EXITOSA');
      console.log(`📊 Total encontrado: ${total} propiedades`);
      console.log(`📄 Mostrando: ${properties.length} propiedades`);
      
      if (properties.length > 0) {
        console.log('\n🏠 PRIMERAS 3 PROPIEDADES:');
        console.log('---------------------------');
        
        properties.slice(0, 3).forEach((prop: any, index: number) => {
          console.log(`${index + 1}. ${prop.title}`);
          console.log(`   💰 Precio: $${prop.price?.toLocaleString()}`);
          console.log(`   📍 Ubicación: ${prop.location?.address || prop.location?.neighborhood || 'No especificada'}`);
          console.log(`   🏠 Habitaciones: ${prop.rooms}`);
          console.log(`   📐 Área: ${prop.area} m²`);
          console.log(`   🔗 Fuente: ${prop.source}`);
          console.log('');
        });
      }

      // Mostrar resumen por fuente
      const sourceBreakdown: Record<string, number> = {};
      properties.forEach((prop: any) => {
        sourceBreakdown[prop.source] = (sourceBreakdown[prop.source] || 0) + 1;
      });

      console.log('📈 RESUMEN POR FUENTE:');
      console.log('----------------------');
      Object.entries(sourceBreakdown).forEach(([source, count]) => {
        console.log(`   ${source}: ${count} propiedades`);
      });

    } else {
      console.log('❌ Error en la respuesta:', response.data.error);
    }

  } catch (error: any) {
    console.log('❌ ERROR EN LA BÚSQUEDA:');
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Error: ${error.response.data?.error || 'Error desconocido'}`);
    } else {
      console.log(`   Error: ${error.message}`);
    }
  }
}

// Ejecutar la prueba
testSimpleFrontendSearch().catch(console.error);
