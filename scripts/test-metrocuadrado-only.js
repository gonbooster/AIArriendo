#!/usr/bin/env node

/**
 * ACTIVAR SOLO METROCUADRADO - CRITERIOS MÍNIMOS
 */

const axios = require('axios');

const API_BASE_URL = 'https://aiarriendo.up.railway.app/api';

// Criterios SÚPER mínimos para Metrocuadrado
function createMinimalCriteria(location = 'Bogotá', rooms = 1) {
  return {
    operation: 'arriendo',
    propertyTypes: ['Apartamento'],
    location: {
      neighborhoods: [location]
    },
    minRooms: rooms,
    maxRooms: rooms + 2,
    minBathrooms: 1,
    maxBathrooms: 10,
    minParking: 0,
    maxParking: 10,
    minArea: 1,
    maxArea: 5000,
    minPrice: 1,
    maxPrice: 200000000, // 200 millones - SÚPER amplio
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

async function testMetrocuadradoOnly(location, rooms) {
  const criteria = createMinimalCriteria(location, rooms);
  
  console.log(`🔍 METROCUADRADO: ${location} - ${rooms} habitaciones`);
  console.log(`📋 Criterios: arriendo, apartamento, ${location}, ${rooms} hab`);
  
  try {
    const startTime = Date.now();
    
    const response = await axios.post(`${API_BASE_URL}/search`, {
      criteria,
      page: 1,
      limit: 50
    }, {
      timeout: 180000,
      headers: { 'Content-Type': 'application/json' }
    });

    const endTime = Date.now();
    const executionTime = (endTime - startTime) / 1000;

    if (response.data.success) {
      const { data } = response.data;
      const { properties, total } = data;

      const sourceStats = {};
      properties.forEach(property => {
        const source = property.source || 'Sin fuente';
        sourceStats[source] = (sourceStats[source] || 0) + 1;
      });

      const metrocuadradoCount = sourceStats['Metrocuadrado'] || 0;
      const otherSources = Object.keys(sourceStats).filter(s => s !== 'Metrocuadrado');

      console.log(`   ⏱️  ${executionTime.toFixed(1)}s`);
      console.log(`   📈 Total: ${total} propiedades`);
      
      if (metrocuadradoCount > 0) {
        console.log(`   🎉 ¡METROCUADRADO FUNCIONA! ${metrocuadradoCount} propiedades`);
      } else {
        console.log(`   ❌ Metrocuadrado: 0 propiedades`);
      }
      
      if (otherSources.length > 0) {
        console.log(`   📊 Otros activos: ${otherSources.join(', ')}`);
        Object.entries(sourceStats).forEach(([source, count]) => {
          if (source !== 'Metrocuadrado') {
            console.log(`      ${source}: ${count}`);
          }
        });
      }

      return {
        location,
        rooms,
        total,
        metrocuadradoCount,
        otherSources,
        executionTime,
        success: true
      };
    } else {
      console.log(`   ❌ Error: ${response.data.error || 'Unknown error'}`);
      return { location, rooms, metrocuadradoCount: 0, success: false };
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return { location, rooms, metrocuadradoCount: 0, success: false, error: error.message };
  }
}

async function findMetrocuadradoWorkingCombination() {
  console.log('🎯 ACTIVANDO METROCUADRADO - CRITERIOS MÍNIMOS');
  console.log('═'.repeat(60));
  
  // Combinaciones a probar
  const combinations = [
    { location: 'Bogotá', rooms: 1 },
    { location: 'Bogotá', rooms: 2 },
    { location: 'Bogotá', rooms: 3 },
    { location: 'Chapinero', rooms: 1 },
    { location: 'Chapinero', rooms: 2 },
    { location: 'Usaquén', rooms: 1 },
    { location: 'Usaquén', rooms: 2 },
    { location: 'Zona Rosa', rooms: 1 },
    { location: 'Centro', rooms: 1 },
    { location: 'Suba', rooms: 1 },
    { location: 'Suba', rooms: 2 }
  ];

  let bestResult = { metrocuadradoCount: 0 };
  const workingCombinations = [];

  for (const combo of combinations) {
    const result = await testMetrocuadradoOnly(combo.location, combo.rooms);
    
    if (result.metrocuadradoCount > 0) {
      workingCombinations.push(result);
      if (result.metrocuadradoCount > bestResult.metrocuadradoCount) {
        bestResult = result;
      }
    }

    // Pausa entre pruebas
    await new Promise(resolve => setTimeout(resolve, 3000));
    console.log('');
  }

  console.log('📊 RESUMEN METROCUADRADO');
  console.log('═'.repeat(40));
  
  if (workingCombinations.length > 0) {
    console.log(`🎉 ¡METROCUADRADO FUNCIONA!`);
    console.log(`✅ Combinaciones exitosas: ${workingCombinations.length}`);
    console.log('');
    
    console.log('🏆 MEJORES RESULTADOS:');
    workingCombinations
      .sort((a, b) => b.metrocuadradoCount - a.metrocuadradoCount)
      .slice(0, 3)
      .forEach((result, i) => {
        console.log(`   ${i+1}. ${result.location} - ${result.rooms} hab: ${result.metrocuadradoCount} propiedades`);
      });
    
    console.log('');
    console.log(`🌐 Prueba en web: https://aiarriendo.up.railway.app`);
    console.log(`   Usa: arriendo + ${bestResult.location} + apartamento`);
    
  } else {
    console.log(`❌ METROCUADRADO NO FUNCIONA con ninguna combinación`);
    console.log('');
    console.log('🔧 NECESITA REPARACIÓN:');
    console.log('   - Verificar headless browser');
    console.log('   - Actualizar selectores');
    console.log('   - Revisar URLs');
    console.log('   - Verificar headers anti-bot');
  }

  return bestResult;
}

// Ejecutar
findMetrocuadradoWorkingCombination();
