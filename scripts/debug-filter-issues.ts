import { SearchService } from '../core/services/SearchService';
import { SearchCriteria } from '../core/types';

async function debugFilterIssues() {
  console.log('🔍 DEBUGGING FILTER ISSUES - STEP BY STEP\n');
  console.log('=' .repeat(60));

  const searchService = new SearchService();
  
  // Criterios más permisivos para ver qué está pasando
  const testCriteria: SearchCriteria = {
    hardRequirements: {
      minRooms: 2,
      maxRooms: 3,
      minBathrooms: 1,
      maxBathrooms: 2,
      minParking: 0,
      maxParking: 2,
      minArea: 60,
      maxArea: 100,
      minTotalPrice: 1500000,
      maxTotalPrice: 4000000,
      allowAdminOverage: false,
      // REMOVEMOS FILTROS PROBLEMÁTICOS TEMPORALMENTE
      // minStratum: 3,
      // maxStratum: 5,
      // propertyTypes: ['Apartamento'],
      operation: 'arriendo',
      location: {
        city: 'Bogotá'
        // REMOVEMOS FILTRO DE BARRIOS TEMPORALMENTE
        // neighborhoods: ['Suba', 'Usaquén', 'Chapinero']
      }
    },
    preferences: {
      wetAreas: [],
      sports: [],
      amenities: [],
      weights: {
        wetAreas: 1,
        sports: 1,
        amenities: 1,
        location: 1,
        pricePerM2: 1
      }
    }
  };

  console.log('📋 CRITERIOS DE PRUEBA (MÁS PERMISIVOS):');
  console.log(`   🛏️  Habitaciones: ${testCriteria.hardRequirements.minRooms} - ${testCriteria.hardRequirements.maxRooms}`);
  console.log(`   🚿 Baños: ${testCriteria.hardRequirements.minBathrooms} - ${testCriteria.hardRequirements.maxBathrooms}`);
  console.log(`   📐 Área: ${testCriteria.hardRequirements.minArea} - ${testCriteria.hardRequirements.maxArea} m²`);
  console.log(`   💰 Precio: $${testCriteria.hardRequirements.minTotalPrice?.toLocaleString()} - $${testCriteria.hardRequirements.maxTotalPrice?.toLocaleString()}`);
  console.log(`   🏢 Estrato: SIN FILTRO (para debug)`);
  console.log(`   🏠 Tipo: SIN FILTRO (para debug)`);
  console.log(`   📍 Barrios: SIN FILTRO (para debug)`);
  console.log('');

  try {
    console.log('🚀 Ejecutando búsqueda con filtros permisivos...\n');
    const startTime = Date.now();
    
    const results = await searchService.search(testCriteria, 1, 50);
    
    const executionTime = Date.now() - startTime;
    console.log(`⏱️  Tiempo de ejecución: ${executionTime}ms\n`);

    console.log(`📊 RESULTADOS: ${results.properties.length} propiedades encontradas\n`);

    if (results.properties.length > 0) {
      console.log('🔍 ANÁLISIS DE PROPIEDADES ENCONTRADAS:\n');
      
      // Análisis de estratos
      const stratumCounts = new Map<number, number>();
      const propertyTypeCounts = new Map<string, number>();
      const neighborhoodCounts = new Map<string, number>();
      
      results.properties.forEach(property => {
        // Estrato
        const stratum = property.stratum || 0;
        stratumCounts.set(stratum, (stratumCounts.get(stratum) || 0) + 1);
        
        // Tipo de propiedad (extraído del título)
        const title = property.title.toLowerCase();
        let propertyType = 'Otro';
        if (title.includes('apartamento') || title.includes('apto')) {
          propertyType = 'Apartamento';
        } else if (title.includes('casa')) {
          propertyType = 'Casa';
        } else if (title.includes('apartaestudio')) {
          propertyType = 'Apartaestudio';
        }
        propertyTypeCounts.set(propertyType, (propertyTypeCounts.get(propertyType) || 0) + 1);
        
        // Barrio
        const neighborhood = property.location.neighborhood || 'Sin especificar';
        neighborhoodCounts.set(neighborhood, (neighborhoodCounts.get(neighborhood) || 0) + 1);
      });

      console.log('🏢 DISTRIBUCIÓN DE ESTRATOS:');
      Array.from(stratumCounts.entries())
        .sort(([a], [b]) => a - b)
        .forEach(([stratum, count]) => {
          console.log(`   Estrato ${stratum}: ${count} propiedades`);
        });
      
      console.log('\n🏠 DISTRIBUCIÓN DE TIPOS DE PROPIEDAD:');
      Array.from(propertyTypeCounts.entries())
        .sort(([, a], [, b]) => b - a)
        .forEach(([type, count]) => {
          console.log(`   ${type}: ${count} propiedades`);
        });
      
      console.log('\n📍 DISTRIBUCIÓN DE BARRIOS (TOP 10):');
      Array.from(neighborhoodCounts.entries())
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .forEach(([neighborhood, count]) => {
          console.log(`   ${neighborhood}: ${count} propiedades`);
        });

      console.log('\n📋 MUESTRA DE PROPIEDADES:');
      results.properties.slice(0, 5).forEach((property, index) => {
        console.log(`\n🏠 PROPIEDAD ${index + 1}:`);
        console.log(`   📝 Título: ${property.title.substring(0, 80)}...`);
        console.log(`   💰 Precio: $${property.totalPrice.toLocaleString()}`);
        console.log(`   📐 Área: ${property.area} m²`);
        console.log(`   🛏️  Habitaciones: ${property.rooms}`);
        console.log(`   🚿 Baños: ${property.bathrooms || 'N/A'}`);
        console.log(`   🏢 Estrato: ${property.stratum || 'N/A'}`);
        console.log(`   📍 Barrio: ${property.location.neighborhood || 'N/A'}`);
        console.log(`   🌐 Fuente: ${property.source}`);
      });

      // Ahora probar con filtros más específicos
      console.log('\n\n🎯 PROBANDO FILTROS ESPECÍFICOS:\n');
      
      // Test 1: Solo filtro de estrato
      console.log('🔍 TEST 1: Filtro de estrato (3-5)');
      const estratoFiltered = results.properties.filter(p => {
        const stratum = p.stratum || 0;
        return stratum >= 3 && stratum <= 5;
      });
      console.log(`   Resultado: ${estratoFiltered.length}/${results.properties.length} propiedades`);
      
      // Test 2: Solo filtro de tipo
      console.log('🔍 TEST 2: Filtro de tipo (Apartamento)');
      const tipoFiltered = results.properties.filter(p => {
        const title = p.title.toLowerCase();
        return title.includes('apartamento') || title.includes('apto');
      });
      console.log(`   Resultado: ${tipoFiltered.length}/${results.properties.length} propiedades`);
      
      // Test 3: Solo filtro de barrios
      console.log('🔍 TEST 3: Filtro de barrios (Suba, Usaquén, Chapinero)');
      const barriosFiltered = results.properties.filter(p => {
        const neighborhood = (p.location.neighborhood || '').toLowerCase();
        const address = (p.location.address || '').toLowerCase();
        const targetNeighborhoods = ['suba', 'usaquén', 'usaquen', 'chapinero'];
        
        return targetNeighborhoods.some(target => 
          neighborhood.includes(target) || address.includes(target)
        );
      });
      console.log(`   Resultado: ${barriosFiltered.length}/${results.properties.length} propiedades`);
      
      if (barriosFiltered.length > 0) {
        console.log('   📍 Barrios encontrados:');
        barriosFiltered.forEach(p => {
          console.log(`      - ${p.location.neighborhood || p.location.address || 'N/A'}`);
        });
      }

    } else {
      console.log('❌ No se encontraron propiedades ni con filtros permisivos');
      console.log('💡 Esto indica un problema en el scraping o en la estructura de datos');
    }

  } catch (error) {
    console.error('❌ Error durante el diagnóstico:', error);
  }
}

// Ejecutar diagnóstico
debugFilterIssues().catch(console.error);
