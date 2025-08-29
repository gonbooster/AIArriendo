/**
 * Extraction Statistics - Monitor scraping quality
 */

import { Property } from '../../types/Property';
import { PropertyEnhancer } from './PropertyEnhancer';

export interface ScrapingStats {
  source: string;
  totalAttempted: number;
  totalExtracted: number;
  successRate: number;
  averageCompleteness: number;
  fieldStats: {
    title: { found: number; missing: number; };
    price: { found: number; missing: number; };
    area: { found: number; missing: number; };
    rooms: { found: number; missing: number; };
    location: { found: number; missing: number; };
    image: { found: number; missing: number; };
  };
  qualityDistribution: {
    excellent: number; // 90-100%
    good: number;      // 70-89%
    fair: number;      // 50-69%
    poor: number;      // <50%
  };
}

export class ExtractionStats {
  private static stats: Map<string, ScrapingStats> = new Map();

  /**
   * Record extraction attempt
   */
  static recordAttempt(source: string): void {
    const stats = this.getOrCreateStats(source);
    stats.totalAttempted++;
  }

  /**
   * Record successful extraction
   */
  static recordSuccess(source: string, property: Property): void {
    const stats = this.getOrCreateStats(source);
    stats.totalExtracted++;
    
    // Update field statistics
    this.updateFieldStats(stats, property);
    
    // Update quality distribution
    const completeness = PropertyEnhancer.calculateCompleteness(property);
    this.updateQualityDistribution(stats, completeness);
    
    // Recalculate averages
    this.recalculateStats(stats);
  }

  /**
   * Get statistics for a source
   */
  static getStats(source: string): ScrapingStats | undefined {
    return this.stats.get(source);
  }

  /**
   * Get all statistics
   */
  static getAllStats(): Record<string, ScrapingStats> {
    const result: Record<string, ScrapingStats> = {};
    this.stats.forEach((stats, source) => {
      result[source] = { ...stats };
    });
    return result;
  }

  /**
   * Generate summary report
   */
  static generateReport(): string {
    const allStats = this.getAllStats();
    let report = '\n📊 SCRAPING QUALITY REPORT\n';
    report += '=' .repeat(50) + '\n\n';

    Object.entries(allStats).forEach(([source, stats]) => {
      report += `🔍 ${source.toUpperCase()}\n`;
      report += `   Success Rate: ${stats.successRate.toFixed(1)}% (${stats.totalExtracted}/${stats.totalAttempted})\n`;
      report += `   Avg Completeness: ${stats.averageCompleteness.toFixed(1)}%\n`;
      
      report += `   Field Success:\n`;
      report += `     📝 Title: ${this.getFieldSuccessRate(stats.fieldStats.title)}%\n`;
      report += `     💰 Price: ${this.getFieldSuccessRate(stats.fieldStats.price)}%\n`;
      report += `     📐 Area: ${this.getFieldSuccessRate(stats.fieldStats.area)}%\n`;
      report += `     🏠 Rooms: ${this.getFieldSuccessRate(stats.fieldStats.rooms)}%\n`;
      report += `     📍 Location: ${this.getFieldSuccessRate(stats.fieldStats.location)}%\n`;
      report += `     🖼️ Image: ${this.getFieldSuccessRate(stats.fieldStats.image)}%\n`;
      
      report += `   Quality Distribution:\n`;
      report += `     🌟 Excellent (90-100%): ${stats.qualityDistribution.excellent}\n`;
      report += `     ✅ Good (70-89%): ${stats.qualityDistribution.good}\n`;
      report += `     ⚠️ Fair (50-69%): ${stats.qualityDistribution.fair}\n`;
      report += `     ❌ Poor (<50%): ${stats.qualityDistribution.poor}\n`;
      report += '\n';
    });

    return report;
  }

  /**
   * Reset statistics
   */
  static reset(): void {
    this.stats.clear();
  }

  // Private helper methods
  private static getOrCreateStats(source: string): ScrapingStats {
    if (!this.stats.has(source)) {
      this.stats.set(source, {
        source,
        totalAttempted: 0,
        totalExtracted: 0,
        successRate: 0,
        averageCompleteness: 0,
        fieldStats: {
          title: { found: 0, missing: 0 },
          price: { found: 0, missing: 0 },
          area: { found: 0, missing: 0 },
          rooms: { found: 0, missing: 0 },
          location: { found: 0, missing: 0 },
          image: { found: 0, missing: 0 }
        },
        qualityDistribution: {
          excellent: 0,
          good: 0,
          fair: 0,
          poor: 0
        }
      });
    }
    return this.stats.get(source)!;
  }

  private static updateFieldStats(stats: ScrapingStats, property: Property): void {
    // Title
    if (property.title && property.title.length > 5) {
      stats.fieldStats.title.found++;
    } else {
      stats.fieldStats.title.missing++;
    }

    // Price
    if (property.price && property.price > 100000) {
      stats.fieldStats.price.found++;
    } else {
      stats.fieldStats.price.missing++;
    }

    // Area
    if (property.area && property.area > 20) {
      stats.fieldStats.area.found++;
    } else {
      stats.fieldStats.area.missing++;
    }

    // Rooms
    if (property.rooms && property.rooms > 0) {
      stats.fieldStats.rooms.found++;
    } else {
      stats.fieldStats.rooms.missing++;
    }

    // Location
    if (property.location?.address && property.location.address.length > 5) {
      stats.fieldStats.location.found++;
    } else {
      stats.fieldStats.location.missing++;
    }

    // Image
    if (property.images && property.images.length > 0 && property.images[0].startsWith('http')) {
      stats.fieldStats.image.found++;
    } else {
      stats.fieldStats.image.missing++;
    }
  }

  private static updateQualityDistribution(stats: ScrapingStats, completeness: number): void {
    if (completeness >= 90) {
      stats.qualityDistribution.excellent++;
    } else if (completeness >= 70) {
      stats.qualityDistribution.good++;
    } else if (completeness >= 50) {
      stats.qualityDistribution.fair++;
    } else {
      stats.qualityDistribution.poor++;
    }
  }

  private static recalculateStats(stats: ScrapingStats): void {
    // Success rate
    stats.successRate = stats.totalAttempted > 0 
      ? (stats.totalExtracted / stats.totalAttempted) * 100 
      : 0;

    // Average completeness (simplified calculation)
    const totalQuality = 
      (stats.qualityDistribution.excellent * 95) +
      (stats.qualityDistribution.good * 80) +
      (stats.qualityDistribution.fair * 60) +
      (stats.qualityDistribution.poor * 30);
    
    const totalProperties = 
      stats.qualityDistribution.excellent +
      stats.qualityDistribution.good +
      stats.qualityDistribution.fair +
      stats.qualityDistribution.poor;

    stats.averageCompleteness = totalProperties > 0 
      ? totalQuality / totalProperties 
      : 0;
  }

  private static getFieldSuccessRate(field: { found: number; missing: number; }): string {
    const total = field.found + field.missing;
    if (total === 0) return '0.0';
    return ((field.found / total) * 100).toFixed(1);
  }
}
