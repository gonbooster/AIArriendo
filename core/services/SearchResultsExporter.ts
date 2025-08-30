import fs from 'fs';
import path from 'path';
import { Property, SearchCriteria } from '../types';
import { logger } from '../../utils/logger';

export class SearchResultsExporter {
  private outputDir: string;

  constructor() {
    this.outputDir = path.join(process.cwd(), 'search-results');
    this.ensureOutputDirectory();
  }

  /**
   * Ensure output directory exists
   */
  private ensureOutputDirectory(): void {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
      logger.info('📁 Created search-results directory');
    }
  }

  /**
   * Export search results to TXT files
   */
  async exportSearchResults(
    properties: Property[],
    criteria: SearchCriteria,
    searchId: string = Date.now().toString()
  ): Promise<void> {
    try {
      const timestamp = '0'; //new Date().toISOString().replace(/[:.]/g, '-');
      
      // Group properties by source
      const propertiesBySource = this.groupPropertiesBySource(properties);
      
      // Generate summary file
      await this.generateSummaryFile(properties, criteria, timestamp, searchId);
      
      // Generate individual source files
      for (const [source, sourceProperties] of Object.entries(propertiesBySource)) {
        await this.generateSourceFile(source, sourceProperties, criteria, timestamp, searchId);
      }
      
      // Generate combined raw data file
      await this.generateRawDataFile(properties, criteria, timestamp, searchId);
      
      logger.info(`📄 Exported search results to ${Object.keys(propertiesBySource).length + 2} files`);
      
    } catch (error) {
      logger.error('Error exporting search results:', error);
    }
  }

  /**
   * Group properties by source
   */
  private groupPropertiesBySource(properties: Property[]): Record<string, Property[]> {
    return properties.reduce((acc, property) => {
      const source = property.source || 'Unknown';
      if (!acc[source]) {
        acc[source] = [];
      }
      acc[source].push(property);
      return acc;
    }, {} as Record<string, Property[]>);
  }

  /**
   * Generate summary file
   */
  private async generateSummaryFile(
    properties: Property[],
    criteria: SearchCriteria,
    timestamp: string,
    searchId: string
  ): Promise<void> {
    const filename = `SUMMARY_${timestamp}.txt`;
    const filepath = path.join(this.outputDir, filename);
    
    const sourceBreakdown = this.groupPropertiesBySource(properties);
    const totalProperties = properties.length;
    
    const hard: any = (criteria as any).hardRequirements || criteria.hardRequirements;
    const operation = hard?.operation || 'No especificado';
    const propertyTypes = Array.isArray(hard?.propertyTypes) ? hard.propertyTypes.join(', ') : 'No especificado';
    const minRooms = hard?.minRooms ?? 'N/A';
    const maxRooms = hard?.maxRooms ?? 'N/A';
    const minBathrooms = hard?.minBathrooms ?? 'N/A';
    const maxBathrooms = hard?.maxBathrooms ?? 'N/A';
    const minParking = hard?.minParking ?? 'N/A';
    const maxParking = hard?.maxParking ?? 'N/A';
    const minArea = hard?.minArea ?? 'N/A';
    const maxArea = hard?.maxArea ?? 'N/A';
    const minPrice = hard?.minTotalPrice ?? 0;
    const maxPrice = hard?.maxTotalPrice ?? 0;
    const minStratum = hard?.minStratum ?? 'N/A';
    const maxStratum = hard?.maxStratum ?? 'N/A';
    const neighborhoods = hard?.location?.neighborhoods?.join(', ') || 'No especificado';

    const content = `
=================================================================
                    RESUMEN DE BÚSQUEDA
=================================================================
🔍 ID de Búsqueda: ${searchId}
📅 Fecha: ${new Date().toLocaleString('es-CO')}
📊 Total Propiedades: ${totalProperties}

=================================================================
                    CRITERIOS DE BÚSQUEDA
=================================================================
🏠 Operación: ${operation}
🏢 Tipo: ${propertyTypes}
🛏️ Habitaciones: ${minRooms} - ${maxRooms}
🚿 Baños: ${minBathrooms} - ${maxBathrooms}
🚗 Parqueaderos: ${minParking} - ${maxParking}
📐 Área: ${minArea} - ${maxArea} m²
💰 Precio: $${(minPrice || 0).toLocaleString('es-CO')} - $${(maxPrice || 0).toLocaleString('es-CO')}
⭐ Estrato: ${minStratum} - ${maxStratum}
📍 Barrios: ${neighborhoods}

=================================================================
                    DESGLOSE POR FUENTE
=================================================================
${Object.entries(sourceBreakdown)
  .map(([source, props]) => `${source}: ${props.length} propiedades`)
  .join('\n')}

=================================================================
                    ESTADÍSTICAS
=================================================================
💰 Precio Promedio: $${this.calculateAveragePrice(properties).toLocaleString('es-CO')}
📐 Área Promedio: ${this.calculateAverageArea(properties)} m²
💵 Precio/m² Promedio: $${this.calculateAveragePricePerM2(properties).toLocaleString('es-CO')}

=================================================================
                    ARCHIVOS GENERADOS
=================================================================
📄 SUMMARY_${timestamp}.txt - Este archivo resumen
📄 RAW_DATA_${timestamp}.txt - Datos completos en formato JSON
${Object.keys(sourceBreakdown)
  .map(source => `📄 ${source.toUpperCase()}_${timestamp}.txt - Propiedades de ${source}`)
  .join('\n')}

=================================================================
`;

    fs.writeFileSync(filepath, content.trim(), 'utf8');
    logger.info(`📄 Generated summary file: ${filename}`);
  }

  /**
   * Generate source-specific file
   */
  private async generateSourceFile(
    source: string,
    properties: Property[],
    criteria: SearchCriteria,
    timestamp: string,
    searchId: string
  ): Promise<void> {
    const filename = `${source.toUpperCase()}_${timestamp}.txt`;
    const filepath = path.join(this.outputDir, filename);
    
    const content = `
=================================================================
                    PROPIEDADES DE ${source.toUpperCase()}
=================================================================
🔍 ID de Búsqueda: ${searchId}
📅 Fecha: ${new Date().toLocaleString('es-CO')}
📊 Total: ${properties.length} propiedades

${properties.map((property, index) => `
-----------------------------------------------------------------
                    PROPIEDAD ${index + 1}
-----------------------------------------------------------------
🆔 ID: ${property.id}
📝 Título: ${property.title}
💰 Precio: $${property.price?.toLocaleString('es-CO') || 'N/A'}
💵 Admin: $${property.adminFee?.toLocaleString('es-CO') || 'N/A'}
💸 Total: $${property.totalPrice?.toLocaleString('es-CO') || 'N/A'}
📐 Área: ${property.area || 'N/A'} m²
🛏️ Habitaciones: ${property.rooms || 'N/A'}
🚿 Baños: ${property.bathrooms || 'N/A'}
🚗 Parqueaderos: ${property.parking || 'N/A'}
⭐ Estrato: ${property.stratum || 'N/A'}
📍 Dirección: ${property.location?.address || 'N/A'}
🏘️ Barrio: ${property.location?.neighborhood || 'N/A'}
🌐 URL: ${property.url || 'N/A'}
💵 Precio/m²: $${property.pricePerM2?.toLocaleString('es-CO') || 'N/A'}
🎯 Score: ${property.score || 'N/A'}

🏠 Amenidades:
${property.amenities?.map(amenity => `   ✅ ${amenity}`).join('\n') || '   Sin amenidades'}

📝 Descripción:
${property.description || 'Sin descripción'}
`).join('\n')}

=================================================================
                    ESTADÍSTICAS DE ${source.toUpperCase()}
=================================================================
💰 Precio Promedio: $${this.calculateAveragePrice(properties).toLocaleString('es-CO')}
📐 Área Promedio: ${this.calculateAverageArea(properties)} m²
💵 Precio/m² Promedio: $${this.calculateAveragePricePerM2(properties).toLocaleString('es-CO')}

=================================================================
`;

    fs.writeFileSync(filepath, content.trim(), 'utf8');
    logger.info(`📄 Generated ${source} file: ${filename}`);
  }

  /**
   * Generate raw data file
   */
  private async generateRawDataFile(
    properties: Property[],
    criteria: SearchCriteria,
    timestamp: string,
    searchId: string
  ): Promise<void> {
    const filename = `RAW_DATA_${timestamp}.txt`;
    const filepath = path.join(this.outputDir, filename);
    
    const rawData = {
      searchId,
      timestamp: new Date().toISOString(),
      criteria,
      totalProperties: properties.length,
      properties: properties.map(property => ({
        ...property,
        // Ensure all fields are included
        id: property.id,
        title: property.title,
        price: property.price,
        adminFee: property.adminFee,
        totalPrice: property.totalPrice,
        area: property.area,
        rooms: property.rooms,
        bathrooms: property.bathrooms,
        parking: property.parking,
        stratum: property.stratum,
        location: property.location,
        amenities: property.amenities,
        description: property.description,
        images: property.images,
        url: property.url,
        source: property.source,
        scrapedDate: property.scrapedDate,
        pricePerM2: property.pricePerM2,
        score: property.score,
        metadata: property.metadata
      }))
    };
    
    const content = JSON.stringify(rawData, null, 2);
    fs.writeFileSync(filepath, content, 'utf8');
    logger.info(`📄 Generated raw data file: ${filename}`);
  }

  /**
   * Calculate average price
   */
  private calculateAveragePrice(properties: Property[]): number {
    const validPrices = properties.filter(p => p.price && p.price > 0);
    if (validPrices.length === 0) return 0;
    return Math.round(validPrices.reduce((sum, p) => sum + p.price, 0) / validPrices.length);
  }

  /**
   * Calculate average area
   */
  private calculateAverageArea(properties: Property[]): number {
    const validAreas = properties.filter(p => p.area && p.area > 0);
    if (validAreas.length === 0) return 0;
    return Math.round(validAreas.reduce((sum, p) => sum + p.area, 0) / validAreas.length);
  }

  /**
   * Calculate average price per m2
   */
  private calculateAveragePricePerM2(properties: Property[]): number {
    const validPrices = properties.filter(p => p.pricePerM2 && p.pricePerM2 > 0);
    if (validPrices.length === 0) return 0;
    return Math.round(validPrices.reduce((sum, p) => sum + p.pricePerM2, 0) / validPrices.length);
  }
}

export const searchResultsExporter = new SearchResultsExporter();
