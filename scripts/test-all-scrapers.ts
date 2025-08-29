import { SearchService } from '../core/services/SearchService';
import { SearchCriteria, Property } from '../core/types';

async function testAllScrapers() {
  console.log('🔍 TESTING ALL SCRAPERS AFTER REPAIRS\n');
  console.log('=' .repeat(80));

  const searchService = new SearchService();
  
  // Criterios de prueba específicos para verificar las reparaciones
  const testCriteria: SearchCriteria = {
    hardRequirements: {
      minRooms: 2,
      maxRooms: 3,
      minArea: 60,
      maxArea: 100,
      maxTotalPrice: 4000000,
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
    console.log('🚀 Ejecutando búsqueda completa con todos los scrapers...\n');
    console.log('📋 CRITERIOS DE PRUEBA:');
    console.log(`   🛏️  Habitaciones: ${testCriteria.hardRequirements.minRooms}-${testCriteria.hardRequirements.maxRooms}`);
    console.log(`   📐 Área: ${testCriteria.hardRequirements.minArea}-${testCriteria.hardRequirements.maxArea} m²`);
    console.log(`   💰 Precio máximo: $${testCriteria.hardRequirements.maxTotalPrice.toLocaleString()}`);
    console.log(`   📍 Ciudad: ${testCriteria.hardRequirements.location.city}`);
    console.log(`   🏠 Tipo: ${testCriteria.hardRequirements.propertyTypes?.join(', ') || 'Apartamento'}\n`);

    const searchResult = await searchService.search(testCriteria);
    const results = searchResult.properties;
    
    console.log(`📊 RESULTADOS TOTALES: ${results.length} propiedades encontradas\n`);

    // Agrupar resultados por fuente
    const resultsBySource = results.reduce((acc: Record<string, Property[]>, property: Property) => {
      const source = property.source || 'Unknown';
      if (!acc[source]) {
        acc[source] = [];
      }
      acc[source].push(property);
      return acc;
    }, {} as Record<string, Property[]>);

    // Analizar cada scraper
    console.log('📈 ANÁLISIS POR SCRAPER:\n');
    
    const scraperNames = ['Fincaraiz', 'Metrocuadrado', 'Trovit', 'MercadoLibre', 'Ciencuadras'];
    
    scraperNames.forEach(scraperName => {
      const properties = resultsBySource[scraperName] || [];
      console.log(`🔧 ${scraperName.toUpperCase()}:`);
      console.log(`   📊 Propiedades encontradas: ${properties.length}`);
      
      if (properties.length === 0) {
        console.log(`   ❌ PROBLEMA: No se encontraron propiedades`);
        console.log(`   💡 Posibles causas: Scraper no funciona o no hay propiedades que cumplan criterios\n`);
        return;
      }

      // Análisis de calidad de datos
      const stats = {
        withPrice: properties.filter((p: Property) => p.price && p.price > 0).length,
        withArea: properties.filter((p: Property) => p.area && p.area > 0).length,
        withRooms: properties.filter((p: Property) => p.rooms && p.rooms > 0).length,
        withBathrooms: properties.filter((p: Property) => p.bathrooms && p.bathrooms > 0).length,
        withLocation: properties.filter((p: Property) => p.location.neighborhood && p.location.neighborhood !== 'Sin especificar').length,
        withImages: properties.filter((p: Property) => p.images && p.images.length > 0).length,
        withValidUrl: properties.filter((p: Property) => p.url && p.url.startsWith('http')).length,
        total: properties.length
      };

      console.log(`   💰 Con precio: ${stats.withPrice}/${stats.total} (${((stats.withPrice/stats.total)*100).toFixed(1)}%)`);
      console.log(`   📐 Con área: ${stats.withArea}/${stats.total} (${((stats.withArea/stats.total)*100).toFixed(1)}%)`);
      console.log(`   🛏️  Con habitaciones: ${stats.withRooms}/${stats.total} (${((stats.withRooms/stats.total)*100).toFixed(1)}%)`);
      console.log(`   🚿 Con baños: ${stats.withBathrooms}/${stats.total} (${((stats.withBathrooms/stats.total)*100).toFixed(1)}%)`);
      console.log(`   📍 Con ubicación: ${stats.withLocation}/${stats.total} (${((stats.withLocation/stats.total)*100).toFixed(1)}%)`);
      console.log(`   🖼️  Con imágenes: ${stats.withImages}/${stats.total} (${((stats.withImages/stats.total)*100).toFixed(1)}%)`);
      console.log(`   🔗 Con URL válida: ${stats.withValidUrl}/${stats.total} (${((stats.withValidUrl/stats.total)*100).toFixed(1)}%)`);

      // Calcular score de calidad
      const qualityScore = (
        (stats.withPrice / stats.total) +
        (stats.withArea / stats.total) +
        (stats.withRooms / stats.total) +
        (stats.withBathrooms / stats.total) +
        (stats.withLocation / stats.total) +
        (stats.withImages / stats.total) +
        (stats.withValidUrl / stats.total)
      ) / 7 * 100;

      const qualityStatus = qualityScore >= 90 ? '🟢 EXCELENTE' : 
                           qualityScore >= 70 ? '🟡 BUENO' : 
                           qualityScore >= 50 ? '🟠 REGULAR' : '🔴 CRÍTICO';

      console.log(`   📊 Score de calidad: ${qualityScore.toFixed(1)}% - ${qualityStatus}`);

      // Mostrar ejemplos de propiedades
      if (properties.length > 0) {
        console.log(`   🏠 Ejemplo de propiedad:`);
        const example = properties[0];
        console.log(`      📝 ${example.title.substring(0, 50)}...`);
        console.log(`      💰 $${example.price?.toLocaleString()} | 📐 ${example.area}m² | 🛏️ ${example.rooms}hab | 🚿 ${example.bathrooms}baños`);
        console.log(`      📍 ${example.location.neighborhood || 'Sin ubicación'}`);
      }

      console.log('');
    });

    // Resumen final
    console.log('🎯 RESUMEN FINAL DE REPARACIONES:\n');
    
    const totalProperties = results.length;
    const workingScrapers = Object.keys(resultsBySource).length;
    
    console.log(`   📊 Total propiedades encontradas: ${totalProperties}`);
    console.log(`   🔧 Scrapers funcionando: ${workingScrapers}/5`);
    
    if (workingScrapers === 5) {
      console.log(`   ✅ ÉXITO COMPLETO: Todos los scrapers están funcionando`);
    } else if (workingScrapers >= 3) {
      console.log(`   🟡 ÉXITO PARCIAL: La mayoría de scrapers funcionan`);
    } else {
      console.log(`   🔴 PROBLEMAS CRÍTICOS: Pocos scrapers funcionando`);
    }

    // Análisis de diversidad de fuentes
    console.log('\n📈 DIVERSIDAD DE FUENTES:');
    Object.entries(resultsBySource).forEach(([source, props]: [string, Property[]]) => {
      const percentage = (props.length / totalProperties * 100).toFixed(1);
      console.log(`   ${source}: ${props.length} propiedades (${percentage}%)`);
    });

    // Verificar criterios específicos
    console.log('\n🎯 VERIFICACIÓN DE CRITERIOS:');
    const matchingCriteria = results.filter((p: Property) =>
      p.rooms >= testCriteria.hardRequirements.minRooms &&
      p.rooms <= (testCriteria.hardRequirements.maxRooms || 10) &&
      p.area >= testCriteria.hardRequirements.minArea &&
      p.area <= (testCriteria.hardRequirements.maxArea || 1000) &&
      p.totalPrice <= testCriteria.hardRequirements.maxTotalPrice
    );

    console.log(`   ✅ Propiedades que cumplen TODOS los criterios: ${matchingCriteria.length}/${totalProperties} (${(matchingCriteria.length/totalProperties*100).toFixed(1)}%)`);

    if (matchingCriteria.length > 0) {
      console.log(`   🏆 ÉXITO: Se encontraron propiedades que cumplen los criterios específicos`);
    } else {
      console.log(`   ⚠️  NOTA: No hay propiedades que cumplan todos los criterios (normal con criterios específicos)`);
    }

  } catch (error) {
    console.error('❌ Error durante el test:', error);
    console.log('\n🔍 ANÁLISIS DEL ERROR:');
    if (error instanceof Error) {
      console.log(`   📝 Mensaje: ${error.message}`);
      console.log(`   📚 Stack: ${error.stack?.substring(0, 300)}...`);
    }
  }
}

// Ejecutar test
testAllScrapers().catch(console.error);
