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
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
  Divider,
  useTheme
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon
} from '@mui/icons-material';
import { Property } from '../../types';
import { PROPERTY_DEFAULTS } from '../../config/constants';

interface ModernFiltersMUIProps {
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
}

const ModernFiltersMUI: React.FC<ModernFiltersMUIProps> = ({
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
    removeDuplicates: false,
    hasParking: null,
  });

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

    // Filtro de parqueadero
    if (filters.hasParking !== null) {
      filtered = filtered.filter(p => {
        const hasParking = (p.amenities || []).includes('parqueadero') || (p.parking || 0) > 0;
        return filters.hasParking ? hasParking : !hasParking;
      });
    }

    // Eliminar duplicados si está activado
    if (filters.removeDuplicates) {
      const seen = new Set();
      filtered = filtered.filter(p => {
        // Crear una clave única basada en ubicación y precio
        const key = `${p.location.neighborhood || ''}-${p.totalPrice}-${p.area}-${p.rooms}`;
        if (seen.has(key)) {
          return false;
        }
        seen.add(key);
        return true;
      });
    }

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
      removeDuplicates: false,
      hasParking: null,
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
        {/* Precio */}
        <Box sx={{ mb: 3 }}>
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
        </Box>

        {/* Área */}
        <Box sx={{ mb: 3 }}>
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
        </Box>

        {/* Filtros categóricos */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {/* Habitaciones */}
          <Grid item xs={12} md={4}>
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
          <Grid item xs={12} md={4}>
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
          <Grid item xs={12} md={4}>
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
        </Grid>

        {/* Parqueadero */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" gutterBottom>Parqueadero</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              <Chip
                label="Todos"
                onClick={() => setFilters(prev => ({ ...prev, hasParking: null }))}
                color={filters.hasParking === null ? 'primary' : 'default'}
                variant={filters.hasParking === null ? 'filled' : 'outlined'}
                size="small"
              />
              <Chip
                label="Con parqueadero"
                onClick={() => setFilters(prev => ({ ...prev, hasParking: true }))}
                color={filters.hasParking === true ? 'primary' : 'default'}
                variant={filters.hasParking === true ? 'filled' : 'outlined'}
                size="small"
              />
              <Chip
                label="Sin parqueadero"
                onClick={() => setFilters(prev => ({ ...prev, hasParking: false }))}
                color={filters.hasParking === false ? 'primary' : 'default'}
                variant={filters.hasParking === false ? 'filled' : 'outlined'}
                size="small"
              />
            </Box>
          </Grid>

          {/* Eliminar duplicados */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" gutterBottom>Opciones</Typography>
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
          </Grid>
        </Grid>

        {/* Filtros avanzados en acordeón */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle2">
              Fuentes de Datos ({filters.sources.length} seleccionadas)
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
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
          </AccordionDetails>
        </Accordion>

        {/* Resumen */}
        <Divider sx={{ my: 2 }} />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Mostrando {properties.length} propiedades
          </Typography>
          <Typography variant="body2" color="primary" sx={{ fontWeight: 'medium' }}>
            {uniqueSources.length} fuentes activas
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
};

export default ModernFiltersMUI;
