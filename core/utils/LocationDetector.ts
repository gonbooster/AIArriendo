/**
 * SISTEMA DE DETECCIÓN INTELIGENTE DE UBICACIÓN
 * 
 * Detecta automáticamente ciudades y barrios desde texto de búsqueda
 * Soporta múltiples ciudades colombianas y sus barrios principales
 */

export interface LocationInfo {
  city: string;
  cityCode?: string;
  neighborhood?: string;
  originalText: string;
  confidence: number; // 0-1, qué tan seguro está de la detección
}

export class LocationDetector {

  // ============================================================================
  // MAPEOS CENTRALIZADOS PARA TODOS LOS SCRAPERS
  // ============================================================================

  // Mapeo de ciudades principales con sus códigos
  private static readonly CITIES: { [key: string]: { code: string; aliases: string[] } } = {
    // Bogotá
    'bogotá': { code: '11001', aliases: ['bogota', 'santafe de bogota', 'distrito capital'] },
    'cali': { code: '76001', aliases: ['santiago de cali', 'sucursal del cielo'] },
    'barranquilla': { code: '08001', aliases: ['curramba', 'puerta de oro'] },
    'cartagena': { code: '13001', aliases: ['cartagena de indias', 'ciudad heroica'] },
    'bucaramanga': { code: '68001', aliases: ['ciudad bonita', 'ciudad de los parques'] },
    'pereira': { code: '66001', aliases: ['ciudad sin puertas', 'perla del otún'] },
    'ibagué': { code: '73001', aliases: ['ibague', 'ciudad musical'] },
    'ibague': { code: '73001', aliases: ['ibagué', 'ciudad musical'] },
    'manizales': { code: '17001', aliases: ['ciudad de las puertas abiertas'] },
    'villavicencio': { code: '50001', aliases: ['villavo', 'puerta del llano'] },
    'pasto': { code: '52001', aliases: ['ciudad sorpresa'] },
    'montería': { code: '23001', aliases: ['monteria', 'perla del sinú'] },
    'monteria': { code: '23001', aliases: ['montería', 'perla del sinú'] },
    'valledupar': { code: '20001', aliases: ['ciudad de los santos reyes'] },
    'neiva': { code: '41001', aliases: ['capital del huila'] },
    'soledad': { code: '08756', aliases: [] },
    'armenia': { code: '63001', aliases: ['ciudad milagro'] },
    'soacha': { code: '25754', aliases: [] },
    'popayán': { code: '19001', aliases: ['popayan', 'ciudad blanca'] },
    'popayan': { code: '19001', aliases: ['popayán', 'ciudad blanca'] }
  };

  // ============================================================================
  // MAPEOS DE URL PARA CADA SCRAPER - CENTRALIZADOS
  // ============================================================================

  // Mapeos de ciudades para URLs de scrapers
  public static readonly CITY_URL_MAPPINGS = {
    // Mapeo estándar (usado por la mayoría)
    standard: {
      'bogotá': 'bogota',
      'bogota': 'bogota',
      'medellín': 'medellin',
      'medellin': 'medellin',
      'cali': 'cali',
      'barranquilla': 'barranquilla',
      'cartagena': 'cartagena',
      'bucaramanga': 'bucaramanga',
      'pereira': 'pereira',
      'ibagué': 'ibague',
      'ibague': 'ibague'
    },

    // Mapeo específico para Properati
    properati: {
      'bogotá': 'bogota-d-c-colombia',
      'bogota': 'bogota-d-c-colombia',
      'medellín': 'medellin-antioquia-colombia',
      'medellin': 'medellin-antioquia-colombia',
      'cali': 'cali-valle-del-cauca-colombia',
      'barranquilla': 'barranquilla-atlantico-colombia',
      'cartagena': 'cartagena-bolivar-colombia',
      'bucaramanga': 'bucaramanga-santander-colombia',
      'pereira': 'pereira-risaralda-colombia',
      'ibagué': 'ibague-tolima-colombia',
      'ibague': 'ibague-tolima-colombia'
    },

    // Mapeo específico para MercadoLibre
    mercadolibre: {
      'bogotá': 'bogota',
      'bogota': 'bogota',
      'medellín': 'antioquia/medellin',
      'medellin': 'antioquia/medellin',
      'cali': 'valle-del-cauca/cali',
      'barranquilla': 'atlantico/barranquilla',
      'cartagena': 'bolivar/cartagena',
      'bucaramanga': 'santander/bucaramanga',
      'pereira': 'risaralda/pereira',
      'ibagué': 'tolima/ibague',
      'ibague': 'tolima/ibague'
    }
  };

  // ============================================================================
  // MAPEOS DE BARRIOS PARA URLS - CENTRALIZADOS
  // ============================================================================

  // Mapeos de barrios para URLs de scrapers
  public static readonly NEIGHBORHOOD_URL_MAPPINGS = {
    // Mapeo estándar (usado por la mayoría de scrapers)
    standard: {
      'usaquén': 'usaquen',
      'usaquen': 'usaquen',
      'chapinero': 'chapinero',
      'zona rosa': 'zona-rosa',
      'chico': 'chico',
      'rosales': 'rosales',
      'cedritos': 'cedritos',
      'santa barbara': 'santa-barbara',
      'santa bárbara': 'santa-barbara',
      'suba': 'suba',
      'kennedy': 'kennedy',
      'engativá': 'engativa',
      'engativa': 'engativa',
      'fontibón': 'fontibon',
      'fontibon': 'fontibon',
      'centro': 'centro',
      'la candelaria': 'la-candelaria',
      // Barrios de otras ciudades
      'el poblado': 'el-poblado',
      'poblado': 'el-poblado',
      'laureles': 'laureles',
      'granada': 'granada'
    },

    // Mapeo específico para PADS
    pads: {
      'usaquén': 'usaquen',
      'usaquen': 'usaquen',
      'chapinero': 'chapinero',
      'zona rosa': 'chapinero/zona-rosa',
      'chico': 'chapinero/chico',
      'rosales': 'chapinero/rosales',
      'cedritos': 'cedritos',
      'santa barbara': 'santa-barbara',
      'santa bárbara': 'santa-barbara',
      'suba': 'suba',
      'centro': 'centro',
      'la candelaria': 'centro/la-candelaria',
      'el poblado': 'el-poblado',
      'poblado': 'el-poblado',
      'laureles': 'laureles',
      'granada': 'granada'
    },

    // Mapeo específico para MercadoLibre
    mercadolibre: {
      'usaquén': 'usaquen',
      'usaquen': 'usaquen',
      'chapinero': 'chapinero',
      'zona rosa': 'zona-rosa',
      'chico': 'chico',
      'rosales': 'rosales',
      'cedritos': 'cedritos',
      'santa barbara': 'santa-barbara',
      'santa bárbara': 'santa-barbara',
      'suba': 'suba',
      'kennedy': 'kennedy',
      'engativá': 'engativa',
      'engativa': 'engativa',
      'fontibón': 'fontibon',
      'fontibon': 'fontibon',
      'centro': 'centro',
      'la candelaria': 'candelaria'
    }
  };

  // Barrios principales por ciudad
  private static readonly NEIGHBORHOODS: { [key: string]: string[] } = {
    // Bogotá
    'bogotá': [
      'usaquén', 'usaquen', 'chapinero', 'santa fe', 'san cristóbal', 'san cristobal',
      'tunjuelito', 'bosa', 'kennedy', 'fontibón', 'fontibon', 'engativá', 'engativa',
      'suba', 'barrios unidos', 'teusaquillo', 'los mártires', 'los martires',
      'antonio nariño', 'antonio narino', 'puente aranda', 'la candelaria',
      'rafael uribe uribe', 'ciudad bolívar', 'ciudad bolivar', 'sumapaz',
      
      // Barrios específicos populares
      'zona rosa', 'chico', 'rosales', 'nogal', 'chicó', 'la macarena',
      'centro', 'candelaria', 'cedritos', 'santa barbara', 'santa bárbara',
      'el virrey', 'la cabrera', 'el retiro', 'el chicó', 'el chico',
      'las aguas', 'egipto', 'san felipe', 'el poblado bogotá', 'poblado bogota',
      'niza', 'alhambra', 'lisboa', 'santa cecilia', 'bilbao', 'suba centro',
      'gratamira', 'san patricio', 'cedro narvaez', 'cedro narváez'
    ],
    
    // Medellín
    'medellín': [
      'el poblado', 'poblado', 'laureles', 'estadio', 'la candelaria medellin',
      'buenos aires', 'la américa', 'la america', 'san javier', 'el dorado',
      'manrique', 'aranjuez', 'castilla', 'doce de octubre', 'robledo',
      'villa hermosa', 'belén', 'belen', 'guayabal', 'envigado', 'sabaneta',
      'itagüí', 'itagui', 'bello', 'copacabana', 'girardota', 'barbosa',
      
      // Barrios específicos
      'zona rosa medellin', 'manila', 'patio bonito', 'conquistadores',
      'los balsos', 'alejandría', 'alejandria', 'el tesoro', 'san lucas',
      'loma de los bernal', 'provenza', 'golden mile', 'oviedo'
    ],
    
    // Cali
    'cali': [
      'granada', 'san fernando', 'el peñón', 'el penon', 'ciudad jardín', 'ciudad jardin',
      'santa mónica', 'santa monica', 'el ingenio', 'pance', 'la flora',
      'normandía', 'normandia', 'santa rita', 'san antonio', 'el refugio',
      'chipichape', 'centenario', 'versalles', 'santa teresita', 'el lido',
      'juanambú', 'juanambu', 'la base', 'los andes', 'la merced'
    ],
    
    // Barranquilla
    'barranquilla': [
      'el prado', 'alto prado', 'ciudad jardín barranquilla', 'ciudad jardin barranquilla',
      'el golf', 'villa country', 'villa santos', 'riomar', 'el limón', 'el limon',
      'las flores', 'boston', 'el recreo', 'la concepción', 'la concepcion'
    ],
    
    // Bucaramanga
    'bucaramanga': [
      'cabecera', 'la flora bucaramanga', 'san alonso', 'provenza bucaramanga',
      'álamos', 'alamos', 'sotomayor', 'mutis', 'garcía rovira', 'garcia rovira'
    ]
  };

  /**
   * Detecta ciudad y barrio desde texto de búsqueda
   */
  static detectLocation(searchText: string): LocationInfo {
    const text = searchText.toLowerCase().trim();

    // Detectar ciudad
    const cityInfo = this.detectCity(text);

    // Detectar barrio
    const neighborhoodInfo = this.detectNeighborhood(text, cityInfo.city);

    // Si el barrio detectó una ciudad diferente, usar esa ciudad
    let finalCity = cityInfo.city;
    let finalCityCode = cityInfo.code;
    let finalCityConfidence = cityInfo.confidence;

    if (neighborhoodInfo.detectedCity) {
      finalCity = neighborhoodInfo.detectedCity;
      const detectedCityInfo = this.CITIES[neighborhoodInfo.detectedCity];
      finalCityCode = detectedCityInfo?.code;
      finalCityConfidence = 1.0; // Alta confianza si detectamos por barrio
    }

    // Calcular confianza combinada de manera más inteligente
    let combinedConfidence = finalCityConfidence;

    if (neighborhoodInfo.neighborhood) {
      // Si encontramos barrio, aumentar la confianza
      combinedConfidence = Math.max(finalCityConfidence, neighborhoodInfo.confidence);

      // Si la ciudad fue detectada por fallback pero encontramos barrio específico, mejorar confianza
      if (finalCityConfidence <= 0.3 && neighborhoodInfo.confidence >= 0.8) {
        combinedConfidence = 0.8;
      }
    }

    return {
      city: finalCity,
      cityCode: finalCityCode,
      neighborhood: neighborhoodInfo.neighborhood,
      originalText: searchText,
      confidence: combinedConfidence
    };
  }

  /**
   * Detecta ciudad desde texto
   */
  private static detectCity(text: string): { city: string; code?: string; confidence: number } {
    // Buscar coincidencia directa
    for (const [city, info] of Object.entries(this.CITIES)) {
      if (text.includes(city)) {
        return { city, code: info.code, confidence: 1.0 };
      }
      
      // Buscar en aliases
      for (const alias of info.aliases) {
        if (text.includes(alias)) {
          return { city, code: info.code, confidence: 0.9 };
        }
      }
    }
    
    // Si no encuentra ciudad específica, usar Bogotá como fallback (ciudad principal)
    return { city: 'bogotá', code: '11001', confidence: 0.3 };
  }

  /**
   * Detecta barrio desde texto
   */
  private static detectNeighborhood(text: string, city: string): { neighborhood?: string; confidence: number; detectedCity?: string } {
    // Primero buscar en todas las ciudades para detectar mejor la ciudad correcta
    for (const [cityName, neighborhoods] of Object.entries(this.NEIGHBORHOODS)) {
      for (const neighborhood of neighborhoods) {
        if (text.includes(neighborhood)) {
          // Si encontramos el barrio en una ciudad diferente, actualizar la ciudad
          if (cityName !== city) {
            return { neighborhood, confidence: 1.0, detectedCity: cityName };
          }
          return { neighborhood, confidence: 1.0 };
        }
      }
    }

    // Buscar coincidencia parcial en la ciudad especificada
    const cityNeighborhoods = this.NEIGHBORHOODS[city] || this.NEIGHBORHOODS['bogotá'];
    for (const neighborhood of cityNeighborhoods) {
      const normalized = this.normalizeText(neighborhood);
      const normalizedText = this.normalizeText(text);

      if (normalizedText.includes(normalized) || normalized.includes(normalizedText)) {
        return { neighborhood, confidence: 0.8 };
      }
    }

    return { confidence: 0.5 };
  }

  /**
   * Normaliza texto para comparación
   */
  private static normalizeText(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remover acentos
      .replace(/[^a-z0-9\s]/g, '') // Solo letras, números y espacios
      .trim();
  }

  /**
   * Obtiene información de ciudad por código
   */
  static getCityByCode(code: string): string | null {
    for (const [city, info] of Object.entries(this.CITIES)) {
      if (info.code === code) {
        return city;
      }
    }
    return null;
  }

  /**
   * Obtiene todos los barrios de una ciudad
   */
  static getNeighborhoodsByCity(city: string): string[] {
    return this.NEIGHBORHOODS[city.toLowerCase()] || [];
  }

  // ============================================================================
  // MÉTODOS PÚBLICOS PARA SCRAPERS - ELIMINAR DUPLICACIÓN
  // ============================================================================

  /**
   * Obtener mapeo de ciudad para URL de scraper específico
   */
  public static getCityUrlMapping(city: string, scraperType: 'standard' | 'properati' | 'mercadolibre' = 'standard'): string {
    const mapping = this.CITY_URL_MAPPINGS[scraperType] as Record<string, string>;
    return mapping[city?.toLowerCase()] || mapping['bogota'];
  }

  /**
   * Obtener mapeo de barrio para URL de scraper específico
   */
  public static getNeighborhoodUrlMapping(
    neighborhood: string,
    scraperType: 'standard' | 'pads' | 'mercadolibre' = 'standard'
  ): string | null {
    const mapping = this.NEIGHBORHOOD_URL_MAPPINGS[scraperType] as Record<string, string>;
    return mapping[neighborhood?.toLowerCase()] || null;
  }

  /**
   * Obtener mapeo de barrio para Trovit (formato especial con ciudad)
   */
  public static getTrovitNeighborhoodMapping(neighborhood: string, cityUrl: string): string | null {
    const baseMapping = (this.NEIGHBORHOOD_URL_MAPPINGS.standard as Record<string, string>)[neighborhood?.toLowerCase()];
    return baseMapping ? `${baseMapping}-${cityUrl}` : null;
  }

  /**
   * Obtener mapeo de barrio para Rentola (formato específico)
   */
  public static getRentolaNeighborhoodMapping(neighborhood: string): string | null {
    const rentolaMapping: Record<string, string> = {
      'suba': 'bogota-localidad-suba',
      'usaquén': 'bogota-localidad-usaquen',
      'usaquen': 'bogota-localidad-usaquen',
      'chapinero': 'bogota-localidad-chapinero',
      'kennedy': 'bogota-localidad-kennedy',
      'engativá': 'bogota-localidad-engativa',
      'engativa': 'bogota-localidad-engativa',
      'fontibón': 'bogota-localidad-fontibon',
      'fontibon': 'bogota-localidad-fontibon'
    };

    return rentolaMapping[neighborhood?.toLowerCase()] || null;
  }

  // ============================================================================
  // PATRONES DE REGEX CENTRALIZADOS - ELIMINAR DUPLICACIÓN TOTAL
  // ============================================================================

  /**
   * Lista de ciudades principales para patrones dinámicos
   */
  private static readonly MAIN_CITIES = 'bogotá|medellín|cali|barranquilla|bucaramanga|cartagena';

  /**
   * Patrones de regex centralizados para extracción de ubicaciones
   * ELIMINA DUPLICACIÓN en todos los scrapers
   */
  public static readonly LOCATION_EXTRACTION_PATTERNS = [
    new RegExp(`en\\s+([^,\\n]+),?\\s*(${LocationDetector.MAIN_CITIES})`, 'i'),
    new RegExp(`arriendo\\s+([^,\\n]+),?\\s*(${LocationDetector.MAIN_CITIES})`, 'i'),
    /apartamento\s+([^,\n]+)/i,
    new RegExp(`([a-záéíóúñ\\s]+)\\s+(${LocationDetector.MAIN_CITIES})`, 'i'),
    new RegExp(`([a-záéíóúñ\\s]+),\\s*(${LocationDetector.MAIN_CITIES})`, 'i'),
    new RegExp(`(${LocationDetector.MAIN_CITIES})[,\\s]+([^,\\n]+)`, 'i')
  ];

  /**
   * Patrón para limpiar nombres de ciudades de texto
   */
  private static readonly CITY_CLEANUP_PATTERN = new RegExp(`[,\\s]*(${LocationDetector.MAIN_CITIES})`, 'gi');

  /**
   * Limpiar texto de ubicación removiendo nombres de ciudades
   * MÉTODO CENTRALIZADO - elimina duplicación
   */
  public static cleanLocationText(locationText: string): string {
    if (!locationText) return '';

    return locationText
      .replace(LocationDetector.CITY_CLEANUP_PATTERN, '')
      .trim();
  }

  /**
   * Extraer ubicación usando patrones centralizados
   * MÉTODO UNIFICADO para todos los scrapers
   */
  public static extractLocationFromText(text: string): { neighborhood?: string; city?: string } | null {
    if (!text) return null;

    for (const pattern of LocationDetector.LOCATION_EXTRACTION_PATTERNS) {
      const match = text.match(pattern);
      if (match) {
        // Diferentes patrones tienen diferentes grupos de captura
        if (match[1] && match[2]) {
          return {
            neighborhood: LocationDetector.cleanLocationText(match[1]),
            city: match[2].toLowerCase()
          };
        } else if (match[1]) {
          return {
            neighborhood: LocationDetector.cleanLocationText(match[1])
          };
        }
      }
    }

    return null;
  }

  /**
   * Patrón para URLs de ciudades (usado en MetrocuadradoScraper)
   */
  public static readonly CITY_URL_PATTERN = /(?:bogota|medellin|cali|barranquilla|cartagena|bucaramanga|pereira|ibague)-([^-]+)/;

  /**
   * Verificar si un texto contiene nombres de ciudades principales
   */
  public static containsMainCities(text: string): boolean {
    return new RegExp(LocationDetector.MAIN_CITIES, 'i').test(text);
  }

  /**
   * Obtener departamento para una ciudad - CENTRALIZADO
   */
  public static getDepartmentForCity(city?: string): string {
    if (!city) return 'Colombia';

    const cityDepartmentMap: Record<string, string> = {
      'bogotá': 'Bogotá D.C.',
      'bogota': 'Bogotá D.C.',
      'medellín': 'Antioquia',
      'medellin': 'Antioquia',
      'cali': 'Valle del Cauca',
      'barranquilla': 'Atlántico',
      'bucaramanga': 'Santander',
      'cartagena': 'Bolívar',
      'pereira': 'Risaralda',
      'ibagué': 'Tolima',
      'ibague': 'Tolima',
      'manizales': 'Caldas',
      'villavicencio': 'Meta',
      'pasto': 'Nariño',
      'montería': 'Córdoba',
      'monteria': 'Córdoba',
      'valledupar': 'Cesar',
      'neiva': 'Huila',
      'armenia': 'Quindío',
      'popayán': 'Cauca',
      'popayan': 'Cauca'
    };

    return cityDepartmentMap[city.toLowerCase()] || 'Colombia';
  }



  // ============================================================================
  // URL BUILDER UNIFICADO - ELIMINAR DUPLICACIÓN TOTAL
  // ============================================================================

  /**
   * Configuraciones de URL para cada scraper
   */
  private static readonly SCRAPER_URL_CONFIGS = {
    ciencuadras: {
      baseTemplate: 'https://www.ciencuadras.com/arriendo/apartamento/{city}',
      neighborhoodTemplate: '/{neighborhood}',
      cityMapping: 'standard',
      neighborhoodMapping: 'standard'
    },
    metrocuadrado: {
      baseTemplate: 'https://www.metrocuadrado.com/inmuebles/arriendo/apartamento/{city}/',
      neighborhoodTemplate: '{neighborhood}/',
      cityMapping: 'standard',
      neighborhoodMapping: 'standard'
    },
    mercadolibre: {
      baseTemplate: 'https://inmuebles.mercadolibre.com.co/apartamentos/arriendo/{city}',
      neighborhoodTemplate: '/{neighborhood}',
      cityMapping: 'mercadolibre',
      neighborhoodMapping: 'mercadolibre'
    },
    properati: {
      baseTemplate: 'https://www.properati.com.co/s/{city}/apartamento/arriendo',
      neighborhoodTemplate: '?q={neighborhood}',
      cityMapping: 'properati',
      neighborhoodMapping: 'standard'
    },
    trovit: {
      baseTemplate: 'https://casas.trovit.com.co/arriendo-apartamento-{city}',
      neighborhoodTemplate: 'https://casas.trovit.com.co/arriendo-apartamento-{neighborhood}',
      cityMapping: 'standard',
      neighborhoodMapping: 'trovit'
    },
    rentola: {
      baseTemplate: 'https://rentola.com/for-rent/co/{city}',
      neighborhoodTemplate: 'https://rentola.com/for-rent/co/{neighborhood}',
      cityMapping: 'standard',
      neighborhoodMapping: 'rentola'
    },
    pads: {
      baseTemplate: 'https://pads.com.co/inmuebles-en-arriendo/{city}',
      neighborhoodTemplate: '/{neighborhood}',
      cityMapping: 'standard',
      neighborhoodMapping: 'pads'
    },
    arriendo: {
      baseTemplate: 'https://www.arriendo.com/buscar',
      neighborhoodTemplate: '',
      cityMapping: 'standard',
      neighborhoodMapping: 'standard'
    },
    fincaraiz: {
      baseTemplate: 'https://www.fincaraiz.com.co/arriendo/apartamento/{city}',
      neighborhoodTemplate: '/{neighborhood}',
      cityMapping: 'standard',
      neighborhoodMapping: 'standard'
    }
  };

  /**
   * MÉTODO UNIFICADO: Construir URL para cualquier scraper
   * ELIMINA TODA LA DUPLICACIÓN DE buildXXXUrl()
   */
  public static buildScraperUrl(
    scraperName: keyof typeof LocationDetector.SCRAPER_URL_CONFIGS,
    criteria: any
  ): { url: string; locationInfo: any } {
    // 1. Detectar ubicación (LÓGICA UNIFICADA)
    let locationInfo = null;
    if (criteria.hardRequirements?.location?.neighborhoods?.length) {
      const searchText = criteria.hardRequirements.location.neighborhoods[0];
      locationInfo = this.detectLocation(searchText);
    }

    const config = this.SCRAPER_URL_CONFIGS[scraperName];
    const city = locationInfo?.city;
    const neighborhood = locationInfo?.neighborhood;

    // 2. Mapear ciudad (LÓGICA UNIFICADA)
    const cityUrl = this.getCityUrlMapping(
      city || 'bogotá',
      config.cityMapping as any
    );

    // 3. Construir URL base
    let finalUrl = config.baseTemplate.replace('{city}', cityUrl);

    // 4. Agregar barrio si está disponible (LÓGICA UNIFICADA)
    if (neighborhood && config.neighborhoodTemplate) {
      let neighborhoodUrl = '';

      if (config.neighborhoodMapping === 'trovit') {
        neighborhoodUrl = this.getTrovitNeighborhoodMapping(neighborhood, cityUrl) || '';
      } else if (config.neighborhoodMapping === 'rentola') {
        neighborhoodUrl = this.getRentolaNeighborhoodMapping(neighborhood) || '';
      } else {
        neighborhoodUrl = this.getNeighborhoodUrlMapping(
          neighborhood,
          config.neighborhoodMapping as any
        ) || '';
      }

      if (neighborhoodUrl) {
        if (config.neighborhoodTemplate.includes('https://')) {
          // Template completo (Trovit, Rentola)
          finalUrl = config.neighborhoodTemplate.replace('{neighborhood}', neighborhoodUrl);
        } else {
          // Template parcial (otros scrapers)
          finalUrl += config.neighborhoodTemplate.replace('{neighborhood}', neighborhoodUrl);
        }
      }
    }

    return { url: finalUrl, locationInfo };
  }
}
