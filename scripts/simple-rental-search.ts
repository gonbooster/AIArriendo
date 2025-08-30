#!/usr/bin/env ts-node

/**
 * Script de búsqueda simple para propiedades en arriendo
 * Solo requiere ubicación y tipo de operación (arriendo)
 * Basado en el código de Metrocuadrado del archivo text.txt
 */

import { SearchService } from '../core/services/SearchService';
import { SearchCriteria } from '../core/types';
import { logger } from '../utils/logger';

interface SimpleSearchParams {
  location: string;
  city?: string;
  neighborhood?: string;
}

class SimpleRentalSearch {
  private searchService: SearchService;

  constructor() {
    this.searchService = new SearchService();
  }

  /**
   * Ejecuta una búsqueda simple solo con ubicación y tipo arriendo
   */
  async searchRentals(params: SimpleSearchParams): Promise<void> {
    console.log('🏠 BÚSQUEDA SIMPLE DE ARRIENDOS');
    console.log('=' .repeat(50));
    console.log(`📍 Ubicación: ${params.location}`);
    console.log(`🏙️ Ciudad: ${params.city || 'Bogotá'}`);
    console.log(`🏘️ Barrio: ${params.neighborhood || 'Cualquiera'}`);
    console.log('');

    try {
      // Crear criterios básicos para arriendo
      const criteria: SearchCriteria = this.createBasicRentalCriteria(params);

      console.log('🔍 Ejecutando búsqueda...');
      const startTime = Date.now();

      // Ejecutar búsqueda
      const result = await this.searchService.search(criteria, 1, 50);

      const executionTime = Date.now() - startTime;

      // Mostrar resultados
      this.displayResults(result, executionTime);

    } catch (error) {
      console.error('❌ Error en la búsqueda:', error);
      logger.error('Simple rental search failed:', error);
    }
  }

  /**
   * Crea criterios básicos para búsqueda de arriendos
   */
  private createBasicRentalCriteria(params: SimpleSearchParams): SearchCriteria {
    const city = params.city || 'Bogotá';
    const neighborhoods = params.neighborhood ? [params.neighborhood] : [];

    return {
      hardRequirements: {
        // Operación fija: arriendo
        operation: 'arriendo',
        
        // Tipos de propiedad amplios
        propertyTypes: ['Apartamento', 'Casa', 'Apartaestudio', 'Loft'],
        
        // Ubicación
        location: {
          city: city,
          neighborhoods: neighborhoods,
          zones: []
        },
        
        // Rangos muy amplios para obtener más resultados
        minRooms: 1,
        maxRooms: 10,
        minBathrooms: 1,
        maxBathrooms: 10,
        minParking: 0,
        maxParking: 10,
        minArea: 20,
        maxArea: 500,
        minTotalPrice: 100000,
        maxTotalPrice: 20000000,
        allowAdminOverage: true,
        minStratum: 1,
        maxStratum: 6
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
  }

  /**
   * Muestra los resultados de la búsqueda
   */
  private displayResults(result: any, executionTime: number): void {
    console.log('📊 RESULTADOS DE LA BÚSQUEDA');
    console.log('=' .repeat(50));
    console.log(`⏱️ Tiempo de ejecución: ${executionTime}ms`);
    console.log(`🏠 Propiedades encontradas: ${result.properties.length}`);
    console.log(`📄 Total disponible: ${result.total}`);
    console.log('');

    if (result.properties.length === 0) {
      console.log('❌ No se encontraron propiedades con los criterios especificados');
      console.log('💡 Sugerencias:');
      console.log('   - Verifica que la ubicación esté bien escrita');
      console.log('   - Intenta con una ciudad o barrio diferente');
      console.log('   - Los scrapers pueden estar temporalmente inactivos');
      return;
    }

    // Mostrar primeras 5 propiedades
    console.log('🏠 PRIMERAS 5 PROPIEDADES:');
    console.log('-' .repeat(50));

    result.properties.slice(0, 5).forEach((property: any, index: number) => {
      console.log(`${index + 1}. ${property.title || 'Sin título'}`);
      console.log(`   💰 Precio: $${property.totalPrice?.toLocaleString() || 'No disponible'}`);
      console.log(`   📍 Ubicación: ${property.neighborhood || property.location || 'No especificada'}`);
      console.log(`   🏠 Tipo: ${property.propertyType || 'No especificado'}`);
      console.log(`   🛏️ Habitaciones: ${property.rooms || 'No especificado'}`);
      console.log(`   📐 Área: ${property.area || 'No especificada'} m²`);
      console.log(`   🔗 URL: ${property.url || 'No disponible'}`);
      console.log('');
    });

    // Resumen por fuente
    const sourcesSummary = this.summarizeBySource(result.properties);
    console.log('📈 RESUMEN POR FUENTE:');
    console.log('-' .repeat(30));
    Object.entries(sourcesSummary).forEach(([source, count]) => {
      console.log(`   ${source}: ${count} propiedades`);
    });
    console.log('');

    // Resumen por rango de precios
    const priceRanges = this.summarizeByPriceRange(result.properties);
    console.log('💰 RESUMEN POR RANGO DE PRECIOS:');
    console.log('-' .repeat(35));
    Object.entries(priceRanges).forEach(([range, count]) => {
      console.log(`   ${range}: ${count} propiedades`);
    });
  }

  /**
   * Agrupa propiedades por fuente
   */
  private summarizeBySource(properties: any[]): Record<string, number> {
    const summary: Record<string, number> = {};
    
    properties.forEach(property => {
      const source = property.source || 'Desconocido';
      summary[source] = (summary[source] || 0) + 1;
    });

    return summary;
  }

  /**
   * Agrupa propiedades por rango de precios
   */
  private summarizeByPriceRange(properties: any[]): Record<string, number> {
    const ranges: Record<string, number> = {
      'Menos de $1M': 0,
      '$1M - $2M': 0,
      '$2M - $3M': 0,
      '$3M - $5M': 0,
      'Más de $5M': 0,
      'Sin precio': 0
    };

    properties.forEach(property => {
      const price = property.totalPrice;
      
      if (!price || price === 0) {
        ranges['Sin precio']++;
      } else if (price < 1000000) {
        ranges['Menos de $1M']++;
      } else if (price < 2000000) {
        ranges['$1M - $2M']++;
      } else if (price < 3000000) {
        ranges['$2M - $3M']++;
      } else if (price < 5000000) {
        ranges['$3M - $5M']++;
      } else {
        ranges['Más de $5M']++;
      }
    });

    return ranges;
  }
}

// Función principal para ejecutar el script
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('❌ Error: Debes especificar una ubicación');
    console.log('');
    console.log('📖 USO:');
    console.log('   npm run simple-search "Chapinero"');
    console.log('   npm run simple-search "Usaquén"');
    console.log('   npm run simple-search "Suba"');
    console.log('   npm run simple-search "Zona Rosa"');
    console.log('');
    console.log('💡 También puedes especificar ciudad y barrio:');
    console.log('   npm run simple-search "Medellín" "El Poblado"');
    process.exit(1);
  }

  const location = args[0];
  const neighborhood = args[1];
  const city = args[2] || 'Bogotá';

  const searcher = new SimpleRentalSearch();
  
  await searcher.searchRentals({
    location,
    neighborhood,
    city
  });
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });
}

export { SimpleRentalSearch };
