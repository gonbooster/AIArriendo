#!/usr/bin/env node

/**
 * Script para probar la búsqueda con todos los proveedores activos
 * Uso: node scripts/test-search.js
 */

const axios = require('axios');

// Configuración
const API_BASE_URL = process.env.API_URL || 'https://aiarriendo.up.railway.app/api';

// Múltiples combinaciones de prueba
const TEST_COMBINATIONS = [
  { location: 'Bogotá', operation: 'arriendo' },
  { location: 'Chapinero', operation: 'arriendo' },
  { location: 'Zona Rosa', operation: 'arriendo' },
  { location: 'Centro', operation: 'arriendo' },
  { location: 'Medellín', operation: 'arriendo' },
  { location: 'Bogotá', operation: 'venta' },
  { location: 'Usaquén', operation: 'venta' },
  { location: 'Suba', operation: 'arriendo' }
];

// Función para crear criterios de búsqueda
function createSearchCriteria(location, operation) {
  return {
    operation: operation,
    propertyTypes: ['Apartamento', 'Casa', 'Apartaestudio', 'Loft', 'Penthouse'],
    location: {
      neighborhoods: [location]
    },
    // Valores amplios para obtener todos los resultados posibles
    minRooms: 1,
    maxRooms: 10,
    minBathrooms: 1,
    maxBathrooms: 10,
    minParking: 0,
    maxParking: 10,
    minArea: 1,
    maxArea: 1000,
    minPrice: 1,
    maxPrice: 50000000,
    allowAdminOverage: true,
    minStratum: 1,
    maxStratum: 6,
    preferences: {
      wetAreas: [],
      sports: [],
      amenities: []
    }
  };
}

async function testSingleSearch(location, operation) {
  const searchCriteria = createSearchCriteria(location, operation);

  console.log(`🔍 Probando: ${operation} en ${location}`);
  console.log('─'.repeat(50));

  try {
    const startTime = Date.now();

    const response = await axios.post(`${API_BASE_URL}/search`, {
      criteria: searchCriteria,
      page: 1,
      limit: 200
    }, {
      timeout: 180000, // 3 minutos de timeout
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const endTime = Date.now();
    const executionTime = (endTime - startTime) / 1000;

    if (response.data.success) {
      const { data } = response.data;
      const { properties, total } = data;

      // Estadísticas por fuente
      const sourceStats = {};
      properties.forEach(property => {
        const source = property.source || 'Sin fuente';
        sourceStats[source] = (sourceStats[source] || 0) + 1;
      });

      console.log(`✅ ${total} propiedades (${executionTime.toFixed(1)}s)`);

      if (Object.keys(sourceStats).length > 0) {
        const sources = Object.entries(sourceStats)
          .sort(([,a], [,b]) => b - a)
          .map(([source, count]) => `${source}:${count}`)
          .join(', ');
        console.log(`   📊 ${sources}`);
      }

      return { location, operation, total, sources: Object.keys(sourceStats), executionTime };
    } else {
      console.log(`❌ Error: ${response.data.error || 'Unknown error'}`);
      return { location, operation, total: 0, sources: [], executionTime, error: response.data.error };
    }



  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    return { location, operation, total: 0, sources: [], executionTime: 0, error: error.message };
  }
}

async function testAllCombinations() {
  console.log('🚀 PROBANDO MÚLTIPLES COMBINACIONES PARA ACTIVAR TODOS LOS PROVEEDORES');
  console.log('═'.repeat(80));
  console.log(`🌐 API URL: ${API_BASE_URL}`);
  console.log('');

  const results = [];
  const allSources = new Set();

  for (const combo of TEST_COMBINATIONS) {
    const result = await testSingleSearch(combo.location, combo.operation);
    results.push(result);
    result.sources.forEach(source => allSources.add(source));

    // Pequeña pausa entre búsquedas
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('');
  console.log('📊 RESUMEN FINAL');
  console.log('═'.repeat(50));
  console.log(`🏢 Proveedores activos encontrados: ${allSources.size}`);
  console.log(`📋 Proveedores: ${Array.from(allSources).join(', ')}`);
  console.log('');

  // Mostrar la mejor combinación
  const bestResult = results.reduce((best, current) =>
    current.total > best.total ? current : best
  );

  console.log('🏆 MEJOR COMBINACIÓN ENCONTRADA:');
  console.log(`📍 ${bestResult.operation} en ${bestResult.location}`);
  console.log(`📈 ${bestResult.total} propiedades`);
  console.log(`🏢 Proveedores: ${bestResult.sources.join(', ')}`);
  console.log('');

  // Mostrar todas las combinaciones que dieron resultados
  console.log('✅ COMBINACIONES CON RESULTADOS:');
  results
    .filter(r => r.total > 0)
    .sort((a, b) => b.total - a.total)
    .forEach(r => {
      console.log(`   ${r.operation} en ${r.location}: ${r.total} propiedades (${r.sources.length} proveedores)`);
    });

  console.log('');
  console.log(`🌐 Prueba la mejor combinación en: https://aiarriendo.up.railway.app`);
  console.log(`   Selecciona: "${bestResult.operation}" + "${bestResult.location}"`);
}

// Ejecutar todas las pruebas
testAllCombinations();
