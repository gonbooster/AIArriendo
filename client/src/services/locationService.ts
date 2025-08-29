/**
 * Servicio inteligente de ubicaciones para Colombia
 * - API DANE para municipios oficiales
 * - Lista curada de barrios principales
 * - Fuzzy search con tolerancia a errores
 * - Cache en localStorage para performance
 */

export interface Location {
  id: string;
  name: string;
  type: 'country' | 'department' | 'city' | 'neighborhood' | 'zone';
  parent?: string;
  department?: string;
  city?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  aliases?: string[];
}

// Barrios principales de las ciudades más importantes de Colombia
const MAIN_NEIGHBORHOODS: Location[] = [
  // BOGOTÁ - Zona Norte
  { id: 'bog_chapinero', name: 'Chapinero', type: 'neighborhood', city: 'Bogotá', department: 'Bogotá D.C.', aliases: ['chapinero central'] },
  { id: 'bog_zona_rosa', name: 'Zona Rosa', type: 'neighborhood', city: 'Bogotá', department: 'Bogotá D.C.', aliases: ['zona rosa'] },
  { id: 'bog_los_rosales', name: 'Los Rosales', type: 'neighborhood', city: 'Bogotá', department: 'Bogotá D.C.', aliases: ['rosales'] },
  { id: 'bog_el_nogal', name: 'El Nogal', type: 'neighborhood', city: 'Bogotá', department: 'Bogotá D.C.', aliases: ['nogal'] },
  { id: 'bog_chico', name: 'Chicó', type: 'neighborhood', city: 'Bogotá', department: 'Bogotá D.C.', aliases: ['chico norte', 'chico navarra'] },
  { id: 'bog_chico_norte', name: 'Chicó Norte', type: 'neighborhood', city: 'Bogotá', department: 'Bogotá D.C.' },
  { id: 'bog_chico_navarra', name: 'Chicó Navarra', type: 'neighborhood', city: 'Bogotá', department: 'Bogotá D.C.' },
  
  // BOGOTÁ - Zona Norte
  { id: 'bog_usaquen', name: 'Usaquén', type: 'zone', city: 'Bogotá', department: 'Bogotá D.C.' },
  { id: 'bog_santa_barbara', name: 'Santa Bárbara', type: 'neighborhood', city: 'Bogotá', department: 'Bogotá D.C.' },
  { id: 'bog_cedritos', name: 'Cedritos', type: 'neighborhood', city: 'Bogotá', department: 'Bogotá D.C.' },
  { id: 'bog_country_club', name: 'Country Club', type: 'neighborhood', city: 'Bogotá', department: 'Bogotá D.C.' },
  
  // BOGOTÁ - Zona Oeste
  { id: 'bog_salitre', name: 'Salitre', type: 'neighborhood', city: 'Bogotá', department: 'Bogotá D.C.' },
  { id: 'bog_modelia', name: 'Modelia', type: 'neighborhood', city: 'Bogotá', department: 'Bogotá D.C.' },
  { id: 'bog_normandia', name: 'Normandía', type: 'neighborhood', city: 'Bogotá', department: 'Bogotá D.C.' },
  
  // BOGOTÁ - Zona Sur
  { id: 'bog_zona_sur', name: 'Zona Sur', type: 'zone', city: 'Bogotá', department: 'Bogotá D.C.' },
  { id: 'bog_kennedy', name: 'Kennedy', type: 'zone', city: 'Bogotá', department: 'Bogotá D.C.' },
  { id: 'bog_fontibon', name: 'Fontibón', type: 'zone', city: 'Bogotá', department: 'Bogotá D.C.' },
  
  // MEDELLÍN
  { id: 'med_el_poblado', name: 'El Poblado', type: 'neighborhood', city: 'Medellín', department: 'Antioquia', aliases: ['poblado'] },
  { id: 'med_laureles', name: 'Laureles', type: 'neighborhood', city: 'Medellín', department: 'Antioquia' },
  { id: 'med_envigado', name: 'Envigado', type: 'city', department: 'Antioquia' },
  { id: 'med_sabaneta', name: 'Sabaneta', type: 'city', department: 'Antioquia' },
  { id: 'med_bello', name: 'Bello', type: 'city', department: 'Antioquia' },
  { id: 'med_itagui', name: 'Itagüí', type: 'city', department: 'Antioquia' },
  
  // CALI
  { id: 'cal_granada', name: 'Granada', type: 'neighborhood', city: 'Cali', department: 'Valle del Cauca' },
  { id: 'cal_san_fernando', name: 'San Fernando', type: 'neighborhood', city: 'Cali', department: 'Valle del Cauca' },
  { id: 'cal_ciudad_jardin', name: 'Ciudad Jardín', type: 'neighborhood', city: 'Cali', department: 'Valle del Cauca' },
  
  // BARRANQUILLA
  { id: 'baq_el_prado', name: 'El Prado', type: 'neighborhood', city: 'Barranquilla', department: 'Atlántico' },
  { id: 'baq_alto_prado', name: 'Alto Prado', type: 'neighborhood', city: 'Barranquilla', department: 'Atlántico' },
  { id: 'baq_riomar', name: 'Riomar', type: 'neighborhood', city: 'Barranquilla', department: 'Atlántico' },
  
  // CARTAGENA
  { id: 'ctg_bocagrande', name: 'Bocagrande', type: 'neighborhood', city: 'Cartagena', department: 'Bolívar' },
  { id: 'ctg_castillogrande', name: 'Castillogrande', type: 'neighborhood', city: 'Cartagena', department: 'Bolívar' },
  { id: 'ctg_centro_historico', name: 'Centro Histórico', type: 'neighborhood', city: 'Cartagena', department: 'Bolívar' },
];

// Cache keys
const CACHE_KEYS = {
  MUNICIPALITIES: 'colombia_municipalities',
  NEIGHBORHOODS: 'colombia_neighborhoods',
  LAST_UPDATE: 'locations_last_update'
};

// Cache duration: 7 days
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000;

class LocationService {
  private municipalities: Location[] = [];
  private neighborhoods: Location[] = MAIN_NEIGHBORHOODS;
  private allLocations: Location[] = [];
  private isInitialized = false;

  /**
   * Inicializar el servicio
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Intentar cargar desde cache
      await this.loadFromCache();
      
      // Si no hay cache o está vencido, cargar desde API
      if (this.municipalities.length === 0) {
        await this.loadMunicipalities();
        this.saveToCache();
      }
      
      // Combinar todas las ubicaciones
      this.combineLocations();
      this.isInitialized = true;
      
      console.log(`✅ LocationService initialized with ${this.allLocations.length} locations`);
    } catch (error) {
      console.error('❌ Error initializing LocationService:', error);
      // Usar solo barrios si falla la API
      this.allLocations = [...this.neighborhoods];
      this.isInitialized = true;
    }
  }

  /**
   * Cargar municipios desde la API de DANE
   */
  private async loadMunicipalities(): Promise<void> {
    try {
      console.log('🔄 Loading municipalities from DANE API...');
      
      const response = await fetch('https://www.datos.gov.co/resource/gdxc-w37w.json?$limit=1200');
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }
      
      const data = await response.json();
      
      this.municipalities = data.map((item: any) => ({
        id: `mun_${item.cod_mpio}`,
        name: item.nom_mpio,
        type: 'city' as const,
        department: item.dpto,
        coordinates: item.latitud && item.longitud ? {
          lat: parseFloat(item.latitud),
          lng: parseFloat(item.longitud)
        } : undefined
      }));
      
      console.log(`✅ Loaded ${this.municipalities.length} municipalities`);
    } catch (error) {
      console.error('❌ Error loading municipalities:', error);
      throw error;
    }
  }

  /**
   * Combinar todas las ubicaciones
   */
  private combineLocations(): void {
    this.allLocations = [
      // País
      { id: 'colombia', name: 'Colombia', type: 'country' },
      
      // Municipios principales (filtrar solo los más importantes)
      ...this.municipalities.filter(m => 
        ['BOGOTÁ', 'MEDELLÍN', 'CALI', 'BARRANQUILLA', 'CARTAGENA', 'BUCARAMANGA', 'PEREIRA', 'IBAGUÉ', 'MANIZALES', 'VILLAVICENCIO'].includes(m.name.toUpperCase())
      ),
      
      // Todos los barrios
      ...this.neighborhoods
    ];
  }

  /**
   * Buscar ubicaciones con fuzzy search
   */
  async search(query: string, limit: number = 10): Promise<Location[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!query || query.length < 2) {
      return this.allLocations.slice(0, limit);
    }

    const queryLower = query.toLowerCase().trim();
    
    // Búsqueda exacta primero
    const exactMatches = this.allLocations.filter(location => 
      location.name.toLowerCase().includes(queryLower) ||
      location.aliases?.some(alias => alias.toLowerCase().includes(queryLower))
    );

    // Búsqueda fuzzy para el resto
    const fuzzyMatches = this.allLocations.filter(location => {
      if (exactMatches.includes(location)) return false;
      
      return this.fuzzyMatch(queryLower, location.name.toLowerCase()) ||
             location.aliases?.some(alias => this.fuzzyMatch(queryLower, alias.toLowerCase()));
    });

    // Combinar y limitar resultados
    const results = [...exactMatches, ...fuzzyMatches].slice(0, limit);
    
    // Ordenar por relevancia
    return results.sort((a, b) => {
      // Priorizar barrios sobre ciudades
      if (a.type === 'neighborhood' && b.type !== 'neighborhood') return -1;
      if (b.type === 'neighborhood' && a.type !== 'neighborhood') return 1;
      
      // Priorizar coincidencias exactas
      const aExact = a.name.toLowerCase().startsWith(queryLower);
      const bExact = b.name.toLowerCase().startsWith(queryLower);
      if (aExact && !bExact) return -1;
      if (bExact && !aExact) return 1;
      
      return a.name.localeCompare(b.name);
    });
  }

  /**
   * Búsqueda fuzzy simple
   */
  private fuzzyMatch(query: string, target: string): boolean {
    if (query.length > target.length) return false;
    
    let queryIndex = 0;
    for (let i = 0; i < target.length && queryIndex < query.length; i++) {
      if (target[i] === query[queryIndex]) {
        queryIndex++;
      }
    }
    
    return queryIndex === query.length;
  }

  /**
   * Cargar desde cache
   */
  private async loadFromCache(): Promise<void> {
    try {
      const lastUpdate = localStorage.getItem(CACHE_KEYS.LAST_UPDATE);
      const now = Date.now();
      
      if (lastUpdate && (now - parseInt(lastUpdate)) < CACHE_DURATION) {
        const cachedMunicipalities = localStorage.getItem(CACHE_KEYS.MUNICIPALITIES);
        
        if (cachedMunicipalities) {
          this.municipalities = JSON.parse(cachedMunicipalities);
          console.log(`✅ Loaded ${this.municipalities.length} municipalities from cache`);
        }
      }
    } catch (error) {
      console.error('❌ Error loading from cache:', error);
    }
  }

  /**
   * Guardar en cache
   */
  private saveToCache(): void {
    try {
      localStorage.setItem(CACHE_KEYS.MUNICIPALITIES, JSON.stringify(this.municipalities));
      localStorage.setItem(CACHE_KEYS.LAST_UPDATE, Date.now().toString());
      console.log('✅ Saved locations to cache');
    } catch (error) {
      console.error('❌ Error saving to cache:', error);
    }
  }

  /**
   * Obtener ubicación por ID
   */
  async getById(id: string): Promise<Location | null> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    return this.allLocations.find(location => location.id === id) || null;
  }

  /**
   * Limpiar cache
   */
  clearCache(): void {
    localStorage.removeItem(CACHE_KEYS.MUNICIPALITIES);
    localStorage.removeItem(CACHE_KEYS.NEIGHBORHOODS);
    localStorage.removeItem(CACHE_KEYS.LAST_UPDATE);
    console.log('✅ Cache cleared');
  }
}

// Singleton instance
export const locationService = new LocationService();
