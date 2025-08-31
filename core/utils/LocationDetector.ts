
import citiesData from '../data/cities.json';
import neighborhoodsData from '../data/neighborhoods.json';

export interface LocationInfo {
  city: string;
  cityCode?: string;
  neighborhood?: string;
  originalText: string;
  confidence: number;
}

// ============================================================================
// CONFIGURACIÓN DESDE JSON - FUENTE ÚNICA DE VERDAD
// ============================================================================

interface CityConfig {
  name: string;
  code: string;
  aliases: string[];
  urls: {
    standard?: string;
    mercadolibre?: string;
    properati?: string;
  };
}

interface NeighborhoodConfig {
  name: string;
  aliases: string[];
  city: string;
  urls: {
    standard?: string;
    pads?: string;
    mercadolibre?: string;
    rentola?: string;
  };
}

export class LocationDetector {

  // ============================================================================
  // CONFIGURACIÓN DESDE JSON - LIMPIO Y MANTENIBLE
  // ============================================================================

  private static readonly CITIES_CONFIG: CityConfig[] = citiesData.cities;
  private static readonly NEIGHBORHOODS_CONFIG: NeighborhoodConfig[] = neighborhoodsData.neighborhoods;

  // CONFIGURACIÓN ELIMINADA - AHORA SE CARGA DESDE JSON

  // ============================================================================
  // MAPEOS GENERADOS AUTOMÁTICAMENTE - ELIMINA DUPLICACIÓN
  // ============================================================================

  private static readonly CITIES_MAP = LocationDetector.generateCitiesMap();
  private static readonly NEIGHBORHOODS_MAP = LocationDetector.generateNeighborhoodsMap();
  private static readonly URL_MAPPINGS = LocationDetector.generateUrlMappings();

  // ============================================================================
  // GENERADORES AUTOMÁTICOS - CORAZÓN DE LA OPTIMIZACIÓN
  // ============================================================================

  private static generateCitiesMap(): Map<string, { code: string; canonical: string }> {
    const map = new Map();
    
    this.CITIES_CONFIG.forEach(city => {
      // Nombre principal
      map.set(city.name, { code: city.code, canonical: city.name });
      
      // Aliases
      city.aliases.forEach(alias => {
        map.set(alias, { code: city.code, canonical: city.name });
      });
    });
    
    return map;
  }

  private static generateNeighborhoodsMap(): Map<string, { city: string; canonical: string }> {
    const map = new Map();
    
    this.NEIGHBORHOODS_CONFIG.forEach(neighborhood => {
      // Nombre principal
      map.set(neighborhood.name, { city: neighborhood.city, canonical: neighborhood.name });
      
      // Aliases
      neighborhood.aliases.forEach(alias => {
        map.set(alias, { city: neighborhood.city, canonical: neighborhood.name });
      });
    });
    
    return map;
  }

  private static generateUrlMappings(): {
    cities: { [scraper: string]: Map<string, string> };
    neighborhoods: { [scraper: string]: Map<string, string> };
  } {
    const cityMappings: { [scraper: string]: Map<string, string> } = {
      standard: new Map(),
      mercadolibre: new Map(),
      properati: new Map()
    };

    const neighborhoodMappings: { [scraper: string]: Map<string, string> } = {
      standard: new Map(),
      pads: new Map(),
      mercadolibre: new Map(),
      rentola: new Map()
    };

    // Generar mapeos de ciudades
    this.CITIES_CONFIG.forEach(city => {
      const addCityMapping = (name: string) => {
        cityMappings.standard.set(name, city.urls.standard || city.name);
        cityMappings.mercadolibre.set(name, city.urls.mercadolibre || city.urls.standard || city.name);
        cityMappings.properati.set(name, city.urls.properati || city.urls.standard || city.name);
      };

      addCityMapping(city.name);
      city.aliases.forEach(addCityMapping);
    });

    // Generar mapeos de barrios
    this.NEIGHBORHOODS_CONFIG.forEach(neighborhood => {
      const addNeighborhoodMapping = (name: string) => {
        neighborhoodMappings.standard.set(name, neighborhood.urls.standard || neighborhood.name);
        neighborhoodMappings.pads.set(name, neighborhood.urls.pads || neighborhood.urls.standard || neighborhood.name);
        neighborhoodMappings.mercadolibre.set(name, neighborhood.urls.mercadolibre || neighborhood.urls.standard || neighborhood.name);
        neighborhoodMappings.rentola.set(name, neighborhood.urls.rentola || `bogota-localidad-${neighborhood.urls.standard || neighborhood.name}`);
      };

      addNeighborhoodMapping(neighborhood.name);
      neighborhood.aliases.forEach(addNeighborhoodMapping);
    });

    return { cities: cityMappings, neighborhoods: neighborhoodMappings };
  }

  // ============================================================================
  // API PÚBLICA - SIMPLE Y CONSISTENTE
  // ============================================================================

  /**
   * Detecta ubicación desde texto de búsqueda
   */
  static detectLocation(searchText: string): LocationInfo {
    const text = searchText.toLowerCase().trim();
    
    // Detectar ciudad
    const cityResult = this.detectCity(text);
    
    // Detectar barrio
    const neighborhoodResult = this.detectNeighborhood(text);
    
    // Si el barrio detectó una ciudad diferente, usar esa
    const finalCity = neighborhoodResult?.city || cityResult.city;
    const finalCityCode = this.CITIES_MAP.get(finalCity)?.code;
    
    // Calcular confianza combinada
    let confidence = cityResult.confidence;
    if (neighborhoodResult) {
      confidence = Math.max(confidence, 0.9); // Alta confianza si encontramos barrio
    }
    
    return {
      city: finalCity,
      cityCode: finalCityCode,
      neighborhood: neighborhoodResult?.neighborhood,
      originalText: searchText,
      confidence
    };
  }

  /**
   * Obtener URL de ciudad para scraper específico
   */
  static getCityUrl(city: string, scraper: 'standard' | 'mercadolibre' | 'properati' = 'standard'): string {
    return this.URL_MAPPINGS.cities[scraper].get(city?.toLowerCase()) || 'bogota';
  }

  /**
   * Obtener URL de barrio para scraper específico
   */
  static getNeighborhoodUrl(neighborhood: string, scraper: 'standard' | 'pads' | 'mercadolibre' | 'rentola' = 'standard'): string | null {
    return this.URL_MAPPINGS.neighborhoods[scraper].get(neighborhood?.toLowerCase()) || null;
  }

  /**
   * Obtener todos los barrios de una ciudad
   */
  static getNeighborhoodsByCity(city: string): string[] {
    return this.NEIGHBORHOODS_CONFIG
      .filter(n => n.city === city)
      .map(n => n.name);
  }

  /**
   * Verificar si hay caracteres especiales para "buscar todo"
   */
  static hasSpecialSearchChars(neighborhoods: string[]): boolean {
    const specialChars = ['*', '.', '?', '+', '!', '@', '#', '$', '%', '^', '&'];
    return neighborhoods.some(n => {
      const cleaned = n.trim();
      return cleaned.length <= 1 || specialChars.includes(cleaned) || /^[^\w\s]+$/.test(cleaned);
    });
  }

  /**
   * Obtener variaciones de barrios
   */
  static getNeighborhoodVariations(neighborhood: string): string[] {
    const config = this.NEIGHBORHOODS_CONFIG.find(n => 
      n.name === neighborhood.toLowerCase() || n.aliases.includes(neighborhood.toLowerCase())
    );
    
    return config ? [config.name, ...config.aliases] : [];
  }

  // ============================================================================
  // MÉTODOS PRIVADOS - LÓGICA INTERNA
  // ============================================================================

  private static detectCity(text: string): { city: string; confidence: number } {
    // Buscar coincidencia directa
    for (const [cityName, cityInfo] of this.CITIES_MAP) {
      if (text.includes(cityName)) {
        return { city: cityInfo.canonical, confidence: cityName === cityInfo.canonical ? 1.0 : 0.9 };
      }
    }

    return { city: '', confidence: 0.3 };
  }

  private static detectNeighborhood(text: string): { neighborhood: string; city: string } | null {
    // Buscar coincidencia directa
    for (const [neighborhoodName, neighborhoodInfo] of this.NEIGHBORHOODS_MAP) {
      if (text.includes(neighborhoodName)) {
        return { neighborhood: neighborhoodInfo.canonical, city: neighborhoodInfo.city };
      }
    }
    
    return null;
  }

  /**
   * Construir URL de scraper dinámicamente
   */
  static buildScraperUrl(baseUrl: string, city: string, neighborhood?: string, scraper: string = 'standard'): string {
    const cityUrl = this.getCityUrl(city, scraper as any);
    let url = `${baseUrl}/${cityUrl}`;
    
    if (neighborhood) {
      const neighborhoodUrl = this.getNeighborhoodUrl(neighborhood, scraper as any);
      if (neighborhoodUrl) {
        url += `/${neighborhoodUrl}`;
      }
    }
    
    return url;
  }
}
