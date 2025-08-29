import { SearchService } from '../core/services/SearchService';
import { SearchCriteria } from '../types';

/**
 * Debug específico para los 3 proveedores que faltan:
 * - Metrocuadrado
 * - PADS  
 * - Rentola
 */

async function debugMissingProviders() {
  console.log('🔍 DEBUGGING MISSING PROVIDERS: Metrocuadrado, PADS, Rentola\n');
  
  const searchService = new SearchService();

  // Criterios súper amplios para maximizar posibilidades
  const ultraWideCriteria: SearchCriteria = {
    hardRequirements: {
      minRooms: 1,
      maxRooms: 8,
      minBathrooms: 1,
      maxBathrooms: 6,
      minParking: 0,
      maxParking: 5,
      minArea: 20,
      maxArea: 500,
      minTotalPrice: 100000,    // Súper bajo
      maxTotalPrice: 20000000,  // Súper alto
      allowAdminOverage: true,
      minStratum: 1,
      maxStratum: 6,
      propertyTypes: ['Apartamento'],
      operation: 'arriendo',
      location: {
        city: 'Bogotá',
        neighborhoods: [], // Sin filtro específico
        zones: []
      }
    },
    preferences: {
      wetAreas: [],
      sports: [],
      amenities: [],
      weights: {
        wetAreas: 1,
        sports: 1,
        amenities: 0.8,
        location: 0.6,
        pricePerM2: 0.4
      }
    },
    optionalFilters: {}
  };

  console.log('📋 Criterios ultra amplios:');
  console.log(JSON.stringify(ultraWideCriteria, null, 2));
  
  try {
    console.log('\n🔄 Ejecutando búsqueda...');
    const result = await searchService.search(ultraWideCriteria, 1, 48);
    
    console.log('\n✅ RESULTADOS:');
    console.log(`📊 Total propiedades: ${result.properties.length}`);
    console.log(`📈 Breakdown por fuente:`, result.summary.sourceBreakdown);
    
    const sources = result.summary.sourceBreakdown || {};
    const activeProviders = Object.keys(sources).filter(source => sources[source] > 0);
    const missingProviders = ['Metrocuadrado', 'PADS', 'Rentola'].filter(p => !activeProviders.includes(p));
    
    console.log(`\n🎯 Proveedores activos: ${activeProviders.length}/8`);
    console.log(`📋 Fuentes activas: ${activeProviders.join(', ')}`);
    console.log(`❌ Proveedores faltantes: ${missingProviders.join(', ')}`);
    
    // Mostrar algunas propiedades de ejemplo
    if (result.properties.length > 0) {
      console.log('\n📄 EJEMPLOS DE PROPIEDADES:');
      result.properties.slice(0, 3).forEach((prop, i) => {
        console.log(`${i + 1}. ${prop.source} - ${prop.title}`);
        console.log(`   💰 ${prop.price.toLocaleString()} - 📐 ${prop.area}m² - 🏠 ${prop.rooms} hab`);
        console.log(`   🔗 ${prop.url}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error en búsqueda:', error);
  }
}

// Ejecutar debug
debugMissingProviders().catch(console.error);
