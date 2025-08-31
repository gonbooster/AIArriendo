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
}
