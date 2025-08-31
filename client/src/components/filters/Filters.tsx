import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Box,
  Grid,
  Slider,
  FormControl,
  FormLabel,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Chip,
  Button,
  Divider,
  useTheme
} from '@mui/material';
import {
  FilterList as FilterIcon,
  Clear as ClearIcon
} from '@mui/icons-material';
import { Property } from '../../types';
import { PROPERTY_DEFAULTS } from '../../config/constants';

interface PropertyFiltersProps {
  properties: Property[];
  onFiltersChange: (filteredProperties: Property[]) => void;
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
  removeDuplicates: boolean;
  hasParking: boolean | null; // null = all, true = with parking, false = without parking
  hideCorrupt: boolean; // true = hide properties with missing data
  propertyTypes: string[]; // tipos de propiedad: apartamento, casa, etc.
}

const PropertyFilters: React.FC<PropertyFiltersProps> = ({
  properties,
  onFiltersChange
}) => {
  const theme = useTheme();

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
    // Amenidades básicas que siempre deben aparecer
    const basicAmenities = [
      'Parqueadero', 'Piscina', 'Gimnasio', 'Lavandería', 'Squash',
      'Portería 24h', 'Ascensor', 'Balcón', 'Terraza', 'Jardín',
      'Aire Acondicionado', 'Calefacción', 'Chimenea', 'BBQ', 'Sauna'
    ];
    const allAmenities = properties.flatMap(p => p.amenities || []);
    const combinedAmenities = Array.from(new Set([...basicAmenities, ...allAmenities]));
    return combinedAmenities.filter(Boolean).sort();
  }, [properties]);

  const uniquePropertyTypes = React.useMemo(() => {
    // Tipos básicos que siempre deben aparecer
    const basicTypes = ['Apartamento', 'Casa', 'Townhouse', 'Local Comercial', 'Oficina'];
    const types = properties.map(p => p.propertyType || 'Apartamento');
    const allTypes = Array.from(new Set([...basicTypes, ...types]));
    return allTypes.filter(Boolean).sort();
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
    removeDuplicates: false, // SI activamos este es le que da problemas
    hasParking: null,
    hideCorrupt: true, // ✅ Marcado por defecto
    propertyTypes: [],
  });

  // Verificar si hay filtros activos
  const hasActiveFilters = React.useMemo(() => {
    return (
      filters.rooms.length > 0 ||
      filters.bathrooms.length > 0 ||
      filters.parking.length > 0 ||
      filters.stratum.length > 0 ||
      filters.neighborhoods.length > 0 ||
      filters.sources.length > 0 ||
      filters.amenities.length > 0 ||
      filters.propertyTypes.length > 0 ||
      filters.removeDuplicates ||
      filters.hasParking !== null ||
      filters.hideCorrupt ||
      filters.priceRange[0] !== priceStats.min ||
      filters.priceRange[1] !== priceStats.max ||
      filters.areaRange[0] !== areaStats.min ||
      filters.areaRange[1] !== areaStats.max ||
      filters.pricePerM2Range[0] !== pricePerM2Stats.min ||
      filters.pricePerM2Range[1] !== pricePerM2Stats.max
    );
  }, [filters, priceStats, areaStats, pricePerM2Stats]);

  // Aplicar filtros
  useEffect(() => {
    let filtered = [...properties];

    // Siempre aplicar los filtros básicos (duplicados y calidad de datos)
    // Los otros filtros solo se aplican si están activos

    // Filtro de precio (solo si no está en el rango completo)
    if (filters.priceRange[0] !== priceStats.min || filters.priceRange[1] !== priceStats.max) {
      filtered = filtered.filter(p =>
        p.totalPrice >= filters.priceRange[0] &&
        p.totalPrice <= filters.priceRange[1]
      );
    }

    // Filtro de área (solo si no está en el rango completo)
    if (filters.areaRange[0] !== areaStats.min || filters.areaRange[1] !== areaStats.max) {
      filtered = filtered.filter(p =>
        p.area >= filters.areaRange[0] &&
        p.area <= filters.areaRange[1]
      );
    }

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

    // Filtro de tipos de propiedad
    if (filters.propertyTypes.length > 0) {
      filtered = filtered.filter(p => {
        const propertyType = p.propertyType || 'Apartamento'; // fallback
        return filters.propertyTypes.includes(propertyType);
      });
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

    // Filtro de precio por m² (solo si no está en el rango completo)
    if (filters.pricePerM2Range[0] !== pricePerM2Stats.min || filters.pricePerM2Range[1] !== pricePerM2Stats.max) {
      filtered = filtered.filter(p => {
        if (p.area <= 0) return true; // Incluir propiedades sin área
        const pricePerM2 = p.totalPrice / p.area;
        return pricePerM2 >= filters.pricePerM2Range[0] &&
               pricePerM2 <= filters.pricePerM2Range[1];
      });
    }

    // Filtro de calidad de datos (corruptos) - Muy flexible
    if (filters.hideCorrupt) {
      filtered = filtered.filter(p => {
        // Una propiedad es "corrupta" solo si le falta información ESENCIAL
        const hasPrice = p.price && p.price > 0;
        const hasTitle = p.title && p.title.trim().length > 5; // Al menos 5 caracteres

        // Solo requerir precio y título mínimo (muy flexible)
        return hasPrice && hasTitle;
      });
    }

    // Eliminar duplicados si está activado - Menos agresivo
    if (filters.removeDuplicates) {
      const seen = new Set();
      filtered = filtered.filter(p => {
        // Crear una clave única solo con datos críticos para evitar eliminar propiedades válidas
        const key = `${p.url || ''}-${p.source || ''}`;
        if (seen.has(key) && key !== '-') { // Solo eliminar si hay URL y fuente
          return false;
        }
        seen.add(key);
        return true;
      });
    }

    onFiltersChange(filtered);
  }, [filters, properties, hasActiveFilters, priceStats, areaStats, pricePerM2Stats]); // Removed onFiltersChange from dependencies to prevent infinite loop

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
      removeDuplicates: true,
      hasParking: null,
      hideCorrupt: true, // ✅ Mantener marcado por defecto
      propertyTypes: [],
    });
  };

  return (
    <Paper elevation={2} sx={{ mb: 3 }}>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
            <FilterIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
            Filtros Avanzados
          </Typography>
          <Button
            startIcon={<ClearIcon />}
            onClick={resetFilters}
            size="small"
            color="secondary"
          >
            Limpiar
          </Button>
        </Box>
      </Box>

      <Box sx={{ p: 2 }}>
        {/* Precio y Área en la misma línea */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" gutterBottom>
              Precio: {formatPrice(filters.priceRange[0])} - {formatPrice(filters.priceRange[1])}
            </Typography>
            <Slider
              value={filters.priceRange}
              onChange={(_, newValue) => setFilters(prev => ({
                ...prev,
                priceRange: newValue as [number, number]
              }))}
              valueLabelDisplay="auto"
              valueLabelFormat={formatPrice}
              min={priceStats.min}
              max={priceStats.max}
              sx={{ mt: 1 }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" gutterBottom>
              Área: {filters.areaRange[0]}m² - {filters.areaRange[1]}m²
            </Typography>
            <Slider
              value={filters.areaRange}
              onChange={(_, newValue) => setFilters(prev => ({
                ...prev,
                areaRange: newValue as [number, number]
              }))}
              valueLabelDisplay="auto"
              valueLabelFormat={(value) => `${value}m²`}
              min={areaStats.min}
              max={areaStats.max}
              sx={{ mt: 1 }}
            />
          </Grid>
        </Grid>

        {/* Filtros categóricos - 4 columnas perfectamente alineadas */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {/* Habitaciones */}
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="subtitle2" gutterBottom>Habitaciones</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {[0, 1, 2, 3, 4, 5].map(num => (
                <Chip
                  key={num}
                  label={num === 0 ? 'Sin especificar' : `${num}${num === 5 ? '+' : ''}`}
                  onClick={() => setFilters(prev => ({
                    ...prev,
                    rooms: prev.rooms.includes(num)
                      ? prev.rooms.filter(r => r !== num)
                      : [...prev.rooms, num]
                  }))}
                  color={filters.rooms.includes(num) ? 'primary' : 'default'}
                  variant={filters.rooms.includes(num) ? 'filled' : 'outlined'}
                  size="small"
                />
              ))}
            </Box>
          </Grid>

          {/* Baños */}
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="subtitle2" gutterBottom>Baños</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {[1, 2, 3, 4, 5].map(num => (
                <Chip
                  key={num}
                  label={`${num}${num === 5 ? '+' : ''}`}
                  onClick={() => setFilters(prev => ({
                    ...prev,
                    bathrooms: prev.bathrooms.includes(num)
                      ? prev.bathrooms.filter(b => b !== num)
                      : [...prev.bathrooms, num]
                  }))}
                  color={filters.bathrooms.includes(num) ? 'primary' : 'default'}
                  variant={filters.bathrooms.includes(num) ? 'filled' : 'outlined'}
                  size="small"
                />
              ))}
            </Box>
          </Grid>

          {/* Parqueaderos */}
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="subtitle2" gutterBottom>Parqueaderos</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {[0, 1, 2, 3, 4].map(num => (
                <Chip
                  key={num}
                  label={num === 0 ? 'Sin parqueadero' : `${num}${num === 4 ? '+' : ''}`}
                  onClick={() => setFilters(prev => ({
                    ...prev,
                    parking: prev.parking.includes(num)
                      ? prev.parking.filter(p => p !== num)
                      : [...prev.parking, num]
                  }))}
                  color={filters.parking.includes(num) ? 'primary' : 'default'}
                  variant={filters.parking.includes(num) ? 'filled' : 'outlined'}
                  size="small"
                />
              ))}
            </Box>
          </Grid>

          {/* Estrato */}
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="subtitle2" gutterBottom>Estrato</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {[1, 2, 3, 4, 5, 6].map(num => (
                <Chip
                  key={num}
                  label={`${num}`}
                  onClick={() => setFilters(prev => ({
                    ...prev,
                    stratum: prev.stratum.includes(num)
                      ? prev.stratum.filter(s => s !== num)
                      : [...prev.stratum, num]
                  }))}
                  color={filters.stratum.includes(num) ? 'primary' : 'default'}
                  variant={filters.stratum.includes(num) ? 'filled' : 'outlined'}
                  size="small"
                />
              ))}
            </Box>
          </Grid>
        </Grid>

        {/* Tipos de Propiedad */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Tipo de Propiedad
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {uniquePropertyTypes.map(type => (
              <Chip
                key={type}
                label={type}
                onClick={() => setFilters(prev => ({
                  ...prev,
                  propertyTypes: prev.propertyTypes.includes(type)
                    ? prev.propertyTypes.filter(t => t !== type)
                    : [...prev.propertyTypes, type]
                }))}
                color={filters.propertyTypes.includes(type) ? 'primary' : 'default'}
                variant={filters.propertyTypes.includes(type) ? 'filled' : 'outlined'}
                size="small"
              />
            ))}
          </Box>
        </Box>

        {/* Amenidades Mejoradas */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Amenidades y Servicios
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, maxHeight: '120px', overflowY: 'auto' }}>
            {uniqueAmenities.map(amenity => (
              <Chip
                key={amenity}
                label={amenity}
                onClick={() => setFilters(prev => ({
                  ...prev,
                  amenities: prev.amenities.includes(amenity)
                    ? prev.amenities.filter(a => a !== amenity)
                    : [...prev.amenities, amenity]
                }))}
                color={filters.amenities.includes(amenity) ? 'secondary' : 'default'}
                variant={filters.amenities.includes(amenity) ? 'filled' : 'outlined'}
                size="small"
              />
            ))}
          </Box>
        </Box>



        {/* Opciones */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" gutterBottom>Opciones</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={filters.removeDuplicates}
                    onChange={(e) => setFilters(prev => ({
                      ...prev,
                      removeDuplicates: e.target.checked
                    }))}
                    color="primary"
                  />
                }
                label="Eliminar duplicados"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={filters.hideCorrupt}
                    onChange={(e) => setFilters(prev => ({
                      ...prev,
                      hideCorrupt: e.target.checked
                    }))}
                    color="secondary"
                  />
                }
                label="Solo datos completos"
              />
            </Box>
          </Grid>
        </Grid>

        {/* Fuentes de Datos */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Fuentes de Datos ({filters.sources.length} seleccionadas)
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {uniqueSources.map(source => {
              const count = properties.filter(p => p.source === source).length;
              return (
                <Chip
                  key={source}
                  label={`${source} (${count})`}
                  onClick={() => setFilters(prev => ({
                    ...prev,
                    sources: prev.sources.includes(source)
                      ? prev.sources.filter(s => s !== source)
                      : [...prev.sources, source]
                  }))}
                  color={filters.sources.includes(source) ? 'primary' : 'default'}
                  variant={filters.sources.includes(source) ? 'filled' : 'outlined'}
                  size="small"
                />
              );
            })}
          </Box>
        </Box>

        {/* Resumen */}
        <Divider sx={{ my: 2 }} />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            {hasActiveFilters ? 'Filtros aplicados' : 'Sin filtros aplicados'}
          </Typography>
          <Typography variant="body2" color="primary" sx={{ fontWeight: 'medium' }}>
            {uniqueSources.length} fuentes activas
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
};

export default PropertyFilters;
