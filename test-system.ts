#!/usr/bin/env ts-node

/**
 * 🚀 TEST SISTEMA COMPLETO - OPTIMIZADO Y DINÁMICO
 * Prueba el sistema completo con búsqueda inteligente
 */

import { SearchService } from './core/services/SearchService';
import { SearchCriteria } from './core/types';
import { logger } from './utils/logger';

async function testCompleteSystem() {
  console.log('\n🚀 TESTING SISTEMA COMPLETO AI ARRIENDO');
  console.log('='.repeat(60));
  
  const searchService = new SearchService();
  
  // 🎯 TEST 1: BÚSQUEDA INTELIGENTE - USAQUÉN
  console.log('\n🔍 TEST 1: Búsqueda en Usaquén');
  console.log('-'.repeat(40));
  
  const usaquenCriteria: SearchCriteria = {
    hardRequirements: {
      minRooms: 1,
      minArea: 30,
      maxTotalPrice: 5000000,
      allowAdminOverage: true,
      location: {
        city: 'Bogotá',
        neighborhoods: ['Usaquén']
      }
    },
    preferences: {
      wetAreas: [],
      sports: [],
      amenities: [],
      weights: {
        wetAreas: 0.1,
        sports: 0.1,
        amenities: 0.2,
        location: 0.3,
        pricePerM2: 0.3
      }
    },
    optionalFilters: {}
  };

  try {
    const usaquenResults = await searchService.search(usaquenCriteria, 1, 10);
    console.log(`✅ Usaquén: ${usaquenResults.properties.length} propiedades encontradas`);
    console.log(`   Total disponible: ${usaquenResults.total}`);
    console.log(`   Tiempo: ${usaquenResults.executionTime}ms`);
  } catch (error) {
    console.log(`❌ Usaquén: Error - ${error}`);
  }

  // 🎯 TEST 2: BÚSQUEDA INTELIGENTE - SUBA
  console.log('\n🔍 TEST 2: Búsqueda en Suba');
  console.log('-'.repeat(40));
  
  const subaCriteria: SearchCriteria = {
    ...usaquenCriteria,
    hardRequirements: {
      ...usaquenCriteria.hardRequirements,
      location: {
        city: 'Bogotá',
        neighborhoods: ['Suba']
      }
    }
  };

  try {
    const subaResults = await searchService.search(subaCriteria, 1, 10);
    console.log(`✅ Suba: ${subaResults.properties.length} propiedades encontradas`);
    console.log(`   Total disponible: ${subaResults.total}`);
    console.log(`   Tiempo: ${subaResults.executionTime}ms`);
  } catch (error) {
    console.log(`❌ Suba: Error - ${error}`);
  }

  // 🎯 TEST 3: BÚSQUEDA INTELIGENTE - CHAPINERO
  console.log('\n🔍 TEST 3: Búsqueda en Chapinero');
  console.log('-'.repeat(40));
  
  const chapineroCriteria: SearchCriteria = {
    ...usaquenCriteria,
    hardRequirements: {
      ...usaquenCriteria.hardRequirements,
      location: {
        city: 'Bogotá',
        neighborhoods: ['Chapinero']
      }
    }
  };

  try {
    const chapineroResults = await searchService.search(chapineroCriteria, 1, 10);
    console.log(`✅ Chapinero: ${chapineroResults.properties.length} propiedades encontradas`);
    console.log(`   Total disponible: ${chapineroResults.total}`);
    console.log(`   Tiempo: ${chapineroResults.executionTime}ms`);
  } catch (error) {
    console.log(`❌ Chapinero: Error - ${error}`);
  }

  console.log('\n🎉 TEST COMPLETADO');
  console.log('='.repeat(60));
}

// Ejecutar test
testCompleteSystem().catch(console.error);
