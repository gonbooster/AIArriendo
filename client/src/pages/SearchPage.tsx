import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import LocationAutocomplete from '../components/LocationAutocomplete';
import { Location } from '../services/locationService';
import {
  Container,
  Paper,
  Typography,
  Grid,
  TextField,
  Button,
  Slider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Box,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Backdrop,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Divider,
  Stack,
  useTheme,
  useMediaQuery,
  IconButton
} from '@mui/material';
import {
  Search as SearchIcon,
  LocationOn as LocationIcon,
  Home as HomeIcon,
  Bathtub as BathtubIcon,
  SquareFoot as AreaIcon,
  AttachMoney as PriceIcon,
  DirectionsCar as ParkingIcon,
  Clear as ClearIcon
} from '@mui/icons-material';

import { searchAPI } from '../services/api';
import { SearchCriteria } from '../types';
import PreferenceChip from '../components/PreferenceChip';

// Tipos para el formulario
interface SearchForm {
  operation: string;
  propertyTypes: string[];
  location: Location | null;
  minStratum: number;
  maxStratum: number;
  minRooms: number;
  maxRooms: number;
  minBathrooms: number;
  maxBathrooms: number;
  minParking: number;
  maxParking: number;
  minArea: number;
  maxArea: number;
  minPrice: number;
  maxPrice: number;
  allowAdminOverage: boolean;
  wetAreas: Record<string, 'no' | 'nice' | 'essential'>;
  sports: Record<string, 'no' | 'nice' | 'essential'>;
  amenities: Record<string, 'no' | 'nice' | 'essential'>;
}

// Datos estáticos
const PROPERTY_TYPES = [
  'Apartamento', 'Casa', 'Estudio', 'Loft', 'Penthouse', 'Duplex',
  'Apartaestudio', 'Casa lote', 'Finca', 'Local comercial'
];

const WET_AREAS = [
  'Cocina integral', 'Cocina independiente', 'Zona de lavado', 'Lavandería',
  'Cuarto de servicio', 'Patio de ropas', 'Área húmeda'
];

const SPORTS = [
  'Gimnasio', 'Piscina', 'Cancha de tenis', 'Cancha múltiple', 'Squash',
  'Cancha de fútbol', 'Cancha de básquet', 'Sauna', 'Turco', 'Spa',
  'Yoga', 'Pilates', 'Spinning', 'Ping pong'
];

const AMENITIES = [
  'Portería 24h', 'Ascensor', 'Parqueadero visitantes', 'Cuarto útil', 'Balcón',
  'Terraza', 'Jardín', 'BBQ', 'Salón social', 'Biblioteca', 'Salón de juegos',
  'Cine', 'Business center', 'Coworking', 'Playground', 'Guardería',
  'Enfermería', 'Lavandería comunal', 'Depósito', 'Citófono', 'Circuito cerrado',
  'Planta eléctrica', 'Agua caliente', 'Gas natural', 'Internet', 'Cable TV'
];

const SearchPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Obtener criterios previos si vienen desde ResultsPage
  const previousCriteria = location.state?.previousCriteria;
  const shouldRememberInputs = location.state?.rememberInputs;

  // Función para convertir criterios de búsqueda a formato de formulario
  const convertCriteriaToFormValues = (criteria: any): SearchForm => {
    if (!criteria || !shouldRememberInputs) {
      // Valores por defecto (pedidos)
      return {
        operation: 'arriendo',
        propertyTypes: ['Apartamento'],
        location: { id: 'bog_usaquen', name: 'Usaquén', type: 'neighborhood', city: 'Bogotá', department: 'Bogotá D.C.' },
        minStratum: 3,
        maxStratum: 5,
        minRooms: 3,
        maxRooms: 4,
        minBathrooms: 2,
        maxBathrooms: 3,
        minParking: 0,
        maxParking: 2,
        minArea: 70,
        maxArea: 110,
        minPrice: 500000,
        maxPrice: 3500000,
        allowAdminOverage: false,
        wetAreas: {},
        sports: {},
        amenities: {}
      };
    }

    // Convertir criterios previos al formato del formulario
    return {
      operation: criteria.operation ?? 'arriendo',
      propertyTypes: criteria.propertyTypes ?? ['Apartamento'],
      location: criteria.location?.neighborhoods?.[0] ?
        { id: 'custom', name: criteria.location.neighborhoods[0], type: 'neighborhood' as const } :
        { id: 'bog_usaquen', name: 'Usaquén', type: 'neighborhood' as const, city: 'Bogotá', department: 'Bogotá D.C.' },
      minStratum: criteria.minStratum ?? 3,
      maxStratum: criteria.maxStratum ?? 5,
      minRooms: criteria.minRooms ?? 3,
      maxRooms: criteria.maxRooms ?? 4,
      minBathrooms: criteria.minBathrooms ?? 2,
      maxBathrooms: criteria.maxBathrooms ?? 3,
      minParking: criteria.minParking ?? 0,
      maxParking: criteria.maxParking ?? 2,
      minArea: criteria.minArea ?? 70,
      maxArea: criteria.maxArea ?? 110,
      minPrice: criteria.minPrice ?? 500000,
      maxPrice: criteria.maxPrice ?? 3500000,
      allowAdminOverage: criteria.allowAdminOverage ?? false,
      wetAreas: {},
      sports: {},
      amenities: {}
    };
  };

  // Estados
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState('');

  // Funciones para filtrar preferencias
  const filterItems = (items: string[], filter: string) => {
    if (!filter) return items;
    return items.filter(item =>
      item.toLowerCase().includes(filter.toLowerCase())
    );
  };

  // Formulario con valores por defecto o criterios previos
  const { control, handleSubmit, watch, setValue, reset } = useForm<SearchForm>({
    defaultValues: convertCriteriaToFormValues(previousCriteria)
  });

  // Limpiar el estado de navegación después de usarlo
  useEffect(() => {
    if (shouldRememberInputs && location.state) {
      // Limpiar el estado para evitar que se mantenga en navegaciones futuras
      window.history.replaceState({}, document.title);
    }
  }, [shouldRememberInputs, location.state]);

  // Función de búsqueda
  const onSubmit = async (data: SearchForm) => {
    console.log('🔍 Iniciando búsqueda...', data);
    console.log('🎯 Preferencias RAW:', {
      wetAreas: data.wetAreas,
      sports: data.sports,
      amenities: data.amenities
    });

    try {
      setLoading(true);
      setError(null);

      // Construir criterios de búsqueda
      const searchCriteria: SearchCriteria = {
        operation: data.operation,
        propertyTypes: data.propertyTypes,
        minRooms: data.minRooms,
        maxRooms: data.maxRooms,
        minBathrooms: data.minBathrooms,
        maxBathrooms: data.maxBathrooms,
        minParking: data.minParking,
        maxParking: data.maxParking,
        minArea: data.minArea,
        maxArea: data.maxArea,
        minPrice: data.minPrice,
        maxPrice: data.maxPrice,
        allowAdminOverage: data.allowAdminOverage,
        minStratum: data.minStratum,
        maxStratum: data.maxStratum,
        location: {
          neighborhoods: data.location ? [data.location.name] : ['Chapinero']
        },
        preferences: {
          wetAreas: Object.entries(data.wetAreas).filter(([_, value]) => value !== 'no').map(([key, value]) => ({ name: key, priority: value as 'nice' | 'essential' })),
          sports: Object.entries(data.sports).filter(([_, value]) => value !== 'no').map(([key, value]) => ({ name: key, priority: value as 'nice' | 'essential' })),
          amenities: Object.entries(data.amenities).filter(([_, value]) => value !== 'no').map(([key, value]) => ({ name: key, priority: value as 'nice' | 'essential' }))
        }
      };

      console.log('🎯 Preferencias PROCESADAS:', {
        wetAreas: Object.entries(data.wetAreas).filter(([_, value]) => value !== 'no').map(([key, value]) => ({ name: key, priority: value })),
        sports: Object.entries(data.sports).filter(([_, value]) => value !== 'no').map(([key, value]) => ({ name: key, priority: value })),
        amenities: Object.entries(data.amenities).filter(([_, value]) => value !== 'no').map(([key, value]) => ({ name: key, priority: value }))
      });
      console.log('📋 Criterios de búsqueda:', searchCriteria);

      // Realizar búsqueda
      const results = await searchAPI.search(searchCriteria);
      console.log('✅ Resultados obtenidos:', results);

      // Navegar a resultados
      navigate('/results', {
        state: { results, criteria: searchCriteria },
        replace: false
      });

    } catch (err: any) {
      console.error('❌ Error en búsqueda:', err);
      setError(err.message || 'Error al realizar la búsqueda');
    } finally {
      setLoading(false);
    }
  };

  // Función para limpiar formulario
  const handleClear = () => {
    reset();
    setError(null);
  };

  // NO ejecutar búsqueda automática - solo mostrar formulario

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box textAlign="center" mb={4}>
        <Box textAlign="center" mb={4}>
          <Typography variant="h3" component="h1" gutterBottom color="primary" fontWeight="bold">
            🏡 Descubre Tu Hogar Ideal
          </Typography>
          <Typography variant="h6" color="text.secondary">
            Compara propiedades de manera rápida y sencilla para encontrar el lugar perfecto para ti
          </Typography>
        </Box>

        {/* Mensaje cuando se recuerdan los inputs */}
        {shouldRememberInputs && (
          <Alert severity="info" sx={{ mt: 2, maxWidth: 600, mx: 'auto' }}>
            📋 Se han restaurado tus criterios de búsqueda anteriores
          </Alert>
        )}

        <Box sx={{ mt: 3 }}>
          <Button
            variant="contained"
            size="large"
            startIcon={<SearchIcon />}
            onClick={handleSubmit(onSubmit)}
            sx={{ mr: 2 }}
            disabled={loading}
          >
            {loading ? 'Buscando...' : 'Buscar Propiedades'}
          </Button>
        </Box>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Formulario Principal */}
      <Paper elevation={3} sx={{ p: 4, borderRadius: 3 }}>
        <Box component="div" onSubmit={(e) => e.preventDefault()}>
          <Grid container spacing={4}>
            
            {/* Sección: Tipo y Ubicación */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom color="primary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <HomeIcon /> Tipo y Ubicación
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Controller
                    name="operation"
                    control={control}
                    render={({ field }) => (
                      <FormControl fullWidth>
                        <InputLabel>Operación</InputLabel>
                        <Select
                          {...field}
                          label="Operación"
                        >
                          <MenuItem value="arriendo">Arriendo</MenuItem>
                          <MenuItem value="venta">Venta</MenuItem>
                        </Select>
                      </FormControl>
                    )}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Controller
                    name="propertyTypes"
                    control={control}
                    render={({ field }) => (
                      <FormControl fullWidth>
                        <InputLabel>Tipos de Propiedad</InputLabel>
                        <Select
                          {...field}
                          multiple
                          label="Tipos de Propiedad"
                          renderValue={(selected) => (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {(selected as string[]).map((value) => (
                                <Chip key={value} label={value} size="small" />
                              ))}
                            </Box>
                          )}
                        >
                          {PROPERTY_TYPES.map((type) => (
                            <MenuItem key={type} value={type}>
                              {type}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Controller
                    name="location"
                    control={control}
                    render={({ field }) => (
                      <Box>
                        <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>
                          📍 Ubicación
                        </Typography>
                        <LocationAutocomplete
                          value={field.value?.name || ''}
                          onChange={(location) => field.onChange(location)}
                          placeholder="Buscar ciudad, barrio o zona..."
                          autoFocus={false}
                        />
                      </Box>
                    )}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Box sx={{ mb: 3 }}>
                    <Typography gutterBottom sx={{ mb: 2, fontWeight: 500 }}>
                      💰 Precio: ${watch('minPrice').toLocaleString()} - ${watch('maxPrice').toLocaleString()}
                    </Typography>
                    <Box sx={{ px: 1 }}>
                      <Slider
                        value={[watch('minPrice'), watch('maxPrice')]}
                        min={500000}
                        max={10000000}
                        step={100000}
                        marks={[
                          { value: 500000, label: '$500K' },
                          { value: 2000000, label: '$2M' },
                          { value: 5000000, label: '$5M' },
                          { value: 10000000, label: '$10M' }
                        ]}
                        valueLabelDisplay="auto"
                        valueLabelFormat={(value) => `$${(value / 1000000).toFixed(1)}M`}
                        onChange={(_, value) => {
                          const [min, max] = value as number[];
                          setValue('minPrice', min);
                          setValue('maxPrice', max);
                        }}
                        sx={{
                          '& .MuiSlider-markLabel': {
                            fontSize: '0.75rem',
                            marginTop: '8px'
                          }
                        }}
                      />
                    </Box>
                  </Box>
                </Grid>


              </Grid>
            </Grid>

            {/* Sección: Características */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom color="primary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <HomeIcon /> Características
              </Typography>
              <Grid container spacing={4}>
                <Grid item xs={12} md={4}>
                  <Box sx={{ mb: 3 }}>
                    <Typography gutterBottom sx={{ mb: 2, fontWeight: 500 }}>
                      Habitaciones: {watch('minRooms')} - {watch('maxRooms')}
                    </Typography>
                    <Box sx={{ px: 1 }}>
                      <Slider
                        value={[watch('minRooms'), watch('maxRooms')]}
                        min={1}
                        max={6}
                        step={1}
                        marks={[
                          { value: 1, label: '1' },
                          { value: 2, label: '2' },
                          { value: 3, label: '3' },
                          { value: 4, label: '4' },
                          { value: 5, label: '5' },
                          { value: 6, label: '6' }
                        ]}
                        valueLabelDisplay="auto"
                        onChange={(_, value) => {
                          const [min, max] = value as number[];
                          setValue('minRooms', min);
                          setValue('maxRooms', max);
                        }}
                        sx={{
                          '& .MuiSlider-markLabel': {
                            fontSize: '0.75rem',
                            marginTop: '8px'
                          }
                        }}
                      />
                    </Box>
                  </Box>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Box sx={{ mb: 3 }}>
                    <Typography gutterBottom sx={{ mb: 2, fontWeight: 500 }}>
                      Baños: {watch('minBathrooms')} - {watch('maxBathrooms')}
                    </Typography>
                    <Box sx={{ px: 1 }}>
                      <Slider
                        value={[watch('minBathrooms'), watch('maxBathrooms')]}
                        min={1}
                        max={4}
                        step={1}
                        marks={[
                          { value: 1, label: '1' },
                          { value: 2, label: '2' },
                          { value: 3, label: '3' },
                          { value: 4, label: '4' }
                        ]}
                        valueLabelDisplay="auto"
                        onChange={(_, value) => {
                          const [min, max] = value as number[];
                          setValue('minBathrooms', min);
                          setValue('maxBathrooms', max);
                        }}
                        sx={{
                          '& .MuiSlider-markLabel': {
                            fontSize: '0.75rem',
                            marginTop: '8px'
                          }
                        }}
                      />
                    </Box>
                  </Box>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Box sx={{ mb: 3 }}>
                    <Typography gutterBottom sx={{ mb: 2, fontWeight: 500 }}>
                      Parqueaderos: {watch('minParking')} - {watch('maxParking')}
                    </Typography>
                    <Box sx={{ px: 1 }}>
                      <Slider
                        value={[watch('minParking'), watch('maxParking')]}
                        min={0}
                        max={3}
                        step={1}
                        marks={[
                          { value: 0, label: '0' },
                          { value: 1, label: '1' },
                          { value: 2, label: '2' },
                          { value: 3, label: '3+' }
                        ]}
                        valueLabelDisplay="auto"
                        onChange={(_, value) => {
                          const [min, max] = value as number[];
                          setValue('minParking', min);
                          setValue('maxParking', max);
                        }}
                        sx={{
                          '& .MuiSlider-markLabel': {
                            fontSize: '0.75rem',
                            marginTop: '8px'
                          }
                        }}
                      />
                    </Box>
                  </Box>
                </Grid>

                {/* Segunda fila: Estrato y Área */}
                <Grid item xs={12} md={6}>
                  <Box sx={{ mb: 3 }}>
                    <Typography gutterBottom sx={{ mb: 2, fontWeight: 500 }}>
                      ⭐ Estrato: {watch('minStratum')} - {watch('maxStratum')}
                    </Typography>
                    <Box sx={{ px: 1 }}>
                      <Slider
                        value={[watch('minStratum'), watch('maxStratum')]}
                        min={1}
                        max={6}
                        step={1}
                        marks={[
                          { value: 1, label: '1' },
                          { value: 2, label: '2' },
                          { value: 3, label: '3' },
                          { value: 4, label: '4' },
                          { value: 5, label: '5' },
                          { value: 6, label: '6' }
                        ]}
                        valueLabelDisplay="auto"
                        onChange={(_, value) => {
                          const [min, max] = value as number[];
                          setValue('minStratum', min);
                          setValue('maxStratum', max);
                        }}
                        sx={{
                          '& .MuiSlider-markLabel': {
                            fontSize: '0.75rem',
                            marginTop: '8px'
                          }
                        }}
                      />
                    </Box>
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Box sx={{ mb: 3 }}>
                    <Typography gutterBottom sx={{ mb: 2, fontWeight: 500 }}>
                      📐 Área: {watch('minArea')} - {watch('maxArea')} m²
                    </Typography>
                    <Controller
                      name="minArea"
                      control={control}
                      render={({ field }) => (
                        <Box sx={{ px: 1 }}>
                          <Slider
                            value={[watch('minArea'), watch('maxArea')]}
                            min={20}
                            max={500}
                            step={10}
                            marks={[
                              { value: 20, label: '20m²' },
                              { value: 100, label: '100m²' },
                              { value: 200, label: '200m²' },
                              { value: 500, label: '500m²' }
                            ]}
                            valueLabelDisplay="auto"
                            onChange={(_, value) => {
                              const [min, max] = value as number[];
                              setValue('minArea', min);
                              setValue('maxArea', max);
                            }}
                            sx={{
                              '& .MuiSlider-markLabel': {
                                fontSize: '0.75rem',
                                marginTop: '8px'
                              }
                            }}
                          />
                        </Box>
                      )}
                    />
                  </Box>
                </Grid>
              </Grid>
            </Grid>

            {/* Checkbox de administración */}
            <Grid item xs={12}>
              <Controller
                name="allowAdminOverage"
                control={control}
                render={({ field }) => (
                  <FormControlLabel
                    control={<Checkbox {...field} />}
                    label="Permitir sobrecosto de administración"
                  />
                )}
              />
            </Grid>

            {/* Sección: Preferencias */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" color="primary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PriceIcon /> Preferencias
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    setValue('wetAreas', {});
                    setValue('sports', {});
                    setValue('amenities', {});
                    setSearchFilter('');
                  }}
                >
                  Limpiar Filtros
                </Button>
              </Box>

              {/* Buscador de filtros */}
              <Box sx={{ mb: 3 }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Buscar amenidades, deportes o zonas húmedas..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <SearchIcon sx={{ color: 'action.active', mr: 1 }} />
                    )
                  }}
                />
              </Box>
              <Grid container spacing={3}>
                {/* Zonas Húmedas */}
                {filterItems(WET_AREAS, searchFilter).length > 0 && (
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom color="primary" sx={{ mb: 3 }}>
                      🚿 Zonas Húmedas ({filterItems(WET_AREAS, searchFilter).length})
                    </Typography>
                    <Box sx={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 0.5,
                      alignItems: 'flex-start'
                    }}>
                      {filterItems(WET_AREAS, searchFilter).map((area) => (
                        <PreferenceChip
                          key={area}
                          label={area}
                          value={watch('wetAreas')[area] || 'no'}
                          onChange={(value) => {
                            const current = watch('wetAreas');
                            setValue('wetAreas', { ...current, [area]: value });
                          }}
                        />
                      ))}
                    </Box>
                  </Grid>
                )}

                {/* Deportes */}
                {filterItems(SPORTS, searchFilter).length > 0 && (
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom color="primary" sx={{ mb: 3 }}>
                      🏃‍♂️ Deportes ({filterItems(SPORTS, searchFilter).length})
                    </Typography>
                    <Box sx={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 0.5,
                      alignItems: 'flex-start'
                    }}>
                      {filterItems(SPORTS, searchFilter).map((sport) => (
                        <PreferenceChip
                          key={sport}
                          label={sport}
                          value={watch('sports')[sport] || 'no'}
                          onChange={(value) => {
                            const current = watch('sports');
                            setValue('sports', { ...current, [sport]: value });
                          }}
                        />
                      ))}
                    </Box>
                  </Grid>
                )}

                {/* Amenidades */}
                {filterItems(AMENITIES, searchFilter).length > 0 && (
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom color="primary" sx={{ mb: 3 }}>
                      🏢 Amenidades ({filterItems(AMENITIES, searchFilter).length})
                    </Typography>
                    <Box sx={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 0.5,
                      alignItems: 'flex-start'
                    }}>
                      {filterItems(AMENITIES, searchFilter).map((amenity) => (
                        <PreferenceChip
                          key={amenity}
                          label={amenity}
                          value={watch('amenities')[amenity] || 'no'}
                          onChange={(value) => {
                            const current = watch('amenities');
                            setValue('amenities', { ...current, [amenity]: value });
                          }}
                        />
                      ))}
                    </Box>
                  </Grid>
                )}

                {/* Mensaje cuando no hay resultados */}
                {searchFilter &&
                 filterItems(WET_AREAS, searchFilter).length === 0 &&
                 filterItems(SPORTS, searchFilter).length === 0 &&
                 filterItems(AMENITIES, searchFilter).length === 0 && (
                  <Grid item xs={12}>
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <Typography variant="body2" color="text.secondary">
                        No se encontraron preferencias que coincidan con "{searchFilter}"
                      </Typography>
                    </Box>
                  </Grid>
                )}
              </Grid>
            </Grid>

          </Grid>

          {/* Botones de Acción */}
          <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              size="large"
              startIcon={<ClearIcon />}
              onClick={handleClear}
              disabled={loading}
              sx={{ minWidth: isMobile ? '100%' : 'auto' }}
            >
              Limpiar
            </Button>
            <Button
              variant="contained"
              size="large"
              startIcon={<SearchIcon />}
              onClick={handleSubmit(onSubmit)}
              disabled={loading}
              sx={{ 
                minWidth: isMobile ? '100%' : 200,
                py: 1.5,
                fontSize: '1.1rem'
              }}
            >
              {loading ? 'Buscando...' : 'Buscar Propiedades'}
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Spinner de Carga */}
      <Backdrop
        sx={{
          color: '#fff',
          zIndex: 9999,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          flexDirection: 'column',
          gap: 2
        }}
        open={loading}
      >
        <CircularProgress size={60} />
        <Typography variant="h6">Buscando propiedades...</Typography>
        <Typography variant="body2">Esto puede tomar unos segundos</Typography>
      </Backdrop>
    </Container>
  );
};

export default SearchPage;
