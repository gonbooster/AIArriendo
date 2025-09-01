import { Property, SearchCriteria } from '../types';

interface CacheEntry {
  properties: Property[];
  timestamp: number;
  criteria: SearchCriteria;
  searchHash: string;
}

interface CacheMetadata {
  totalCached: number;
  lastUpdate: number;
  searchHashes: string[];
}

class CacheService {
  private static readonly CACHE_KEY = 'ai-arriendo-cache';
  private static readonly METADATA_KEY = 'ai-arriendo-cache-metadata';
  private static readonly CACHE_DURATION = 30 * 60 * 1000; // 30 minutos
  private static readonly MAX_CACHE_ENTRIES = 10; // Máximo 10 búsquedas en cache

  /**
   * Generar hash único para criterios de búsqueda
   */
  private static generateSearchHash(criteria: any): string {
    const normalizedCriteria = {
      operation: criteria.operation || 'arriendo',
      location: typeof criteria.location === 'string' 
        ? criteria.location.toLowerCase().trim()
        : criteria.location,
      // Solo incluir criterios que afecten los resultados
      minRooms: criteria.minRooms,
      maxPrice: criteria.maxPrice,
      propertyTypes: criteria.propertyTypes
    };
    
    return btoa(JSON.stringify(normalizedCriteria))
      .replace(/[+/=]/g, '')
      .substring(0, 16);
  }

  /**
   * Obtener propiedades desde cache
   */
  static getCachedProperties(criteria: any): { 
    cached: Property[], 
    isPartialCache: boolean,
    cacheAge: number 
  } | null {
    try {
      const searchHash = this.generateSearchHash(criteria);
      const cacheData = localStorage.getItem(`${this.CACHE_KEY}-${searchHash}`);
      
      if (!cacheData) {
        return null;
      }

      const entry: CacheEntry = JSON.parse(cacheData);
      const now = Date.now();
      const cacheAge = now - entry.timestamp;

      // Verificar si el cache no ha expirado
      if (cacheAge > this.CACHE_DURATION) {
        this.removeCacheEntry(searchHash);
        return null;
      }

      console.log(`📦 Cache hit! Found ${entry.properties.length} cached properties (${Math.round(cacheAge / 1000)}s old)`);
      
      return {
        cached: entry.properties,
        isPartialCache: false, // Por ahora, cache completo o nada
        cacheAge: Math.round(cacheAge / 1000)
      };
    } catch (error) {
      console.warn('Error reading cache:', error);
      return null;
    }
  }

  /**
   * Guardar propiedades en cache
   */
  static setCachedProperties(criteria: any, properties: Property[]): void {
    try {
      const searchHash = this.generateSearchHash(criteria);
      const entry: CacheEntry = {
        properties,
        timestamp: Date.now(),
        criteria,
        searchHash
      };

      // Guardar entrada de cache
      localStorage.setItem(`${this.CACHE_KEY}-${searchHash}`, JSON.stringify(entry));
      
      // Actualizar metadata
      this.updateCacheMetadata(searchHash);
      
      // Limpiar cache antiguo si es necesario
      this.cleanupOldCache();

      console.log(`💾 Cached ${properties.length} properties for search: ${searchHash}`);
    } catch (error) {
      console.warn('Error saving to cache:', error);
    }
  }

  /**
   * Comparar propiedades nuevas vs cacheadas para detectar novedades
   */
  static compareWithCache(
    newProperties: Property[], 
    cachedProperties: Property[]
  ): {
    newItems: Property[],
    existingItems: Property[],
    totalNew: number
  } {
    const cachedUrls = new Set(cachedProperties.map(p => p.url || p.id));
    const newItems: Property[] = [];
    const existingItems: Property[] = [];

    newProperties.forEach(property => {
      const identifier = property.url || property.id;
      if (cachedUrls.has(identifier)) {
        existingItems.push(property);
      } else {
        newItems.push({ ...property, isNew: true }); // Marcar como nuevo
      }
    });

    return {
      newItems,
      existingItems,
      totalNew: newItems.length
    };
  }

  /**
   * Actualizar metadata del cache
   */
  private static updateCacheMetadata(searchHash: string): void {
    try {
      const metadata: CacheMetadata = this.getCacheMetadata();
      
      if (!metadata.searchHashes.includes(searchHash)) {
        metadata.searchHashes.push(searchHash);
      }
      
      metadata.lastUpdate = Date.now();
      metadata.totalCached = metadata.searchHashes.length;

      localStorage.setItem(this.METADATA_KEY, JSON.stringify(metadata));
    } catch (error) {
      console.warn('Error updating cache metadata:', error);
    }
  }

  /**
   * Obtener metadata del cache
   */
  private static getCacheMetadata(): CacheMetadata {
    try {
      const metadata = localStorage.getItem(this.METADATA_KEY);
      if (metadata) {
        return JSON.parse(metadata);
      }
    } catch (error) {
      console.warn('Error reading cache metadata:', error);
    }

    return {
      totalCached: 0,
      lastUpdate: Date.now(),
      searchHashes: []
    };
  }

  /**
   * Limpiar cache antiguo
   */
  private static cleanupOldCache(): void {
    try {
      const metadata = this.getCacheMetadata();
      
      if (metadata.searchHashes.length > this.MAX_CACHE_ENTRIES) {
        // Remover las entradas más antiguas
        const toRemove = metadata.searchHashes.slice(0, metadata.searchHashes.length - this.MAX_CACHE_ENTRIES);
        
        toRemove.forEach(hash => {
          this.removeCacheEntry(hash);
        });

        // Actualizar metadata
        metadata.searchHashes = metadata.searchHashes.slice(-this.MAX_CACHE_ENTRIES);
        localStorage.setItem(this.METADATA_KEY, JSON.stringify(metadata));
      }
    } catch (error) {
      console.warn('Error cleaning up cache:', error);
    }
  }

  /**
   * Remover entrada específica del cache
   */
  private static removeCacheEntry(searchHash: string): void {
    try {
      localStorage.removeItem(`${this.CACHE_KEY}-${searchHash}`);
      
      const metadata = this.getCacheMetadata();
      metadata.searchHashes = metadata.searchHashes.filter(h => h !== searchHash);
      metadata.totalCached = metadata.searchHashes.length;
      localStorage.setItem(this.METADATA_KEY, JSON.stringify(metadata));
    } catch (error) {
      console.warn('Error removing cache entry:', error);
    }
  }

  /**
   * Limpiar cache específico por criterios
   */
  static clearCacheForCriteria(criteria: any): void {
    try {
      const searchHash = this.generateSearchHash(criteria);
      this.removeCacheEntry(searchHash);
      console.log(`🗑️ Cache cleared for search: ${searchHash}`);
    } catch (error) {
      console.warn('Error clearing specific cache:', error);
    }
  }

  /**
   * Función global para limpiar cache desde consola
   */
  static exposeGlobalClearCache(): void {
    (window as any).clearAIArriendoCache = () => {
      this.clearAllCache();
      console.log('🗑️ Cache de AI Arriendo limpiado completamente');
    };
  }

  /**
   * Limpiar todo el cache
   */
  static clearAllCache(): void {
    try {
      const metadata = this.getCacheMetadata();
      
      metadata.searchHashes.forEach(hash => {
        localStorage.removeItem(`${this.CACHE_KEY}-${hash}`);
      });
      
      localStorage.removeItem(this.METADATA_KEY);
      console.log('🗑️ All cache cleared');
    } catch (error) {
      console.warn('Error clearing cache:', error);
    }
  }

  /**
   * Obtener estadísticas del cache
   */
  static getCacheStats(): {
    totalEntries: number,
    totalSize: string,
    oldestEntry: number,
    newestEntry: number
  } {
    try {
      const metadata = this.getCacheMetadata();
      let totalSize = 0;
      let oldestTimestamp = Date.now();
      let newestTimestamp = 0;

      metadata.searchHashes.forEach(hash => {
        const cacheData = localStorage.getItem(`${this.CACHE_KEY}-${hash}`);
        if (cacheData) {
          totalSize += cacheData.length;
          const entry: CacheEntry = JSON.parse(cacheData);
          oldestTimestamp = Math.min(oldestTimestamp, entry.timestamp);
          newestTimestamp = Math.max(newestTimestamp, entry.timestamp);
        }
      });

      return {
        totalEntries: metadata.totalCached,
        totalSize: `${(totalSize / 1024).toFixed(1)} KB`,
        oldestEntry: oldestTimestamp,
        newestEntry: newestTimestamp
      };
    } catch (error) {
      console.warn('Error getting cache stats:', error);
      return {
        totalEntries: 0,
        totalSize: '0 KB',
        oldestEntry: 0,
        newestEntry: 0
      };
    }
  }
}

export default CacheService;
