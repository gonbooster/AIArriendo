import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Property, SearchCriteria } from '../types';
import { api } from '../services/api';
import PropertyCard from '../components/PropertyCard';
import ModernFilters from '../components/filters/ModernFilters';
import PropertyStats from '../components/stats/PropertyStats';
import { logger } from '../utils/logger';

const ModernResultsPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Estado desde navegación
  const state = location.state as any;
  const fromSimpleSearch = state?.fromSimpleSearch;
  const searchCriteria = state?.searchCriteria;
  const initialResults = state?.results;

  // Estados principales
  const [loading, setLoading] = useState(fromSimpleSearch && !initialResults);
  const [error, setError] = useState<string | null>(null);
  const [allProperties, setAllProperties] = useState<Property[]>(initialResults?.properties || []);
  const [filteredProperties, setFilteredProperties] = useState<Property[]>(initialResults?.properties || []);
  const [displayedProperties, setDisplayedProperties] = useState<Property[]>([]);

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // UI States
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'price' | 'area' | 'pricePerM2' | 'newest'>('newest');

  // Ejecutar búsqueda si viene de SimpleSearch
  useEffect(() => {
    const executeSearch = async () => {
      if (!fromSimpleSearch || initialResults) return;

      try {
        setLoading(true);
        setError(null);
        
        logger.info('🔍 Ejecutando búsqueda desde SimpleSearchPage...', searchCriteria);
        
        const result = await api.search(searchCriteria);
        logger.info('✅ Búsqueda completada:', result);
        
        setAllProperties(result.properties);
        setFilteredProperties(result.properties);
      } catch (err) {
        logger.error('❌ Error en búsqueda:', err);
        setError(err instanceof Error ? err.message : 'Error desconocido en la búsqueda');
      } finally {
        setLoading(false);
      }
    };

    executeSearch();
  }, [fromSimpleSearch, searchCriteria, initialResults]);

  // Aplicar filtros y ordenamiento
  useEffect(() => {
    let sorted = [...filteredProperties];

    // Ordenamiento
    switch (sortBy) {
      case 'price':
        sorted.sort((a, b) => a.totalPrice - b.totalPrice);
        break;
      case 'area':
        sorted.sort((a, b) => b.area - a.area);
        break;
      case 'pricePerM2':
        sorted.sort((a, b) => {
          const pricePerM2A = a.area > 0 ? a.totalPrice / a.area : 0;
          const pricePerM2B = b.area > 0 ? b.totalPrice / b.area : 0;
          return pricePerM2A - pricePerM2B;
        });
        break;
      case 'newest':
      default:
        // Mantener orden original (más recientes primero)
        break;
    }

    // Paginación
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    setDisplayedProperties(sorted.slice(startIndex, endIndex));
  }, [filteredProperties, sortBy, currentPage]);

  // Reset página cuando cambian los filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [filteredProperties]);

  const handleFiltersChange = React.useCallback((filtered: Property[]) => {
    setFilteredProperties(filtered);
  }, []);

  const formatPrice = (price: number) => {
    if (price >= 1000000) {
      return `$${(price / 1000000).toFixed(1)}M`;
    }
    return `$${(price / 1000).toFixed(0)}K`;
  };

  const totalPages = Math.ceil(filteredProperties.length / itemsPerPage);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Buscando propiedades...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error en la búsqueda</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/')}
                className="p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-xl font-semibold text-gray-900">
                Resultados de búsqueda
              </h1>
              <span className="text-sm text-gray-500">
                {filteredProperties.length} de {allProperties.length} propiedades
              </span>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Ordenamiento */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="newest">Más recientes</option>
                <option value="price">Precio: menor a mayor</option>
                <option value="area">Área: mayor a menor</option>
                <option value="pricePerM2">Precio/m²: menor a mayor</option>
              </select>

              {/* Toggle Filtros */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  showFilters
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                </svg>
                Filtros
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Sidebar - Filtros y Estadísticas */}
          <div className={`lg:col-span-1 space-y-6 ${showFilters ? 'block' : 'hidden lg:block'}`}>
            
            {/* Estadísticas */}
            <PropertyStats properties={filteredProperties} />
            
            {/* Filtros */}
            <ModernFilters
              properties={allProperties}
              onFiltersChange={handleFiltersChange}
            />
            
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            
            {/* Resultados */}
            {displayedProperties.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 text-6xl mb-4">🏠</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No se encontraron propiedades
                </h3>
                <p className="text-gray-600">
                  Intenta ajustar los filtros para ver más resultados
                </p>
              </div>
            ) : (
              <>
                {/* Grid de propiedades */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
                  {displayedProperties.map((property) => (
                    <PropertyCard key={property.id} property={property} />
                  ))}
                </div>

                {/* Paginación */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center space-x-2">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-2 rounded-md text-sm font-medium text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Anterior
                    </button>
                    
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const page = i + 1;
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`px-3 py-2 rounded-md text-sm font-medium ${
                            currentPage === page
                              ? 'bg-blue-600 text-white'
                              : 'text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          {page}
                        </button>
                      );
                    })}
                    
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-2 rounded-md text-sm font-medium text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Siguiente
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModernResultsPage;
