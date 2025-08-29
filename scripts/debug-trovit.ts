import { TrovitScraper } from '../core/scraping/scrapers/TrovitScraper';
import { SearchCriteria } from '../core/types';

async function debugTrovit() {
  console.log('🔍 DEBUGGING TROVIT SCRAPER\n');
  console.log('=' .repeat(60));

  // TrovitScraper no toma parámetros en el constructor
  const scraper = new TrovitScraper();
  
  // Criterios básicos para obtener propiedades
  const basicCriteria: SearchCriteria = {
    hardRequirements: {
      minRooms: 1,
      minArea: 30,
      maxTotalPrice: 10000000,
      allowAdminOverage: false,
      operation: 'arriendo',
      propertyTypes: ['Apartamento'],
      location: {
        city: 'Bogotá'
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

  try {
    console.log('🚀 Ejecutando scraping de Trovit...\n');
    const properties = await scraper.scrape(basicCriteria);
    
    console.log(`📊 PROPIEDADES ENCONTRADAS: ${properties.length}\n`);

    if (properties.length === 0) {
      console.log('❌ No se encontraron propiedades en Trovit');
      console.log('💡 Esto indica un problema en el scraper base');
      return;
    }

    // Analizar cada propiedad en detalle
    properties.slice(0, 10).forEach((property, index) => {
      console.log(`🏠 PROPIEDAD ${index + 1}:`);
      console.log(`   📝 ID: ${property.id}`);
      console.log(`   📝 Título: ${property.title}`);
      console.log(`   💰 Precio: $${property.price?.toLocaleString() || 'N/A'}`);
      console.log(`   💰 Precio Total: $${property.totalPrice?.toLocaleString() || 'N/A'}`);
      console.log(`   💰 Admin: $${property.adminFee?.toLocaleString() || 'N/A'}`);
      console.log(`   📐 Área: ${property.area || 'N/A'} m²`);
      console.log(`   🛏️  Habitaciones: ${property.rooms || 'N/A'}`);
      console.log(`   🚿 Baños: ${property.bathrooms || 'N/A'}`);
      console.log(`   🚗 Parqueaderos: ${property.parking || 'N/A'}`);
      console.log(`   🏢 Estrato: ${property.stratum || 'N/A'}`);
      console.log(`   📍 Dirección: ${property.location.address || 'N/A'}`);
      console.log(`   📍 Barrio: ${property.location.neighborhood || 'N/A'}`);
      console.log(`   📍 Ciudad: ${property.location.city || 'N/A'}`);
      console.log(`   🖼️  Imágenes: ${property.images?.length || 0}`);
      if (property.images && property.images.length > 0) {
        property.images.slice(0, 2).forEach((img, imgIndex) => {
          console.log(`      ${imgIndex + 1}. ${img.substring(0, 80)}...`);
        });
      }
      console.log(`   🔗 URL: ${property.url}`);
      console.log(`   📄 Descripción: ${property.description?.substring(0, 100) || 'N/A'}...`);
      
      // ANÁLISIS DE PROBLEMAS ESPECÍFICOS
      console.log(`\n   🔍 ANÁLISIS DE PROBLEMAS:`);
      
      // Problema 1: Baños no detectados
      const bathroomsOK = property.bathrooms && property.bathrooms > 0;
      console.log(`      🚿 Baños detectados: ${bathroomsOK ? '✅' : '❌'} (${property.bathrooms || 0})`);
      
      // Problema 2: Ubicación no detectada
      const locationOK = property.location.neighborhood && property.location.neighborhood !== 'Sin especificar';
      console.log(`      📍 Ubicación detectada: ${locationOK ? '✅' : '❌'} (${property.location.neighborhood || 'N/A'})`);
      
      // Problema 3: Área
      const areaOK = property.area && property.area > 0;
      console.log(`      📐 Área detectada: ${areaOK ? '✅' : '❌'} (${property.area || 0}m²)`);
      
      // Problema 4: Habitaciones
      const roomsOK = property.rooms && property.rooms > 0;
      console.log(`      🛏️  Habitaciones detectadas: ${roomsOK ? '✅' : '❌'} (${property.rooms || 0})`);
      
      // Problema 5: Imágenes
      const imagesOK = property.images && property.images.length > 0;
      console.log(`      🖼️  Imágenes detectadas: ${imagesOK ? '✅' : '❌'} (${property.images?.length || 0})`);
      
      // Resumen de problemas
      const problems = [];
      if (!bathroomsOK) problems.push('Baños');
      if (!locationOK) problems.push('Ubicación');
      if (!areaOK) problems.push('Área');
      if (!roomsOK) problems.push('Habitaciones');
      if (!imagesOK) problems.push('Imágenes');
      
      if (problems.length > 0) {
        console.log(`   ❌ Problemas detectados: ${problems.join(', ')}`);
      } else {
        console.log(`   ✅ Todos los datos extraídos correctamente`);
      }
      
      console.log('\n' + '-'.repeat(80) + '\n');
    });

    // Análisis estadístico
    console.log('📈 ANÁLISIS ESTADÍSTICO:');
    
    const stats = {
      withBathrooms: properties.filter(p => p.bathrooms && p.bathrooms > 0).length,
      withLocation: properties.filter(p => p.location.neighborhood && p.location.neighborhood !== 'Sin especificar').length,
      withArea: properties.filter(p => p.area && p.area > 0).length,
      withRooms: properties.filter(p => p.rooms && p.rooms > 0).length,
      withImages: properties.filter(p => p.images && p.images.length > 0).length,
      total: properties.length
    };
    
    console.log(`   🚿 Propiedades con baños: ${stats.withBathrooms}/${stats.total} (${((stats.withBathrooms/stats.total)*100).toFixed(1)}%)`);
    console.log(`   📍 Propiedades con ubicación: ${stats.withLocation}/${stats.total} (${((stats.withLocation/stats.total)*100).toFixed(1)}%)`);
    console.log(`   📐 Propiedades con área: ${stats.withArea}/${stats.total} (${((stats.withArea/stats.total)*100).toFixed(1)}%)`);
    console.log(`   🛏️  Propiedades con habitaciones: ${stats.withRooms}/${stats.total} (${((stats.withRooms/stats.total)*100).toFixed(1)}%)`);
    console.log(`   🖼️  Propiedades con imágenes: ${stats.withImages}/${stats.total} (${((stats.withImages/stats.total)*100).toFixed(1)}%)`);
    
    // Identificar los problemas más críticos
    console.log('\n🎯 PROBLEMAS MÁS CRÍTICOS:');
    const problemAreas = [
      { name: 'Baños', percentage: (stats.withBathrooms/stats.total)*100 },
      { name: 'Ubicación', percentage: (stats.withLocation/stats.total)*100 },
      { name: 'Área', percentage: (stats.withArea/stats.total)*100 },
      { name: 'Habitaciones', percentage: (stats.withRooms/stats.total)*100 },
      { name: 'Imágenes', percentage: (stats.withImages/stats.total)*100 }
    ].sort((a, b) => a.percentage - b.percentage);
    
    problemAreas.forEach((problem, index) => {
      const status = problem.percentage < 50 ? '🔴 CRÍTICO' : problem.percentage < 80 ? '🟡 MODERADO' : '🟢 BUENO';
      console.log(`   ${index + 1}. ${problem.name}: ${problem.percentage.toFixed(1)}% - ${status}`);
    });

    // Recomendaciones
    console.log('\n💡 RECOMENDACIONES:');
    if (stats.withBathrooms / stats.total < 0.5) {
      console.log('   🚿 Mejorar extracción de baños: revisar selectores CSS y patrones de texto');
    }
    if (stats.withLocation / stats.total < 0.5) {
      console.log('   📍 Mejorar extracción de ubicación: revisar selectores de barrio/dirección');
    }
    if (stats.withArea / stats.total < 0.5) {
      console.log('   📐 Mejorar extracción de área: revisar patrones de m²');
    }
    if (stats.withRooms / stats.total < 0.5) {
      console.log('   🛏️  Mejorar extracción de habitaciones: revisar patrones de habitaciones');
    }
    if (stats.withImages / stats.total < 0.5) {
      console.log('   🖼️  Mejorar extracción de imágenes: revisar selectores de imágenes');
    }

  } catch (error) {
    console.error('❌ Error durante el debug:', error);
  }
}

// Ejecutar debug
debugTrovit().catch(console.error);
