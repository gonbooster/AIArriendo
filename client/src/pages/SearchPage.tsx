import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import LocationAutocomplete from '../components/LocationAutocomplete';
import SearchProgress from '../components/SearchProgressNew';
import { Location } from '../services/locationService';
import {
  Container,
  Paper,
  Typography,
  Grid,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Backdrop,
  CircularProgress,
  Alert,
  useTheme,
  useMediaQuery,
  Card,
  CardContent,
  Chip,
  LinearProgress
} from '@mui/material';
import {
  Search as SearchIcon,
  LocationOn as LocationIcon,
  Home as HomeIcon,
  TrendingUp as TrendingIcon,
  Speed as SpeedIcon,
  Security as SecurityIcon
} from '@mui/icons-material';

// Tipos para el formulario simplificado - Solo operación y ubicación
interface SimpleSearchForm {
  operation: string;
  location: Location | null;
}

// Datos estáticos simplificados
const OPERATIONS = [
  { value: 'arriendo', label: 'Arriendo' },
  { value: 'venta', label: 'Venta' }
];

const SimpleSearchPage: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Estados
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Formulario con valores por defecto
  const { control, handleSubmit, watch } = useForm<SimpleSearchForm>({
    defaultValues: {
      operation: 'arriendo',
      location: null
    }
  });

  // Función de búsqueda simplificada
  const onSubmit = async (data: SimpleSearchForm) => {
    console.log('🔍 Iniciando búsqueda simplificada...', data);

    if (!data.location) {
      setError('Por favor selecciona una ubicación');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Crear criterios de búsqueda MÍNIMOS - solo operación y ubicación
      const searchCriteria = {
        operation: data.operation,
        location: {
          neighborhoods: [data.location.name]
        }
      };

      console.log('📋 Criterios de búsqueda completos:', searchCriteria);

      // Navegar a la página de resultados DESPUÉS de que termine la búsqueda
      // El SearchProgress se encargará de navegar cuando termine
      navigate('/results', {
        state: {
          searchCriteria,
          fromSimpleSearch: true,
          showProgress: true // Indicar que debe mostrar progreso
        }
      });

    } catch (err) {
      console.error('❌ Error en búsqueda:', err);
      setError('Error al iniciar la búsqueda. Por favor intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const watchedValues = watch();

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header Mejorado */}
      <Paper
        elevation={2}
        sx={{
          p: { xs: 2, sm: 3, md: 4 },
          mb: 4,
          textAlign: 'center',
          background: `linear-gradient(135deg, ${theme.palette.primary.light}15, ${theme.palette.secondary.light}15)`,
          border: `1px solid ${theme.palette.primary.light}30`,
          mx: { xs: 1, sm: 0 }
        }}
      >
<Typography
  variant="h3"
  component="h1"
  gutterBottom
  color="primary"
  fontWeight="bold"
  sx={{
    fontSize: { xs: '1.8rem', sm: '2.5rem', md: '3rem' },
    textAlign: 'center'
  }}
>
  🏠 Propiedades en minutos
</Typography>
<Typography
  variant="h6"
  color="text.secondary"
  mb={2}
  sx={{
    fontSize: { xs: '1rem', sm: '1.1rem', md: '1.25rem' },
    textAlign: 'center',
    px: { xs: 1, sm: 2 }
  }}
>
  Encuentra viviendas, oficinas y locales con nuestro buscador inteligente
</Typography>


        <Box sx={{
          display: 'flex',
          justifyContent: 'center',
          gap: { xs: 1, sm: 2 },
          mb: 2,
          flexWrap: 'wrap',
          alignItems: 'center'
        }}>
          <Chip
            icon={<SpeedIcon />}
            label="Búsqueda Rápida"
            color="primary"
            variant="outlined"
            size="small"
            sx={{
              fontSize: { xs: '0.7rem', sm: '0.8rem' },
              height: { xs: 28, sm: 32 }
            }}
          />
          <Chip
            icon={<SecurityIcon />}
            label="Datos Verificados"
            color="secondary"
            variant="outlined"
            size="small"
            sx={{
              fontSize: { xs: '0.7rem', sm: '0.8rem' },
              height: { xs: 28, sm: 32 }
            }}
          />
          <Chip
            icon={<TrendingIcon />}
            label="8 Fuentes"
            color="success"
            variant="outlined"
            size="small"
            sx={{
              fontSize: { xs: '0.7rem', sm: '0.8rem' },
              height: { xs: 28, sm: 32 }
            }}
          />
        </Box>
        <Typography
          variant="body1"
          color="text.secondary"
          sx={{
            fontSize: { xs: '0.9rem', sm: '1rem' },
            px: { xs: 1, sm: 0 }
          }}
        >
          Busca por operación y ubicación. Aplica filtros avanzados en los resultados.
        </Typography>
      </Paper>

      {/* Componente de Progreso - PRIMERA PRIORIDAD VISUAL */}
      {loading && <SearchProgress />}

      {/* Formulario de búsqueda simplificado */}
      {!loading && (
        <Paper elevation={3} sx={{ p: 4, mb: 4 }}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Grid container spacing={3}>
            {/* Operación */}
            <Grid item xs={12} md={6}>
              <Controller
                name="operation"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth>
                    <InputLabel>
                      <HomeIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                      Operación
                    </InputLabel>
                    <Select {...field} label="Operación">
                      {OPERATIONS.map((op) => (
                        <MenuItem key={op.value} value={op.value}>
                          {op.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              />
            </Grid>

            {/* Ubicación */}
            <Grid item xs={12} md={6}>
              <Controller
                name="location"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <LocationAutocomplete
                    value={value}
                    onChange={onChange}
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <LocationIcon sx={{ mr: 1 }} />
                        Ubicación
                      </Box>
                    }
                    placeholder="Buscar barrio o ciudad..."
                    required
                  />
                )}
              />
            </Grid>

            {/* Botón de búsqueda */}
            <Grid item xs={12}>
              <Box textAlign="center" mt={2}>
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={loading || !watchedValues.location}
                  startIcon={<SearchIcon />}
                  sx={{
                    px: 4,
                    py: 1.5,
                    fontSize: '1.1rem',
                    fontWeight: 'bold',
                    borderRadius: 2
                  }}
                >
                  {loading ? 'Búsqueda en Progreso...' : 'Buscar Propiedades'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
        </Paper>
      )}

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
    </Container>
  );
};

export default SimpleSearchPage;
