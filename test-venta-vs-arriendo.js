/**
 * 🧪 TEST: Verificar si el SearchController funciona con "venta" vs "arriendo"
 * 
 * Este test compara los resultados de búsqueda entre:
 * - operation: "arriendo" 
 * - operation: "venta"
 * 
 * Para analizar si realmente salen resultados diferentes
 */

const axios = require('axios');

// Configuración del test
const BASE_URL = 'http://localhost:8080';
const API_ENDPOINT = `${BASE_URL}/api/search`;

// Criterios de búsqueda base (idénticos excepto por operation)
const BASE_CRITERIA = {
  location: 'Chapinero', // Zona con muchas propiedades
  propertyTypes: ['Apartamento'],
  minRooms: 1,
  maxRooms: 5,
  minPrice: 500000,
  maxPrice: 10000000,
  minArea: 30,
  maxArea: 200
};

/**
 * Función para hacer búsqueda con criterios específicos
 */
async function searchProperties(operation) {
  try {
    console.log(`\n🔍 Buscando propiedades con operation: "${operation}"`);
    
    const criteria = {
      ...BASE_CRITERIA,
      operation: operation
    };
    
    const response = await axios.post(API_ENDPOINT, {
      criteria: criteria,
      page: 1,
      limit: 100
    });
    
    if (response.data.success) {
      const data = response.data.data;
      return {
        success: true,
        total: data.total || 0,
        properties: data.properties || [],
        summary: data.summary || {},
        operation: operation
      };
    } else {
      return {
        success: false,
        error: response.data.error || 'Unknown error',
        operation: operation
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      operation: operation
    };
  }
}

/**
 * Analizar y comparar resultados
 */
function analyzeResults(arriendoResult, ventaResult) {
  console.log('\n📊 ANÁLISIS DE RESULTADOS:');
  console.log('=' .repeat(50));
  
  // Resultados de ARRIENDO
  console.log(`\n🏠 ARRIENDO:`);
  if (arriendoResult.success) {
    console.log(`   ✅ Total encontradas: ${arriendoResult.total}`);
    console.log(`   📋 Propiedades devueltas: ${arriendoResult.properties.length}`);
    
    if (arriendoResult.properties.length > 0) {
      const firstProperty = arriendoResult.properties[0];
      console.log(`   🏷️  Primera propiedad: ${firstProperty.title || 'Sin título'}`);
      console.log(`   💰 Precio: $${firstProperty.price?.toLocaleString() || 'N/A'}`);
      console.log(`   📍 Ubicación: ${firstProperty.location || 'N/A'}`);
    }
    
    if (arriendoResult.summary) {
      console.log(`   📈 Precio promedio: $${arriendoResult.summary.averagePrice?.toLocaleString() || 'N/A'}`);
      console.log(`   🏢 Fuentes: ${Object.keys(arriendoResult.summary.sourceBreakdown || {}).join(', ')}`);
    }
  } else {
    console.log(`   ❌ Error: ${arriendoResult.error}`);
  }
  
  // Resultados de VENTA
  console.log(`\n🏪 VENTA:`);
  if (ventaResult.success) {
    console.log(`   ✅ Total encontradas: ${ventaResult.total}`);
    console.log(`   📋 Propiedades devueltas: ${ventaResult.properties.length}`);
    
    if (ventaResult.properties.length > 0) {
      const firstProperty = ventaResult.properties[0];
      console.log(`   🏷️  Primera propiedad: ${firstProperty.title || 'Sin título'}`);
      console.log(`   💰 Precio: $${firstProperty.price?.toLocaleString() || 'N/A'}`);
      console.log(`   📍 Ubicación: ${firstProperty.location || 'N/A'}`);
    }
    
    if (ventaResult.summary) {
      console.log(`   📈 Precio promedio: $${ventaResult.summary.averagePrice?.toLocaleString() || 'N/A'}`);
      console.log(`   🏢 Fuentes: ${Object.keys(ventaResult.summary.sourceBreakdown || {}).join(', ')}`);
    }
  } else {
    console.log(`   ❌ Error: ${ventaResult.error}`);
  }
  
  // COMPARACIÓN
  console.log(`\n🔄 COMPARACIÓN:`);
  console.log('=' .repeat(30));
  
  if (arriendoResult.success && ventaResult.success) {
    console.log(`📊 Arriendo: ${arriendoResult.total} vs Venta: ${ventaResult.total}`);
    
    if (arriendoResult.total === ventaResult.total) {
      console.log('⚠️  MISMO NÚMERO DE RESULTADOS - Posible problema');
    } else {
      console.log('✅ NÚMEROS DIFERENTES - Sistema funciona correctamente');
    }
    
    // Comparar precios promedio
    const arriendoAvg = arriendoResult.summary?.averagePrice || 0;
    const ventaAvg = ventaResult.summary?.averagePrice || 0;
    
    if (arriendoAvg > 0 && ventaAvg > 0) {
      const ratio = ventaAvg / arriendoAvg;
      console.log(`💰 Ratio precio venta/arriendo: ${ratio.toFixed(2)}x`);
      
      if (ratio > 50) {
        console.log('✅ Precios de venta son mucho mayores (normal)');
      } else if (ratio < 10) {
        console.log('⚠️  Precios muy similares - Revisar');
      }
    }
    
    // Comparar fuentes
    const arriendoSources = Object.keys(arriendoResult.summary?.sourceBreakdown || {});
    const ventaSources = Object.keys(ventaResult.summary?.sourceBreakdown || {});
    
    console.log(`🏢 Fuentes arriendo: ${arriendoSources.length}`);
    console.log(`🏢 Fuentes venta: ${ventaSources.length}`);
    
  } else {
    console.log('❌ No se pueden comparar - Uno o ambos fallaron');
  }
}

/**
 * Ejecutar el test principal
 */
async function runTest() {
  console.log('🧪 INICIANDO TEST: VENTA vs ARRIENDO');
  console.log('=' .repeat(50));
  console.log(`🎯 Ubicación de prueba: ${BASE_CRITERIA.location}`);
  console.log(`🏠 Tipo de propiedad: ${BASE_CRITERIA.propertyTypes.join(', ')}`);
  console.log(`💰 Rango de precio: $${BASE_CRITERIA.minPrice.toLocaleString()} - $${BASE_CRITERIA.maxPrice.toLocaleString()}`);
  
  try {
    // Ejecutar ambas búsquedas en paralelo
    const [arriendoResult, ventaResult] = await Promise.all([
      searchProperties('arriendo'),
      searchProperties('venta')
    ]);
    
    // Analizar resultados
    analyzeResults(arriendoResult, ventaResult);
    
    // Conclusión final
    console.log('\n🎯 CONCLUSIÓN:');
    console.log('=' .repeat(20));
    
    if (arriendoResult.success && ventaResult.success) {
      if (arriendoResult.total !== ventaResult.total) {
        console.log('✅ El sistema SÍ diferencia entre arriendo y venta');
        console.log('✅ Los scrapers están funcionando correctamente');
      } else {
        console.log('⚠️  El sistema NO diferencia entre arriendo y venta');
        console.log('⚠️  Posible problema en los scrapers o criterios');
      }
    } else {
      console.log('❌ Test incompleto - Revisar errores arriba');
    }
    
  } catch (error) {
    console.error('❌ Error ejecutando test:', error.message);
  }
}

// Ejecutar el test
if (require.main === module) {
  runTest();
}

module.exports = { runTest, searchProperties, analyzeResults };
