#!/usr/bin/env ts-node

/**
 * SCRIPT DE PRUEBA PARA CONTAR PROPIEDADES POR UBICACIÓN
 * 
 * Prueba cuántas propiedades encuentra en cada ubicación específica
 */

import { SearchService } from '../core/services/SearchService';
import { SearchCriteria } from '../core/types';
import { LocationDetector } from '../core/utils/LocationDetector';

async function testLocationCounts() {
  console.log('\n🧪 PROBANDO CONTEO DE PROPIEDADES POR UBICACIÓN');
  console.log('='.repeat(70));

  const searchService = new SearchService();

  // Ubicaciones específicas de prueba
  const testLocations = [
    'Usaquén',
    'Medellín', 
    'El Poblado',
    'Cali Granada',
    'Bucaramanga'
  ];

  for (const location of testLocations) {
    console.log(`\n🔍 PROBANDO: "${location}"`);
    console.log('-'.repeat(50));

    try {
      // Primero mostrar la detección
      const locationInfo = LocationDetector.detectLocation(location);
      console.log(`🎯 Detectado: ${locationInfo.city} ${locationInfo.neighborhood || ''}`);
      console.log(`📊 Confianza: ${(locationInfo.confidence * 100).toFixed(1)}%`);

      // Criterios de búsqueda básicos
      const criteria: SearchCriteria = {
        hardRequirements: {
          operation: 'arriendo',
          propertyTypes: ['Apartamento'],
          minRooms: 1,
          maxRooms: 10,
          minBathrooms: 1,
          maxBathrooms: 10,
          minParking: 0,
          maxParking: 10,
          minArea: 1,
          maxArea: 1000,
          minTotalPrice: 100000,
          maxTotalPrice: 50000000,
          allowAdminOverage: true,
          minStratum: 1,
          maxStratum: 6,
          location: {
            city: '', // Dinámico
            neighborhoods: [location], // Usar la ubicación de prueba
            zones: []
          }
        },
        preferences: {
          wetAreas: [],
          sports: [],
          amenities: [],
          weights: {
            wetAreas: 0,
            sports: 0,
            amenities: 0,
            location: 1.0, // Priorizar ubicación
            pricePerM2: 0.5
          }
        },
        optionalFilters: {}
      };

      const startTime = Date.now();
      // Aumentar límite para ver más resultados
      const result = await searchService.search(criteria, 1, 1000);
      const duration = Date.now() - startTime;

      console.log(`⏱️  Tiempo: ${duration}ms`);
      console.log(`📊 TOTAL ENCONTRADAS: ${result.properties.length} propiedades`);

      if (result.properties.length > 0) {
        console.log(`✅ ÉXITO - Propiedades encontradas para "${location}"`);
        
        // Mostrar algunas propiedades de ejemplo
        const sample = result.properties.slice(0, 2);
        sample.forEach((prop, index) => {
          console.log(`   ${index + 1}. ${prop.title.substring(0, 60)}...`);
          console.log(`      📍 ${prop.location.neighborhood || 'Sin barrio'}, ${prop.location.city || 'Sin ciudad'}`);
          console.log(`      💰 $${prop.price?.toLocaleString() || 'N/A'}`);
        });

        // Mostrar distribución por fuente
        const sources = result.properties.reduce((acc, prop) => {
          const source = prop.source || 'Desconocido';
          acc[source] = (acc[source] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        console.log(`📈 Distribución por fuente:`);
        Object.entries(sources).forEach(([source, count]) => {
          console.log(`   - ${source}: ${count} propiedades`);
        });

      } else {
        console.log(`❌ SIN RESULTADOS para "${location}"`);
      }

    } catch (error) {
      console.log(`💥 ERROR para "${location}": ${(error as Error).message}`);
    }
  }

  console.log('\n🏁 PRUEBAS DE CONTEO COMPLETADAS');
  console.log('='.repeat(70));
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  testLocationCounts().catch(console.error);
}

export { testLocationCounts };
