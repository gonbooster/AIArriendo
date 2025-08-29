import { Property, SearchCriteria, PreferenceWeights } from '../types';
import { logger } from '../../utils/logger';

export class PropertyScorer {
  private defaultWeights: PreferenceWeights = {
    wetAreas: 1.0,
    sports: 1.0,
    amenities: 0.5,
    location: 0.3,
    pricePerM2: 0.4
  };

  /**
   * Calculate score for a property based on search criteria
   */
  calculateScore(property: Property, criteria: SearchCriteria): number {
    try {
      const weights = criteria.preferences.weights || this.defaultWeights;
      let totalScore = 0;

      // 1. Preference matches score
      const preferenceScore = this.calculatePreferenceScore(property, criteria, weights);
      totalScore += preferenceScore;

      // 2. Price efficiency score (lower price per m² is better)
      const priceScore = this.calculatePriceScore(property, criteria, weights);
      totalScore += priceScore;

      // 3. Location bonus
      const locationScore = this.calculateLocationScore(property, criteria, weights);
      totalScore += locationScore;

      // 4. Area bonus (more area is better, within reason)
      const areaScore = this.calculateAreaScore(property, criteria);
      totalScore += areaScore;

      // 5. Quality indicators
      const qualityScore = this.calculateQualityScore(property);
      totalScore += qualityScore;

      // Store preference matches for display
      property.preferenceMatches = this.getPreferenceMatches(property, criteria);
      property.score = Math.round(totalScore * 100) / 100;

      return property.score;

    } catch (error) {
      logger.warn(`Error calculating score for property ${property.id}:`, error);
      return 0;
    }
  }

  /**
   * Calculate preference-based score
   */
  private calculatePreferenceScore(
    property: Property, 
    criteria: SearchCriteria, 
    weights: PreferenceWeights
  ): number {
    let score = 0;
    const amenities = property.amenities.map(a => a.toLowerCase());

    // Wet areas (jacuzzi, sauna, turco)
    const wetAreaMatches = criteria.preferences.wetAreas.filter(area =>
      amenities.some(amenity => amenity.includes(area.toLowerCase()))
    );
    score += wetAreaMatches.length * weights.wetAreas;

    // Sports facilities
    const sportsMatches = criteria.preferences.sports.filter(sport =>
      amenities.some(amenity => amenity.includes(sport.toLowerCase()))
    );
    score += sportsMatches.length * weights.sports;

    // General amenities
    const amenityMatches = criteria.preferences.amenities.filter(pref =>
      amenities.some(amenity => amenity.includes(pref.toLowerCase()))
    );
    score += amenityMatches.length * weights.amenities;

    return score;
  }

  /**
   * Calculate price efficiency score
   */
  private calculatePriceScore(
    property: Property, 
    criteria: SearchCriteria, 
    weights: PreferenceWeights
  ): number {
    const maxBudget = criteria.hardRequirements.maxTotalPrice;
    const priceRatio = property.totalPrice / maxBudget;

    // Better score for properties that cost less relative to budget
    // Score ranges from 0 to weights.pricePerM2
    const priceEfficiencyScore = (1 - priceRatio) * weights.pricePerM2;

    // Bonus for good price per m² (below market average ~35,000 COP/m²)
    const marketAvgPricePerM2 = 35000;
    if (property.pricePerM2 < marketAvgPricePerM2) {
      const pricePerM2Bonus = ((marketAvgPricePerM2 - property.pricePerM2) / marketAvgPricePerM2) * 0.5;
      return priceEfficiencyScore + pricePerM2Bonus;
    }

    return Math.max(0, priceEfficiencyScore);
  }

  /**
   * Calculate location-based score
   */
  private calculateLocationScore(
    property: Property,
    criteria: SearchCriteria,
    weights: PreferenceWeights
  ): number {
    let score = 0;

    // MAJOR BONUS: Exact location match from hard requirements
    if ((property as any).locationMatch === true) {
      score += weights.location * 2.0; // Double bonus for exact match
    }

    // Preferred neighborhoods bonus (from optional filters)
    if (criteria.optionalFilters?.neighborhoods?.length) {
      const isPreferredNeighborhood = criteria.optionalFilters.neighborhoods.some(neighborhood =>
        property.location.neighborhood?.toLowerCase().includes(neighborhood.toLowerCase())
      );
      if (isPreferredNeighborhood) {
        score += weights.location;
      }
    }

    // Hard requirements neighborhoods bonus (even if not exact match)
    if (criteria.hardRequirements.location?.neighborhoods?.length) {
      const isRequestedNeighborhood = criteria.hardRequirements.location.neighborhoods.some(neighborhood =>
        property.location.neighborhood?.toLowerCase().includes(neighborhood.toLowerCase()) ||
        property.location.address?.toLowerCase().includes(neighborhood.toLowerCase())
      );
      if (isRequestedNeighborhood) {
        score += weights.location * 1.5; // High bonus for requested location
      }
    }

    // Premium neighborhoods bonus (generic)
    const premiumNeighborhoods = [
      'rosales', 'zona rosa', 'chico', 'la cabrera', 'el nogal', 'virrey', 'usaquen', 'cedritos', 'santa barbara'
    ];
    const isPremiumNeighborhood = premiumNeighborhoods.some(premium =>
      property.location.neighborhood?.toLowerCase().includes(premium)
    );
    if (isPremiumNeighborhood) {
      score += weights.location * 0.3; // Smaller bonus for premium areas
    }

    // Street/Carrera preference (higher numbers generally better in north Bogotá)
    if (property.location.street && property.location.street >= 120) {
      score += 0.1; // Small bonus for good streets
    }

    return score;
  }

  /**
   * Calculate area-based score
   */
  private calculateAreaScore(property: Property, criteria: SearchCriteria): number {
    const minArea = criteria.hardRequirements.minArea;
    const extraArea = property.area - minArea;

    // Bonus for extra area, but with diminishing returns
    if (extraArea > 0) {
      return Math.min(0.5, extraArea / 100); // Max 0.5 points for area
    }

    return 0;
  }

  /**
   * Calculate quality indicators score
   */
  private calculateQualityScore(property: Property): number {
    let score = 0;

    // Image quality indicator
    if (property.images.length > 3) {
      score += 0.1;
    }

    // Description quality
    if (property.description && property.description.length > 100) {
      score += 0.1;
    }

    // Contact information completeness
    if (property.contactInfo?.phone || property.contactInfo?.email) {
      score += 0.1;
    }

    // Recent listing bonus
    if (property.publishedDate) {
      const daysSincePublished = (Date.now() - property.publishedDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSincePublished <= 7) {
        score += 0.2; // Bonus for listings less than a week old
      }
    }

    return score;
  }

  /**
   * Get list of preference matches for display
   */
  private getPreferenceMatches(property: Property, criteria: SearchCriteria): string[] {
    const matches: string[] = [];
    const amenities = property.amenities.map(a => a.toLowerCase());

    // Check wet areas
    criteria.preferences.wetAreas.forEach(area => {
      if (amenities.some(amenity => amenity.includes(area.toLowerCase()))) {
        matches.push(area);
      }
    });

    // Check sports
    criteria.preferences.sports.forEach(sport => {
      if (amenities.some(amenity => amenity.includes(sport.toLowerCase()))) {
        matches.push(sport);
      }
    });

    // Check amenities
    criteria.preferences.amenities.forEach(pref => {
      if (amenities.some(amenity => amenity.includes(pref.toLowerCase()))) {
        matches.push(pref);
      }
    });

    return [...new Set(matches)]; // Remove duplicates
  }

  /**
   * Batch score multiple properties
   */
  scoreProperties(properties: Property[], criteria: SearchCriteria): Property[] {
    logger.info(`Scoring ${properties.length} properties`);

    const scoredProperties = properties.map(property => {
      this.calculateScore(property, criteria);
      return property;
    });

    // Sort by score (highest first)
    scoredProperties.sort((a, b) => (b.score || 0) - (a.score || 0));

    logger.info(`Properties scored and sorted. Top score: ${scoredProperties[0]?.score || 0}`);
    return scoredProperties;
  }

  /**
   * Get scoring explanation for a property
   */
  getScoreExplanation(property: Property, criteria: SearchCriteria): any {
    const weights = criteria.preferences.weights || this.defaultWeights;
    
    return {
      totalScore: property.score,
      breakdown: {
        preferences: {
          score: this.calculatePreferenceScore(property, criteria, weights),
          matches: property.preferenceMatches || []
        },
        priceEfficiency: {
          score: this.calculatePriceScore(property, criteria, weights),
          pricePerM2: property.pricePerM2,
          budgetUsed: `${((property.totalPrice / criteria.hardRequirements.maxTotalPrice) * 100).toFixed(1)}%`
        },
        location: {
          score: this.calculateLocationScore(property, criteria, weights),
          neighborhood: property.location.neighborhood,
          isPremium: this.isPremiumLocation(property)
        },
        area: {
          score: this.calculateAreaScore(property, criteria),
          extraArea: property.area - criteria.hardRequirements.minArea
        },
        quality: {
          score: this.calculateQualityScore(property),
          indicators: this.getQualityIndicators(property)
        }
      }
    };
  }

  /**
   * Check if location is premium
   */
  private isPremiumLocation(property: Property): boolean {
    const premiumNeighborhoods = [
      'rosales', 'zona rosa', 'chico', 'la cabrera', 'el nogal', 'virrey'
    ];
    return premiumNeighborhoods.some(premium =>
      property.location.neighborhood?.toLowerCase().includes(premium)
    );
  }

  /**
   * Get quality indicators for a property
   */
  private getQualityIndicators(property: Property): string[] {
    const indicators: string[] = [];

    if (property.images.length > 3) indicators.push('Multiple images');
    if (property.description && property.description.length > 100) indicators.push('Detailed description');
    if (property.contactInfo?.phone || property.contactInfo?.email) indicators.push('Contact info available');
    if (property.publishedDate) {
      const daysSincePublished = (Date.now() - property.publishedDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSincePublished <= 7) indicators.push('Recently published');
    }

    return indicators;
  }
}
