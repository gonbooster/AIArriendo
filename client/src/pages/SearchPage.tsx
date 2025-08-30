import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import LocationAutocomplete from '../components/LocationAutocomplete';
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
  useMediaQuery
} from '@mui/material';
import {
  Search as SearchIcon,
  LocationOn as LocationIcon,
  Home as HomeIcon
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

      // Navegar a la página de resultados con los criterios
      navigate('/results', {
        state: {
          searchCriteria,
          fromSimpleSearch: true
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
      {/* Header */}
      <Box textAlign="center" mb={4}>
        <Typography variant="h3" component="h1" gutterBottom color="primary" fontWeight="bold">
          🏠 AI Arriendo Pro
        </Typography>
        <Typography variant="h6" color="text.secondary" mb={2}>
          Encuentra tu hogar ideal con inteligencia artificial
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Busca por operación y ubicación. Aplica filtros avanzados en los resultados.
        </Typography>
      </Box>

      {/* Formulario de búsqueda simplificado */}
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
                  {loading ? 'Buscando...' : 'Buscar Propiedades'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Paper>

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Info adicional */}
      <Paper elevation={1} sx={{ p: 3, bgcolor: 'grey.50' }}>
        <Typography variant="h6" gutterBottom color="primary">
          ¿Cómo funciona?
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          1. <strong>Selecciona</strong> si quieres arrendar o comprar
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          2. <strong>Elige</strong> la ubicación donde quieres buscar
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          3. <strong>Aplica filtros</strong> avanzados en la página de resultados
        </Typography>
        <Typography variant="body2" color="text.secondary">
          4. <strong>Encuentra</strong> tu hogar ideal con IA
        </Typography>
      </Paper>

      {/* Loading backdrop */}
      <Backdrop open={loading} sx={{ zIndex: theme.zIndex.drawer + 1 }}>
        <CircularProgress color="primary" />
      </Backdrop>
    </Container>
  );
};

export default SimpleSearchPage;
