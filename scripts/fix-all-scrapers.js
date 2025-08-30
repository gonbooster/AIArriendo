#!/usr/bin/env node

/**
 * Script para diagnosticar y reparar TODOS los scrapers inactivos
 * Uso: node scripts/fix-all-scrapers.js
 */

const axios = require('axios');

// Configuración
const API_BASE_URL = process.env.API_URL || 'https://aiarriendo.up.railway.app/api';

// Proveedores que necesitamos activar
const INACTIVE_PROVIDERS = [
  'Metrocuadrado',
  'Arriendo.com', 
  'MercadoLibre',
  'Rentola'
];

// Múltiples combinaciones de prueba para cada proveedor
const TEST_COMBINATIONS = [
  { location: 'Bogotá', operation: 'arriendo' },
  { location: 'Chapinero', operation: 'arriendo' },
  { location: 'Zona Rosa', operation: 'arriendo' },
  { location: 'Centro', operation: 'arriendo' },
  { location: 'Medellín', operation: 'arriendo' },
  { location: 'Suba', operation: 'arriendo' },
  { location: 'Usaquén', operation: 'arriendo' },
  { location: 'Bogotá', operation: 'venta' }
];

function createSearchCriteria(location, operation) {
  return {
    operation: operation,
    propertyTypes: ['Apartamento', 'Casa', 'Apartaestudio', 'Loft', 'Penthouse'],
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

async function testSingleCombination(location, operation) {
  const searchCriteria = createSearchCriteria(location, operation);
  
  try {
    const startTime = Date.now();
    
    const response = await axios.post(`${API_BASE_URL}/search`, {
      criteria: searchCriteria,
      page: 1,
      limit: 200
    }, {
      timeout: 180000,
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

      return { 
        location, 
        operation, 
        total, 
        sources: Object.keys(sourceStats), 
        sourceStats,
        executionTime,
        success: true 
      };
    } else {
      return { 
        location, 
        operation, 
        total: 0, 
        sources: [], 
        sourceStats: {},
        executionTime, 
        error: response.data.error,
        success: false 
      };
    }
  } catch (error) {
    return { 
      location, 
      operation, 
      total: 0, 
      sources: [], 
      sourceStats: {},
      executionTime: 0, 
      error: error.message,
      success: false 
    };
  }
}

async function findWorkingCombinations() {
  console.log('🔍 BUSCANDO COMBINACIONES QUE ACTIVEN TODOS LOS PROVEEDORES');
  console.log('═'.repeat(80));
  console.log(`🌐 API URL: ${API_BASE_URL}`);
  console.log(`🎯 Objetivo: Activar ${INACTIVE_PROVIDERS.join(', ')}`);
  console.log('');

  const results = [];
  const allFoundSources = new Set();
  const inactiveFound = new Set();

  for (let i = 0; i < TEST_COMBINATIONS.length; i++) {
    const combo = TEST_COMBINATIONS[i];
    console.log(`🔍 [${i+1}/${TEST_COMBINATIONS.length}] Probando: ${combo.operation} en ${combo.location}`);
    
    const result = await testSingleCombination(combo.location, combo.operation);
    results.push(result);
    
    // Agregar fuentes encontradas
    result.sources.forEach(source => {
      allFoundSources.add(source);
      if (INACTIVE_PROVIDERS.includes(source)) {
        inactiveFound.add(source);
      }
    });

    // Mostrar resultado inmediato
    if (result.success && result.total > 0) {
      const sources = Object.entries(result.sourceStats)
        .map(([source, count]) => `${source}:${count}`)
        .join(', ');
      console.log(`   ✅ ${result.total} propiedades (${result.executionTime.toFixed(1)}s) - ${sources}`);
      
      // Marcar si encontramos algún proveedor inactivo
      const foundInactive = result.sources.filter(s => INACTIVE_PROVIDERS.includes(s));
      if (foundInactive.length > 0) {
        console.log(`   🎉 ¡ACTIVADO! ${foundInactive.join(', ')}`);
      }
    } else {
      console.log(`   ❌ ${result.error || 'Sin resultados'}`);
    }
    
    // Pausa entre búsquedas
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('');
  console.log('📊 ANÁLISIS FINAL');
  console.log('═'.repeat(50));
  
  console.log(`🏢 Total de proveedores encontrados: ${allFoundSources.size}`);
  console.log(`📋 Proveedores activos: ${Array.from(allFoundSources).join(', ')}`);
  console.log('');
  
  console.log(`🎯 Proveedores objetivo activados: ${inactiveFound.size}/${INACTIVE_PROVIDERS.length}`);
  console.log(`✅ Activados: ${Array.from(inactiveFound).join(', ') || 'Ninguno'}`);
  console.log(`❌ Aún inactivos: ${INACTIVE_PROVIDERS.filter(p => !inactiveFound.has(p)).join(', ') || 'Ninguno'}`);
  console.log('');

  // Encontrar la mejor combinación
  const bestResult = results
    .filter(r => r.success && r.total > 0)
    .reduce((best, current) => {
      const currentInactive = current.sources.filter(s => INACTIVE_PROVIDERS.includes(s)).length;
      const bestInactive = best.sources.filter(s => INACTIVE_PROVIDERS.includes(s)).length;
      
      if (currentInactive > bestInactive) return current;
      if (currentInactive === bestInactive && current.total > best.total) return current;
      return best;
    }, { total: 0, sources: [] });

  if (bestResult.total > 0) {
    console.log('🏆 MEJOR COMBINACIÓN ENCONTRADA:');
    console.log(`📍 ${bestResult.operation} en ${bestResult.location}`);
    console.log(`📈 ${bestResult.total} propiedades`);
    console.log(`🏢 Proveedores: ${bestResult.sources.join(', ')}`);
    console.log('');
    
    Object.entries(bestResult.sourceStats).forEach(([source, count]) => {
      const status = INACTIVE_PROVIDERS.includes(source) ? '🎉 ACTIVADO' : '✅ Activo';
      console.log(`   ${source}: ${count} propiedades ${status}`);
    });
  }

  console.log('');
  console.log('🔧 RECOMENDACIONES:');
  
  if (inactiveFound.size === INACTIVE_PROVIDERS.length) {
    console.log('🎉 ¡TODOS LOS PROVEEDORES ESTÁN FUNCIONANDO!');
    console.log(`🌐 Usa la mejor combinación en: ${API_BASE_URL.replace('/api', '')}`);
  } else {
    const stillInactive = INACTIVE_PROVIDERS.filter(p => !inactiveFound.has(p));
    console.log(`❌ Proveedores que necesitan reparación: ${stillInactive.join(', ')}`);
    console.log('💡 Posibles problemas:');
    console.log('   - Selectores desactualizados');
    console.log('   - URLs incorrectas');
    console.log('   - Detección de bots');
    console.log('   - Rate limiting muy agresivo');
    console.log('   - Cambios en la estructura del sitio');
  }
}

// Ejecutar el análisis
findWorkingCombinations();
