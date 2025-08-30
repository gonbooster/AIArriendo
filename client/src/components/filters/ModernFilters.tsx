import React, { useState, useEffect } from 'react';
import { Property } from '../../types';
import { PROPERTY_DEFAULTS } from '../../config/constants';

interface ModernFiltersProps {
  properties: Property[];
  onFiltersChange: (filteredProperties: Property[]) => void;
  className?: string;
}

interface FilterState {
  priceRange: [number, number];
  areaRange: [number, number];
  rooms: number[];
  bathrooms: number[];
  parking: number[];
  stratum: number[];
  neighborhoods: string[];
  sources: string[];
  amenities: string[];
  pricePerM2Range: [number, number];
}

const ModernFilters: React.FC<ModernFiltersProps> = ({
  properties,
  onFiltersChange,
  className = ''
}) => {
  // Calcular rangos dinámicos basados en datos reales
  const priceStats = React.useMemo(() => {
    const prices = properties.map(p => p.totalPrice).filter(p => p > 0);
    return {
      min: Math.min(...prices, PROPERTY_DEFAULTS.MIN_PRICE),
      max: Math.max(...prices, PROPERTY_DEFAULTS.MAX_PRICE)
    };
  }, [properties]);

  const areaStats = React.useMemo(() => {
    const areas = properties.map(p => p.area).filter(a => a > 0);
    return {
      min: Math.min(...areas, PROPERTY_DEFAULTS.MIN_AREA),
      max: Math.max(...areas, PROPERTY_DEFAULTS.MAX_AREA)
    };
  }, [properties]);

  const pricePerM2Stats = React.useMemo(() => {
    const pricesPerM2 = properties
      .filter(p => p.area > 0 && p.totalPrice > 0)
      .map(p => Math.round(p.totalPrice / p.area));
    return {
      min: Math.min(...pricesPerM2, 1000),
      max: Math.max(...pricesPerM2, 100000)
    };
  }, [properties]);

  // Extraer valores únicos
  const uniqueNeighborhoods = React.useMemo(() => {
    const neighborhoods = properties.map(p => p.location.neighborhood).filter(Boolean) as string[];
    return Array.from(new Set(neighborhoods)).sort();
  }, [properties]);

  const uniqueSources = React.useMemo(() => {
    const sources = properties.map(p => p.source);
    return Array.from(new Set(sources)).sort();
  }, [properties]);

  const uniqueAmenities = React.useMemo(() => {
    const allAmenities = properties.flatMap(p => p.amenities || []);
    return Array.from(new Set(allAmenities)).filter(Boolean).sort();
  }, [properties]);

  // Estado de filtros
  const [filters, setFilters] = useState<FilterState>({
    priceRange: [priceStats.min, priceStats.max],
    areaRange: [areaStats.min, areaStats.max],
    rooms: [],
    bathrooms: [],
    parking: [],
    stratum: [],
    neighborhoods: [],
    sources: [],
    amenities: [],
    pricePerM2Range: [pricePerM2Stats.min, pricePerM2Stats.max],
  });

  const [isExpanded, setIsExpanded] = useState(false);

  // Aplicar filtros
  useEffect(() => {
    let filtered = [...properties];

    // Filtro de precio
    filtered = filtered.filter(p => 
      p.totalPrice >= filters.priceRange[0] && 
      p.totalPrice <= filters.priceRange[1]
    );

    // Filtro de área
    filtered = filtered.filter(p => 
      p.area >= filters.areaRange[0] && 
      p.area <= filters.areaRange[1]
    );

    // Filtro de habitaciones
    if (filters.rooms.length > 0) {
      filtered = filtered.filter(p => filters.rooms.includes(p.rooms));
    }

    // Filtro de baños
    if (filters.bathrooms.length > 0) {
      filtered = filtered.filter(p => filters.bathrooms.includes(p.bathrooms || 0));
    }

    // Filtro de parqueaderos
    if (filters.parking.length > 0) {
      filtered = filtered.filter(p => filters.parking.includes(p.parking || 0));
    }

    // Filtro de estrato
    if (filters.stratum.length > 0) {
      filtered = filtered.filter(p => filters.stratum.includes(p.stratum || 0));
    }

    // Filtro de barrios
    if (filters.neighborhoods.length > 0) {
      filtered = filtered.filter(p => 
        filters.neighborhoods.includes(p.location.neighborhood || '')
      );
    }

    // Filtro de fuentes
    if (filters.sources.length > 0) {
      filtered = filtered.filter(p => filters.sources.includes(p.source));
    }

    // Filtro de amenities
    if (filters.amenities.length > 0) {
      filtered = filtered.filter(p => 
        filters.amenities.some(amenity => 
          (p.amenities || []).includes(amenity)
        )
      );
    }

    // Filtro de precio por m²
    filtered = filtered.filter(p => {
      if (p.area <= 0) return true; // Incluir propiedades sin área
      const pricePerM2 = p.totalPrice / p.area;
      return pricePerM2 >= filters.pricePerM2Range[0] && 
             pricePerM2 <= filters.pricePerM2Range[1];
    });

    onFiltersChange(filtered);
  }, [filters, properties]); // Removed onFiltersChange from dependencies to prevent infinite loop

  const formatPrice = (price: number) => {
    if (price >= 1000000) {
      return `$${(price / 1000000).toFixed(1)}M`;
    }
    return `$${(price / 1000).toFixed(0)}K`;
  };

  const resetFilters = () => {
    setFilters({
      priceRange: [priceStats.min, priceStats.max],
      areaRange: [areaStats.min, areaStats.max],
      rooms: [],
      bathrooms: [],
      parking: [],
      stratum: [],
      neighborhoods: [],
      sources: [],
      amenities: [],
      pricePerM2Range: [pricePerM2Stats.min, pricePerM2Stats.max],
    });
  };

  // Estilos para los sliders
  const sliderStyles = {
    WebkitAppearance: 'none' as const,
    appearance: 'none' as const,
    background: 'transparent',
    cursor: 'pointer',
    outline: 'none'
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg border border-gray-200 ${className}`}>
      <style>{`
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #2563eb;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          transition: all 0.2s ease;
        }

        input[type="range"]::-webkit-slider-thumb:hover {
          background: #1d4ed8;
          transform: scale(1.1);
        }

        input[type="range"]::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #2563eb;
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        input[type="range"]::-moz-range-track {
          background: #e5e7eb;
          height: 8px;
          border-radius: 4px;
          border: none;
        }
      `}</style>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
            </svg>
            Filtros Avanzados
          </h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={resetFilters}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Limpiar
            </button>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 rounded-md hover:bg-gray-100 transition-colors"
            >
              <svg 
                className={`w-5 h-5 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Filters Content */}
      <div className={`transition-all duration-300 ${isExpanded ? 'max-h-none' : 'max-h-0 overflow-hidden'}`}>
        <div className="p-4 space-y-6">
          
          {/* Precio */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Precio: {formatPrice(filters.priceRange[0])} - {formatPrice(filters.priceRange[1])}
            </label>
            <div className="px-3 relative">
              <input
                type="range"
                min={priceStats.min}
                max={priceStats.max}
                value={filters.priceRange[0]}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  priceRange: [parseInt(e.target.value), prev.priceRange[1]]
                }))}
                className="w-full h-2 bg-gray-200 rounded-lg"
                style={sliderStyles}
              />
              <input
                type="range"
                min={priceStats.min}
                max={priceStats.max}
                value={filters.priceRange[1]}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  priceRange: [prev.priceRange[0], parseInt(e.target.value)]
                }))}
                className="w-full h-2 bg-transparent rounded-lg absolute top-0"
                style={sliderStyles}
              />
            </div>
          </div>

          {/* Área */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Área: {filters.areaRange[0]}m² - {filters.areaRange[1]}m²
            </label>
            <div className="px-3 relative">
              <input
                type="range"
                min={areaStats.min}
                max={areaStats.max}
                value={filters.areaRange[0]}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  areaRange: [parseInt(e.target.value), prev.areaRange[1]]
                }))}
                className="w-full h-2 bg-gray-200 rounded-lg"
                style={sliderStyles}
              />
              <input
                type="range"
                min={areaStats.min}
                max={areaStats.max}
                value={filters.areaRange[1]}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  areaRange: [prev.areaRange[0], parseInt(e.target.value)]
                }))}
                className="w-full h-2 bg-transparent rounded-lg absolute top-0"
                style={sliderStyles}
              />
            </div>
          </div>

          {/* Grid de filtros categóricos */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Habitaciones */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Habitaciones</label>
              <div className="flex flex-wrap gap-2">
                {[0, 1, 2, 3, 4, 5].map(num => (
                  <button
                    key={num}
                    onClick={() => setFilters(prev => ({
                      ...prev,
                      rooms: prev.rooms.includes(num) 
                        ? prev.rooms.filter(r => r !== num)
                        : [...prev.rooms, num]
                    }))}
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${
                      filters.rooms.includes(num)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {num === 0 ? 'Sin especificar' : `${num}${num === 5 ? '+' : ''}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Baños */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Baños</label>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5].map(num => (
                  <button
                    key={num}
                    onClick={() => setFilters(prev => ({
                      ...prev,
                      bathrooms: prev.bathrooms.includes(num) 
                        ? prev.bathrooms.filter(b => b !== num)
                        : [...prev.bathrooms, num]
                    }))}
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${
                      filters.bathrooms.includes(num)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {num}{num === 5 ? '+' : ''}
                  </button>
                ))}
              </div>
            </div>

            {/* Parqueaderos */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Parqueaderos</label>
              <div className="flex flex-wrap gap-2">
                {[0, 1, 2, 3, 4].map(num => (
                  <button
                    key={num}
                    onClick={() => setFilters(prev => ({
                      ...prev,
                      parking: prev.parking.includes(num) 
                        ? prev.parking.filter(p => p !== num)
                        : [...prev.parking, num]
                    }))}
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${
                      filters.parking.includes(num)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {num === 0 ? 'Sin parqueadero' : `${num}${num === 4 ? '+' : ''}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Estrato */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Estrato</label>
              <div className="flex flex-wrap gap-2">
                {[0, 1, 2, 3, 4, 5, 6].map(num => (
                  <button
                    key={num}
                    onClick={() => setFilters(prev => ({
                      ...prev,
                      stratum: prev.stratum.includes(num)
                        ? prev.stratum.filter(s => s !== num)
                        : [...prev.stratum, num]
                    }))}
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${
                      filters.stratum.includes(num)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {num === 0 ? 'Sin especificar' : `Estrato ${num}`}
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* Precio por m² */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Precio por m²: {formatPrice(filters.pricePerM2Range[0])}/m² - {formatPrice(filters.pricePerM2Range[1])}/m²
            </label>
            <div className="px-3 relative">
              <input
                type="range"
                min={pricePerM2Stats.min}
                max={pricePerM2Stats.max}
                value={filters.pricePerM2Range[0]}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  pricePerM2Range: [parseInt(e.target.value), prev.pricePerM2Range[1]]
                }))}
                className="w-full h-2 bg-gray-200 rounded-lg"
                style={sliderStyles}
              />
              <input
                type="range"
                min={pricePerM2Stats.min}
                max={pricePerM2Stats.max}
                value={filters.pricePerM2Range[1]}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  pricePerM2Range: [prev.pricePerM2Range[0], parseInt(e.target.value)]
                }))}
                className="w-full h-2 bg-transparent rounded-lg absolute top-0"
                style={sliderStyles}
              />
            </div>
          </div>

          {/* Filtros de selección múltiple */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Barrios */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Barrios ({filters.neighborhoods.length} seleccionados)
              </label>
              <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-md p-2 space-y-1">
                {uniqueNeighborhoods.slice(0, 20).map(neighborhood => (
                  <label key={neighborhood} className="flex items-center space-x-2 text-sm">
                    <input
                      type="checkbox"
                      checked={filters.neighborhoods.includes(neighborhood)}
                      onChange={(e) => setFilters(prev => ({
                        ...prev,
                        neighborhoods: e.target.checked
                          ? [...prev.neighborhoods, neighborhood]
                          : prev.neighborhoods.filter(n => n !== neighborhood)
                      }))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-gray-700">{neighborhood}</span>
                    <span className="text-gray-400 text-xs">
                      ({properties.filter(p => p.location.neighborhood === neighborhood).length})
                    </span>
                  </label>
                ))}
                {uniqueNeighborhoods.length > 20 && (
                  <div className="text-xs text-gray-500 pt-1 border-t">
                    +{uniqueNeighborhoods.length - 20} barrios más...
                  </div>
                )}
              </div>
            </div>

            {/* Amenities */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amenities ({filters.amenities.length} seleccionados)
              </label>
              <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-md p-2 space-y-1">
                {uniqueAmenities.map(amenity => (
                  <label key={amenity} className="flex items-center space-x-2 text-sm">
                    <input
                      type="checkbox"
                      checked={filters.amenities.includes(amenity)}
                      onChange={(e) => setFilters(prev => ({
                        ...prev,
                        amenities: e.target.checked
                          ? [...prev.amenities, amenity]
                          : prev.amenities.filter(a => a !== amenity)
                      }))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-gray-700 capitalize">{amenity}</span>
                    <span className="text-gray-400 text-xs">
                      ({properties.filter(p => (p.amenities || []).includes(amenity)).length})
                    </span>
                  </label>
                ))}
              </div>
            </div>

          </div>

          {/* Fuentes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fuentes de Datos ({filters.sources.length} seleccionadas)
            </label>
            <div className="flex flex-wrap gap-2">
              {uniqueSources.map(source => {
                const count = properties.filter(p => p.source === source).length;
                return (
                  <button
                    key={source}
                    onClick={() => setFilters(prev => ({
                      ...prev,
                      sources: prev.sources.includes(source)
                        ? prev.sources.filter(s => s !== source)
                        : [...prev.sources, source]
                    }))}
                    className={`px-3 py-2 rounded-lg text-sm transition-colors border ${
                      filters.sources.includes(source)
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center space-x-1">
                      <span>{source}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                        filters.sources.includes(source)
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-200 text-gray-600'
                      }`}>
                        {count}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

        </div>
      </div>

      {/* Quick Stats */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 rounded-b-lg">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            Mostrando {properties.length} propiedades
          </span>
          <span className="text-blue-600 font-medium">
            {uniqueSources.length} fuentes activas
          </span>
        </div>
      </div>
    </div>
  );
};

export default ModernFilters;
