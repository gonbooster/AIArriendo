#!/usr/bin/env ts-node

/**
 * SCRIPT DE PRUEBA PARA BÚSQUEDA DINÁMICA
 *
 * Prueba si la búsqueda funciona con diferentes ciudades y ubicaciones
 */

import { LocationDetector } from '../core/utils/LocationDetector';
import { logger } from '../utils/logger';

async function testLocationDetection() {
  console.log('\n🧪 INICIANDO PRUEBAS DE DETECCIÓN DE UBICACIÓN');
  console.log('='.repeat(60));

  // Ubicaciones de prueba
  const testLocations = [
    'Usaquén',
    'Medellín',
    'Cali',
    'Bucaramanga',
    'Chapinero',
    'Zona Rosa',
    'Suba',
    'Barranquilla',
    'El Poblado',
    'Granada Cali',
    'Medellín El Poblado',
    'Bogotá Usaquén'
  ];

  for (const location of testLocations) {
    console.log(`\n🔍 PROBANDO UBICACIÓN: "${location}"`);
    console.log('-'.repeat(40));

    try {
      const locationInfo = LocationDetector.detectLocation(location);

      console.log(`🎯 Ciudad detectada: ${locationInfo.city}`);
      console.log(`🏘️  Barrio detectado: ${locationInfo.neighborhood || 'N/A'}`);
      console.log(`📊 Confianza: ${(locationInfo.confidence * 100).toFixed(1)}%`);
      console.log(`🔗 Código ciudad: ${locationInfo.cityCode || 'N/A'}`);

      if (locationInfo.confidence > 0.7) {
        console.log(`✅ DETECCIÓN EXITOSA`);
      } else if (locationInfo.confidence > 0.3) {
        console.log(`⚠️  DETECCIÓN PARCIAL`);
      } else {
        console.log(`❌ DETECCIÓN FALLIDA`);
      }

    } catch (error) {
      console.log(`💥 ERROR para "${location}": ${(error as Error).message}`);
    }
  }

  console.log('\n🏁 PRUEBAS COMPLETADAS');
  console.log('='.repeat(60));
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  testLocationDetection().catch(console.error);
}

export { testLocationDetection };
