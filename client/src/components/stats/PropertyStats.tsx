import React from 'react';
import { Property } from '../../types';

interface PropertyStatsProps {
  properties: Property[];
  className?: string;
}

interface StatCard {
  label: string;
  value: string;
  icon: string;
  color: string;
  trend?: string;
}

const PropertyStats: React.FC<PropertyStatsProps> = ({ properties, className = '' }) => {
  // Calcular estadísticas
  const stats = React.useMemo(() => {
    if (properties.length === 0) {
      return {
        total: 0,
        avgPrice: 0,
        avgArea: 0,
        avgPricePerM2: 0,
        sources: 0,
        neighborhoods: 0,
        priceRange: { min: 0, max: 0 },
        areaRange: { min: 0, max: 0 }
      };
    }

    const validPrices = properties.filter(p => p.totalPrice > 0);
    const validAreas = properties.filter(p => p.area > 0);
    const validPricePerM2 = properties.filter(p => p.area > 0 && p.totalPrice > 0);

    const avgPrice = validPrices.length > 0 
      ? validPrices.reduce((sum, p) => sum + p.totalPrice, 0) / validPrices.length 
      : 0;

    const avgArea = validAreas.length > 0 
      ? validAreas.reduce((sum, p) => sum + p.area, 0) / validAreas.length 
      : 0;

    const avgPricePerM2 = validPricePerM2.length > 0 
      ? validPricePerM2.reduce((sum, p) => sum + (p.totalPrice / p.area), 0) / validPricePerM2.length 
      : 0;

    const sources = new Set(properties.map(p => p.source)).size;
    const neighborhoods = new Set(properties.map(p => p.location.neighborhood).filter(Boolean)).size;

    const prices = validPrices.map(p => p.totalPrice);
    const areas = validAreas.map(p => p.area);

    return {
      total: properties.length,
      avgPrice,
      avgArea,
      avgPricePerM2,
      sources,
      neighborhoods,
      priceRange: {
        min: prices.length > 0 ? Math.min(...prices) : 0,
        max: prices.length > 0 ? Math.max(...prices) : 0
      },
      areaRange: {
        min: areas.length > 0 ? Math.min(...areas) : 0,
        max: areas.length > 0 ? Math.max(...areas) : 0
      }
    };
  }, [properties]);

  const formatPrice = (price: number): string => {
    if (price >= 1000000) {
      return `$${(price / 1000000).toFixed(1)}M`;
    }
    if (price >= 1000) {
      return `$${(price / 1000).toFixed(0)}K`;
    }
    return `$${price.toFixed(0)}`;
  };

  const formatNumber = (num: number): string => {
    return num.toLocaleString();
  };

  const statCards: StatCard[] = [
    {
      label: 'Total Propiedades',
      value: formatNumber(stats.total),
      icon: '🏠',
      color: 'bg-blue-50 text-blue-700 border-blue-200',
    },
    {
      label: 'Precio Promedio',
      value: formatPrice(stats.avgPrice),
      icon: '💰',
      color: 'bg-green-50 text-green-700 border-green-200',
    },
    {
      label: 'Área Promedio',
      value: `${stats.avgArea.toFixed(0)}m²`,
      icon: '📐',
      color: 'bg-purple-50 text-purple-700 border-purple-200',
    },
    {
      label: 'Precio/m²',
      value: formatPrice(stats.avgPricePerM2),
      icon: '📊',
      color: 'bg-orange-50 text-orange-700 border-orange-200',
    },
    {
      label: 'Fuentes',
      value: stats.sources.toString(),
      icon: '🌐',
      color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    },
    {
      label: 'Barrios',
      value: stats.neighborhoods.toString(),
      icon: '📍',
      color: 'bg-pink-50 text-pink-700 border-pink-200',
    }
  ];

  return (
    <div className={`bg-white rounded-lg shadow-lg border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Estadísticas del Mercado
        </h3>
      </div>

      {/* Stats Grid */}
      <div className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {statCards.map((stat, index) => (
            <div
              key={index}
              className={`p-3 rounded-lg border transition-all hover:shadow-md ${stat.color}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-lg">{stat.icon}</span>
                {stat.trend && (
                  <span className="text-xs font-medium">{stat.trend}</span>
                )}
              </div>
              <div className="text-xl font-bold mb-1">{stat.value}</div>
              <div className="text-xs font-medium opacity-75">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Rangos */}
        {stats.total > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
              <div className="flex items-center justify-between">
                <span>Rango de Precios:</span>
                <span className="font-medium">
                  {formatPrice(stats.priceRange.min)} - {formatPrice(stats.priceRange.max)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Rango de Áreas:</span>
                <span className="font-medium">
                  {stats.areaRange.min.toFixed(0)}m² - {stats.areaRange.max.toFixed(0)}m²
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Source Breakdown */}
      {stats.total > 0 && (
        <div className="px-4 pb-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Distribución por Fuente</h4>
            <div className="space-y-1">
              {Object.entries(
                properties.reduce((acc, prop) => {
                  acc[prop.source] = (acc[prop.source] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>)
              )
                .sort(([,a], [,b]) => b - a)
                .map(([source, count]) => (
                  <div key={source} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{source}</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-16 bg-gray-200 rounded-full h-1.5">
                        <div 
                          className="bg-blue-600 h-1.5 rounded-full transition-all"
                          style={{ width: `${(count / stats.total) * 100}%` }}
                        />
                      </div>
                      <span className="font-medium text-gray-900 w-8 text-right">{count}</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PropertyStats;
