#!/usr/bin/env node

/**
 * ACTIVAR TODOS LOS SCRAPERS UNO POR UNO - NO PARAR HASTA LOGRARLO
 */

const axios = require('axios');

const API_BASE_URL = 'https://aiarriendo.up.railway.app/api';

// Los 8 proveedores que DEBEN funcionar
const ALL_PROVIDERS = [
  'Fincaraiz',
  'Metrocuadrado', 
  'Trovit',
  'Arriendo.com',
  'Ciencuadras',
  'MercadoLibre',
  'Rentola',
  'Properati'
];

// Criterios mínimos absolutos
function createMinimalCriteria(location = 'Bogotá') {
  return {
    operation: 'arriendo',
    propertyTypes: ['Apartamento'],
    location: {
      neighborhoods: [location]
    },
    minRooms: 1,
    maxRooms: 10,
    minBathrooms: 1,
    maxBathrooms: 10,
    minParking: 0,
    maxParking: 10,
    minArea: 1,
    maxArea: 2000,
    minPrice: 1,
    maxPrice: 100000000, // 100 millones - súper amplio
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

async function testSingleProvider(location) {
  const criteria = createMinimalCriteria(location);
  
  try {
    console.log(`🔍 Probando: ${location}`);
    
    const response = await axios.post(`${API_BASE_URL}/search`, {
      criteria,
      page: 1,
      limit: 200
    }, {
      timeout: 180000,
      headers: { 'Content-Type': 'application/json' }
    });

    if (response.data.success) {
      const { data } = response.data;
      const { properties, total } = data;

      const sourceStats = {};
      properties.forEach(property => {
        const source = property.source || 'Sin fuente';
        sourceStats[source] = (sourceStats[source] || 0) + 1;
      });

      const activeSources = Object.keys(sourceStats);
      const inactiveSources = ALL_PROVIDERS.filter(p => !activeSources.includes(p));

      console.log(`   ✅ ${total} propiedades`);
      console.log(`   🏢 ACTIVOS (${activeSources.length}/8): ${activeSources.join(', ')}`);
      if (inactiveSources.length > 0) {
        console.log(`   ❌ INACTIVOS (${inactiveSources.length}/8): ${inactiveSources.join(', ')}`);
      }

      return {
        location,
        total,
        activeSources,
        inactiveSources,
        sourceStats,
        success: true
      };
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return {
      location,
      total: 0,
      activeSources: [],
      inactiveSources: ALL_PROVIDERS,
      sourceStats: {},
      success: false,
      error: error.message
    };
  }
}

async function findBestLocationForAllProviders() {
  console.log('🚀 ACTIVANDO TODOS LOS PROVEEDORES - NO PARAR HASTA LOGRARLO');
  console.log('═'.repeat(80));
  
  // Ubicaciones a probar (de más específica a más general)
  const locations = [
    'Bogotá',
    'Chapinero', 
    'Usaquén',
    'Zona Rosa',
    'Centro',
    'Suba',
    'Medellín',
    'Cali',
    'Barranquilla',
    'Cartagena',
    'Bucaramanga',
    'Pereira',
    'Manizales',
    'Ibagué',
    'Pasto',
    'Cúcuta'
  ];

  let bestResult = { activeSources: [], total: 0 };
  const allResults = [];

  for (const location of locations) {
    const result = await testSingleProvider(location);
    allResults.push(result);

    if (result.activeSources.length > bestResult.activeSources.length) {
      bestResult = result;
    }

    // Si encontramos todos los proveedores, parar
    if (result.activeSources.length === ALL_PROVIDERS.length) {
      console.log('');
      console.log('🎉 ¡TODOS LOS PROVEEDORES ACTIVADOS!');
      console.log(`📍 Ubicación ganadora: ${location}`);
      console.log(`📈 Total propiedades: ${result.total}`);
      console.log(`🏢 Todos activos: ${result.activeSources.join(', ')}`);
      return result;
    }

    // Pausa entre pruebas
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('');
  console.log('📊 RESUMEN FINAL');
  console.log('═'.repeat(50));
  console.log(`🏆 MEJOR RESULTADO: ${bestResult.location}`);
  console.log(`📈 ${bestResult.total} propiedades`);
  console.log(`✅ ACTIVOS (${bestResult.activeSources.length}/8): ${bestResult.activeSources.join(', ')}`);
  console.log(`❌ FALTAN (${bestResult.inactiveSources.length}/8): ${bestResult.inactiveSources.join(', ')}`);
  console.log('');

  // Mostrar estadísticas detalladas del mejor resultado
  if (bestResult.sourceStats) {
    console.log('📊 ESTADÍSTICAS DETALLADAS:');
    Object.entries(bestResult.sourceStats)
      .sort(([,a], [,b]) => b - a)
      .forEach(([source, count]) => {
        console.log(`   ${source}: ${count} propiedades`);
      });
  }

  console.log('');
  console.log('🔧 PRÓXIMOS PASOS PARA ACTIVAR LOS FALTANTES:');
  bestResult.inactiveSources.forEach(provider => {
    console.log(`   ❌ ${provider}: Revisar selectores, URLs, headers`);
  });

  return bestResult;
}

// Ejecutar
findBestLocationForAllProviders();
