
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
    fincaraiz?: string;
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
    fincaraiz?: string;
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
      fincaraiz: new Map(),
      mercadolibre: new Map(),
      properati: new Map()
    };

    const neighborhoodMappings: { [scraper: string]: Map<string, string> } = {
      standard: new Map(),
      fincaraiz: new Map(),
      pads: new Map(),
      mercadolibre: new Map(),
      rentola: new Map()
    };

    // Generar mapeos de ciudades
    this.CITIES_CONFIG.forEach(city => {
      const addCityMapping = (name: string) => {
        cityMappings.standard.set(name, city.urls.standard || city.name);
        cityMappings.fincaraiz.set(name, city.urls.fincaraiz || city.urls.standard || city.name);
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
        neighborhoodMappings.fincaraiz.set(name, neighborhood.urls.fincaraiz || neighborhood.urls.standard || neighborhood.name);
        neighborhoodMappings.pads.set(name, neighborhood.urls.pads || neighborhood.urls.standard || neighborhood.name);
        neighborhoodMappings.mercadolibre.set(name, neighborhood.urls.mercadolibre || neighborhood.urls.standard || neighborhood.name);
        neighborhoodMappings.rentola.set(name, neighborhood.urls.rentola || neighborhood.urls.standard || neighborhood.name);
      };

      addNeighborhoodMapping(neighborhood.name);
      neighborhood.aliases.forEach(addNeighborhoodMapping);
    });

    return { cities: cityMappings, neighborhoods: neighborhoodMappings };
  }

  // ============================================================================
  // FUNCIONES PARA OBTENER URLs - REQUERIDAS POR SCRAPERS
  // ============================================================================

  /**
   * Obtener URL de ciudad para un scraper específico
   */
  static getCityUrl(cityName: string, scraperType: string): string {
    const cityMapping = this.URL_MAPPINGS.cities[scraperType];
    if (!cityMapping) return cityName.toLowerCase().replace(/\s+/g, '-');

    return cityMapping.get(cityName.toLowerCase()) || cityName.toLowerCase().replace(/\s+/g, '-');
  }

  /**
   * Obtener URL de barrio para un scraper específico
   */
  static getNeighborhoodUrl(neighborhoodName: string, scraperType: string): string {
    if (!neighborhoodName) return '';

    const neighborhoodMapping = this.URL_MAPPINGS.neighborhoods[scraperType];
    if (!neighborhoodMapping) return neighborhoodName.toLowerCase().replace(/\s+/g, '-');

    return neighborhoodMapping.get(neighborhoodName.toLowerCase()) || neighborhoodName.toLowerCase().replace(/\s+/g, '-');
  }

  /**
   * Construir URL completa para scraper
   */
  static buildScraperUrl(baseUrl: string, cityName: string, neighborhoodName?: string, scraperType: string = 'standard'): string {
    const cityUrl = this.getCityUrl(cityName, scraperType);

    if (neighborhoodName) {
      const neighborhoodUrl = this.getNeighborhoodUrl(neighborhoodName, scraperType);
      return `${baseUrl}/${cityUrl}/${neighborhoodUrl}`;
    }

    return `${baseUrl}/${cityUrl}`;
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
   * 🚀 BÚSQUEDA INTELIGENTE DE UBICACIÓN
   * Busca ciudades, barrios y zonas desde texto libre
   */
  static smartLocationSearch(searchText: string): {
    cities: Array<{name: string, code: string, confidence: number}>;
    neighborhoods: Array<{name: string, city: string, confidence: number}>;
    zones: Array<{name: string, city: string, confidence: number}>;
    bestMatch: {type: 'city' | 'neighborhood' | 'zone', name: string, city?: string, confidence: number} | null;
  } {
    if (!searchText || typeof searchText !== 'string') {
      return { cities: [], neighborhoods: [], zones: [], bestMatch: null };
    }

    const normalizedSearch = this.normalizeText(searchText);
    const results = {
      cities: [] as Array<{name: string, code: string, confidence: number}>,
      neighborhoods: [] as Array<{name: string, city: string, confidence: number}>,
      zones: [] as Array<{name: string, city: string, confidence: number}>,
      bestMatch: null as any
    };

    let bestConfidence = 0;

    // 🔍 BUSCAR CIUDADES
    this.CITIES_CONFIG.forEach(city => {
      const cityNames = [city.name, ...city.aliases];
      cityNames.forEach(name => {
        const confidence = this.calculateSimilarity(normalizedSearch, this.normalizeText(name));
        if (confidence > 0.6) { // Umbral de similitud
          results.cities.push({ name: city.name, code: city.code, confidence });
          if (confidence > bestConfidence) {
            bestConfidence = confidence;
            results.bestMatch = { type: 'city', name: city.name, confidence };
          }
        }
      });
    });

    // 🔍 BUSCAR BARRIOS
    this.NEIGHBORHOODS_CONFIG.forEach(neighborhood => {
      const neighborhoodNames = [neighborhood.name, ...neighborhood.aliases];
      neighborhoodNames.forEach(name => {
        const confidence = this.calculateSimilarity(normalizedSearch, this.normalizeText(name));
        if (confidence > 0.6) {
          results.neighborhoods.push({
            name: neighborhood.name,
            city: neighborhood.city,
            confidence
          });
          if (confidence > bestConfidence) {
            bestConfidence = confidence;
            results.bestMatch = {
              type: 'neighborhood',
              name: neighborhood.name,
              city: neighborhood.city,
              confidence
            };
          }
        }
      });
    });

    // Ordenar por confianza
    results.cities.sort((a, b) => b.confidence - a.confidence);
    results.neighborhoods.sort((a, b) => b.confidence - a.confidence);

    return results;
  }

  /**
   * 🧠 NORMALIZAR TEXTO para comparación inteligente
   */
  private static normalizeText(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD') // Descomponer caracteres acentuados
      .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
      .replace(/[^\w\s]/g, '') // Eliminar caracteres especiales
      .replace(/\s+/g, ' ') // Normalizar espacios
      .trim();
  }

  /**
   * 🎯 CALCULAR SIMILITUD entre dos textos
   */
  private static calculateSimilarity(text1: string, text2: string): number {
    // Coincidencia exacta
    if (text1 === text2) return 1.0;

    // Contiene la búsqueda completa
    if (text2.includes(text1) || text1.includes(text2)) return 0.9;

    // Similitud por palabras
    const words1 = text1.split(' ').filter(w => w.length > 2);
    const words2 = text2.split(' ').filter(w => w.length > 2);

    if (words1.length === 0 || words2.length === 0) return 0;

    let matches = 0;
    words1.forEach(word1 => {
      words2.forEach(word2 => {
        if (word1 === word2 || word1.includes(word2) || word2.includes(word1)) {
          matches++;
        }
      });
    });

    return matches / Math.max(words1.length, words2.length);
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

}
