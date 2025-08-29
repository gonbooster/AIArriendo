import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Slider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Grid,
  Button,
  Divider,
  TextField,
  SelectChangeEvent
} from '@mui/material';
import {
  FilterList as FilterIcon,
  Clear as ClearIcon
} from '@mui/icons-material';

import { Property } from '../types';

interface FilterState {
  priceRange: [number, number];
  areaRange: [number, number];
  rooms: number[];
  bathrooms: number[];
  parking: number[];
  sources: string[];
  neighborhoods: string[];
  pricePerM2Range: [number, number];
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  minScore: number;
}

interface AdvancedFiltersProps {
  properties: Property[];
  onFilterChange: (filteredProperties: Property[]) => void;
  onStatsChange?: (stats: any) => void;
}

const AdvancedFilters: React.FC<AdvancedFiltersProps> = ({
  properties,
  onFilterChange,
  onStatsChange
}) => {
  // Calculate initial ranges from properties
  const getInitialRanges = () => {
    if (properties.length === 0) {
      return {
        priceRange: [500000, 5000000] as [number, number],
        areaRange: [30, 200] as [number, number],
        pricePerM2Range: [10000, 50000] as [number, number]
      };
    }

    const prices = properties.map(p => p.price).filter(p => p > 0);
    const areas = properties.map(p => p.area).filter(a => a > 0);
    const pricesPerM2 = properties.map(p => p.pricePerM2).filter(p => p > 0);

    return {
      priceRange: [Math.min(...prices), Math.max(...prices)] as [number, number],
      areaRange: [Math.min(...areas), Math.max(...areas)] as [number, number],
      pricePerM2Range: [Math.min(...pricesPerM2), Math.max(...pricesPerM2)] as [number, number]
    };
  };

  const initialRanges = getInitialRanges();
  
  const [filters, setFilters] = useState<FilterState>({
    priceRange: initialRanges.priceRange,
    areaRange: initialRanges.areaRange,
    rooms: [],
    bathrooms: [],
    parking: [],
    sources: [],
    neighborhoods: [],
    pricePerM2Range: initialRanges.pricePerM2Range,
    sortBy: 'price',
    sortOrder: 'asc',
    minScore: 0
  });

  // Get unique values for filter options
  const getUniqueValues = () => {
    const sources = Array.from(new Set(properties.map(p => p.source)));
    const neighborhoods = Array.from(new Set(properties.map(p => p.location.neighborhood).filter(Boolean))) as string[];
    const roomOptions = Array.from(new Set(properties.map(p => p.rooms).filter(r => r > 0))).sort((a, b) => a - b);
    const bathroomOptions = Array.from(new Set(properties.map(p => p.bathrooms).filter((b): b is number => typeof b === 'number' && b > 0))).sort((a, b) => a - b);
    const parkingOptions = Array.from(new Set(properties.map(p => p.parking || 0))).sort((a, b) => a - b);

    return { sources, neighborhoods, roomOptions, bathroomOptions, parkingOptions };
  };

  const { sources, neighborhoods, roomOptions, bathroomOptions, parkingOptions } = getUniqueValues();

  // Apply filters
  const applyFilters = () => {
    let filtered = [...properties];

    // Price range
    filtered = filtered.filter(p => 
      p.price >= filters.priceRange[0] && p.price <= filters.priceRange[1]
    );

    // Area range
    filtered = filtered.filter(p => 
      p.area >= filters.areaRange[0] && p.area <= filters.areaRange[1]
    );

    // Price per m² range
    filtered = filtered.filter(p => 
      p.pricePerM2 >= filters.pricePerM2Range[0] && p.pricePerM2 <= filters.pricePerM2Range[1]
    );

    // Rooms
    if (filters.rooms.length > 0) {
      filtered = filtered.filter(p => filters.rooms.includes(p.rooms));
    }

    // Bathrooms
    if (filters.bathrooms.length > 0) {
      filtered = filtered.filter(p => p.bathrooms && filters.bathrooms.includes(p.bathrooms));
    }

    // Parking
    if (filters.parking.length > 0) {
      filtered = filtered.filter(p => filters.parking.includes(p.parking || 0));
    }

    // Sources
    if (filters.sources.length > 0) {
      filtered = filtered.filter(p => filters.sources.includes(p.source));
    }

    // Neighborhoods
    if (filters.neighborhoods.length > 0) {
      filtered = filtered.filter(p => 
        p.location.neighborhood && filters.neighborhoods.includes(p.location.neighborhood)
      );
    }



    // Sort
    filtered.sort((a, b) => {
      let aVal: any, bVal: any;
      
      switch (filters.sortBy) {
        case 'price':
          aVal = a.price;
          bVal = b.price;
          break;
        case 'area':
          aVal = a.area;
          bVal = b.area;
          break;
        case 'pricePerM2':
          aVal = a.pricePerM2;
          bVal = b.pricePerM2;
          break;
        case 'rooms':
          aVal = a.rooms;
          bVal = b.rooms;
          break;
        default:
          aVal = a.price;
          bVal = b.price;
      }

      if (filters.sortOrder === 'asc') {
        return aVal - bVal;
      } else {
        return bVal - aVal;
      }
    });

    return filtered;
  };

  // Update filters and apply
  useEffect(() => {
    const filtered = applyFilters();
    onFilterChange(filtered);

    // Calculate stats (sin sourceBreakdown para evitar "Distribución por Fuente")
    if (onStatsChange && filtered.length > 0) {
      const stats = {
        total: filtered.length,
        avgPrice: Math.round(filtered.reduce((sum, p) => sum + p.price, 0) / filtered.length),
        avgArea: Math.round(filtered.reduce((sum, p) => sum + p.area, 0) / filtered.length),
        avgPricePerM2: Math.round(filtered.reduce((sum, p) => sum + p.pricePerM2, 0) / filtered.length)
      };
      onStatsChange(stats);
    }
  }, [filters, properties]);

  const handleMultiSelectChange = (
    field: keyof FilterState,
    value: any,
    event: SelectChangeEvent<any>
  ) => {
    setFilters(prev => ({
      ...prev,
      [field]: typeof value === 'string' ? value.split(',') : value
    }));
  };

  const clearFilters = () => {
    setFilters({
      priceRange: initialRanges.priceRange,
      areaRange: initialRanges.areaRange,
      rooms: [],
      bathrooms: [],
      parking: [],
      sources: [],
      neighborhoods: [],
      pricePerM2Range: initialRanges.pricePerM2Range,
      sortBy: 'price',
      sortOrder: 'asc',
      minScore: 0
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  };

  return (
    <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FilterIcon color="primary" />
          <Typography variant="h6">Filtros Avanzados</Typography>
        </Box>
        <Button
          startIcon={<ClearIcon />}
          onClick={clearFilters}
          size="small"
          variant="outlined"
        >
          Limpiar
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* Price Range */}
        <Grid item xs={12} md={6}>
          <Typography gutterBottom>Rango de Precio</Typography>
          <Slider
            value={filters.priceRange}
            onChange={(_, value) => setFilters(prev => ({ ...prev, priceRange: value as [number, number] }))}
            valueLabelDisplay="auto"
            valueLabelFormat={formatPrice}
            min={initialRanges.priceRange[0]}
            max={initialRanges.priceRange[1]}
            step={100000}
          />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
            <Typography variant="caption">{formatPrice(filters.priceRange[0])}</Typography>
            <Typography variant="caption">{formatPrice(filters.priceRange[1])}</Typography>
          </Box>
        </Grid>

        {/* Area Range */}
        <Grid item xs={12} md={6}>
          <Typography gutterBottom>Área (m²)</Typography>
          <Slider
            value={filters.areaRange}
            onChange={(_, value) => setFilters(prev => ({ ...prev, areaRange: value as [number, number] }))}
            valueLabelDisplay="auto"
            min={initialRanges.areaRange[0]}
            max={initialRanges.areaRange[1]}
            step={5}
          />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
            <Typography variant="caption">{filters.areaRange[0]} m²</Typography>
            <Typography variant="caption">{filters.areaRange[1]} m²</Typography>
          </Box>
        </Grid>

        {/* Rooms */}
        <Grid item xs={12} md={4}>
          <FormControl fullWidth>
            <InputLabel>Habitaciones</InputLabel>
            <Select
              multiple
              value={filters.rooms}
              onChange={(e) => handleMultiSelectChange('rooms', e.target.value, e)}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {(selected as number[]).map((value) => (
                    <Chip key={value} label={value} size="small" />
                  ))}
                </Box>
              )}
            >
              {roomOptions.map((room) => (
                <MenuItem key={room} value={room}>
                  {room} {room === 1 ? 'habitación' : 'habitaciones'}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* Bathrooms */}
        <Grid item xs={12} md={4}>
          <FormControl fullWidth>
            <InputLabel>Baños</InputLabel>
            <Select
              multiple
              value={filters.bathrooms}
              onChange={(e) => handleMultiSelectChange('bathrooms', e.target.value, e)}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {(selected as number[]).map((value) => (
                    <Chip key={value} label={value} size="small" />
                  ))}
                </Box>
              )}
            >
              {bathroomOptions.map((bathroom) => (
                <MenuItem key={bathroom} value={bathroom}>
                  {bathroom} {bathroom === 1 ? 'baño' : 'baños'}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* Parking */}
        <Grid item xs={12} md={4}>
          <FormControl fullWidth>
            <InputLabel>Parqueaderos</InputLabel>
            <Select
              multiple
              value={filters.parking}
              onChange={(e) => handleMultiSelectChange('parking', e.target.value, e)}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {(selected as number[]).map((value) => (
                    <Chip key={value} label={value} size="small" />
                  ))}
                </Box>
              )}
            >
              {parkingOptions.map((parking) => (
                <MenuItem key={parking} value={parking}>
                  {parking} {parking === 1 ? 'parqueadero' : 'parqueaderos'}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
      </Grid>

      {/* Filtros Adicionales Unificados */}
      <Divider sx={{ my: 2 }} />

      <Grid container spacing={2}>
        {/* Sources */}
        <Grid item xs={12} md={6}>
          <FormControl fullWidth>
            <InputLabel>Fuentes</InputLabel>
            <Select
              multiple
              value={filters.sources}
              onChange={(e) => handleMultiSelectChange('sources', e.target.value, e)}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {(selected as string[]).map((value) => (
                    <Chip key={value} label={value} size="small" />
                  ))}
                </Box>
              )}
            >
              {sources.map((source) => (
                <MenuItem key={source} value={source}>
                  {source}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* Neighborhoods */}
        <Grid item xs={12} md={6}>
          <FormControl fullWidth>
            <InputLabel>Barrios</InputLabel>
            <Select
              multiple
              value={filters.neighborhoods}
              onChange={(e) => handleMultiSelectChange('neighborhoods', e.target.value, e)}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {(selected as string[]).map((value) => (
                    <Chip key={value} label={value} size="small" />
                  ))}
                </Box>
              )}
            >
              {neighborhoods.map((neighborhood) => (
                <MenuItem key={neighborhood} value={neighborhood}>
                  {neighborhood}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* Sort Options */}
        <Grid item xs={12} md={6}>
          <FormControl fullWidth>
            <InputLabel>Ordenar por</InputLabel>
            <Select
              value={filters.sortBy}
              onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
            >
              <MenuItem value="price">Precio</MenuItem>
              <MenuItem value="area">Área</MenuItem>
              <MenuItem value="pricePerM2">Precio por m²</MenuItem>
              <MenuItem value="rooms">Habitaciones</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} md={6}>
          <FormControl fullWidth>
            <InputLabel>Orden</InputLabel>
            <Select
              value={filters.sortOrder}
              onChange={(e) => setFilters(prev => ({ ...prev, sortOrder: e.target.value as 'asc' | 'desc' }))}
            >
              <MenuItem value="asc">Menor a Mayor</MenuItem>
              <MenuItem value="desc">Mayor a Menor</MenuItem>
            </Select>
          </FormControl>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default AdvancedFilters;
