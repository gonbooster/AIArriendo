import { SearchService } from '../core/services/SearchService';
import { SearchCriteria } from '../core/types';

async function diagnoseAllScrapers() {
  console.log('🔍 DIAGNÓSTICO COMPLETO DE TODOS LOS SCRAPERS\n');
  console.log('=' .repeat(60));

  const searchService = new SearchService();
  
  // Criterios de prueba específicos (formato backend)
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
      minStratum: 3,
      maxStratum: 5,
      propertyTypes: ['Apartamento'],
      operation: 'arriendo',
      location: {
        city: 'Bogotá',
        neighborhoods: ['Suba', 'Usaquén', 'Chapinero']
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

  console.log('📋 CRITERIOS DE PRUEBA:');
  console.log(`   🏠 Tipo: ${testCriteria.hardRequirements.propertyTypes?.join(', ')}`);
  console.log(`   🛏️  Habitaciones: ${testCriteria.hardRequirements.minRooms} - ${testCriteria.hardRequirements.maxRooms}`);
  console.log(`   🚿 Baños: ${testCriteria.hardRequirements.minBathrooms} - ${testCriteria.hardRequirements.maxBathrooms}`);
  console.log(`   📐 Área: ${testCriteria.hardRequirements.minArea} - ${testCriteria.hardRequirements.maxArea} m²`);
  console.log(`   💰 Precio: $${testCriteria.hardRequirements.minTotalPrice?.toLocaleString()} - $${testCriteria.hardRequirements.maxTotalPrice?.toLocaleString()}`);
  console.log(`   📍 Barrios: ${testCriteria.hardRequirements.location?.neighborhoods?.join(', ')}`);
  console.log('');

  try {
    console.log('🚀 Ejecutando búsqueda...\n');
    const startTime = Date.now();
    
    const results = await searchService.search(testCriteria, 1, 50);
    
    const executionTime = Date.now() - startTime;
    console.log(`⏱️  Tiempo de ejecución: ${executionTime}ms\n`);

    // Análisis por fuente
    const sourceAnalysis = new Map<string, {
      count: number;
      properties: any[];
      issues: string[];
    }>();

    results.properties.forEach(property => {
      const source = property.source;
      if (!sourceAnalysis.has(source)) {
        sourceAnalysis.set(source, {
          count: 0,
          properties: [],
          issues: []
        });
      }
      
      const analysis = sourceAnalysis.get(source)!;
      analysis.count++;
      analysis.properties.push(property);
      
      // Detectar problemas
      if (!property.images || property.images.length === 0) {
        analysis.issues.push('Sin imágenes');
      }
      
      if (!property.rooms || property.rooms === 0) {
        analysis.issues.push('Habitaciones no detectadas');
      }
      
      if (!property.bathrooms || property.bathrooms === 0) {
        analysis.issues.push('Baños no detectados');
      }
      
      if (!property.area || property.area === 0) {
        analysis.issues.push('Área no detectada');
      }
      
      if (!property.location.neighborhood || property.location.neighborhood === 'Sin especificar') {
        analysis.issues.push('Ubicación no detectada');
      }
      
      if (!property.price || property.price === 0) {
        analysis.issues.push('Precio no detectado');
      }
      
      // Verificar filtros
      const minRooms = testCriteria.hardRequirements.minRooms;
      const maxRooms = testCriteria.hardRequirements.maxRooms!;
      const minBathrooms = testCriteria.hardRequirements.minBathrooms!;
      const maxBathrooms = testCriteria.hardRequirements.maxBathrooms!;
      const minArea = testCriteria.hardRequirements.minArea;
      const maxArea = testCriteria.hardRequirements.maxArea!;
      const minPrice = testCriteria.hardRequirements.minTotalPrice!;
      const maxPrice = testCriteria.hardRequirements.maxTotalPrice;

      if (property.rooms && (property.rooms < minRooms || property.rooms > maxRooms)) {
        analysis.issues.push(`Filtro habitaciones falla: ${property.rooms} no está en rango ${minRooms}-${maxRooms}`);
      }

      if (property.bathrooms && (property.bathrooms < minBathrooms || property.bathrooms > maxBathrooms)) {
        analysis.issues.push(`Filtro baños falla: ${property.bathrooms} no está en rango ${minBathrooms}-${maxBathrooms}`);
      }

      if (property.area && (property.area < minArea || property.area > maxArea)) {
        analysis.issues.push(`Filtro área falla: ${property.area}m² no está en rango ${minArea}-${maxArea}m²`);
      }

      if (property.totalPrice && (property.totalPrice < minPrice || property.totalPrice > maxPrice)) {
        analysis.issues.push(`Filtro precio falla: $${property.totalPrice.toLocaleString()} no está en rango $${minPrice.toLocaleString()}-$${maxPrice.toLocaleString()}`);
      }
    });

    // Mostrar resultados por fuente
    console.log('📊 ANÁLISIS POR FUENTE:\n');
    
    const expectedSources = ['Ciencuadras', 'Properati', 'Fincaraiz', 'Metrocuadrado', 'Trovit', 'MercadoLibre', 'PADS'];
    
    expectedSources.forEach(sourceName => {
      const analysis = sourceAnalysis.get(sourceName);
      
      console.log(`🔍 ${sourceName.toUpperCase()}:`);
      
      if (!analysis || analysis.count === 0) {
        console.log(`   ❌ NO FUNCIONA - 0 propiedades encontradas`);
        console.log(`   💡 Posibles causas: Scraper desactivado, errores de conexión, o filtros muy restrictivos`);
      } else {
        console.log(`   ✅ ${analysis.count} propiedades encontradas`);
        
        // Mostrar problemas únicos
        const uniqueIssues = [...new Set(analysis.issues)];
        if (uniqueIssues.length > 0) {
          console.log(`   ⚠️  Problemas detectados:`);
          uniqueIssues.forEach(issue => {
            const count = analysis.issues.filter(i => i === issue).length;
            console.log(`      - ${issue} (${count}/${analysis.count} propiedades)`);
          });
        } else {
          console.log(`   ✅ Sin problemas detectados`);
        }
        
        // Mostrar muestra de datos
        if (analysis.properties.length > 0) {
          const sample = analysis.properties[0];
          console.log(`   📋 Muestra de datos:`);
          console.log(`      Título: ${sample.title.substring(0, 50)}...`);
          console.log(`      Precio: $${sample.price?.toLocaleString() || 'N/A'}`);
          console.log(`      Área: ${sample.area || 'N/A'} m²`);
          console.log(`      Habitaciones: ${sample.rooms || 'N/A'}`);
          console.log(`      Baños: ${sample.bathrooms || 'N/A'}`);
          console.log(`      Ubicación: ${sample.location.neighborhood || 'N/A'}`);
          console.log(`      Imágenes: ${sample.images?.length || 0}`);
        }
      }
      
      console.log('');
    });

    // Resumen general
    console.log('📈 RESUMEN GENERAL:');
    console.log(`   Total propiedades: ${results.properties.length}`);
    console.log(`   Fuentes activas: ${sourceAnalysis.size}/${expectedSources.length}`);
    console.log(`   Fuentes con problemas: ${Array.from(sourceAnalysis.values()).filter(a => a.issues.length > 0).length}`);
    
    const sourcesWorking = Array.from(sourceAnalysis.keys());
    const sourcesNotWorking = expectedSources.filter(s => !sourcesWorking.includes(s));
    
    if (sourcesNotWorking.length > 0) {
      console.log(`   ❌ Fuentes no funcionando: ${sourcesNotWorking.join(', ')}`);
    }

  } catch (error) {
    console.error('❌ Error durante el diagnóstico:', error);
  }
}

// Ejecutar diagnóstico
diagnoseAllScrapers().catch(console.error);
