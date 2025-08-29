import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Box,
  Chip,
  Button,
  Paper,
  Divider,
  Alert,
  CircularProgress,
  IconButton,
  Stack,

} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  LocationOn as LocationIcon,
  Home as HomeIcon,
  Bathtub as BathtubIcon,
  SquareFoot as AreaIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';

import Pagination from '@mui/material/Pagination';

import AdvancedFilters from '../components/AdvancedFilters';

import PaginationInfo from '../components/PaginationInfo';
import QuickNavigation from '../components/QuickNavigation';
import PropertyStats from '../components/PropertyStats';

import { Property } from '../types';

interface ResultsState {
  results: {
    properties: Property[];
    total: number;
    page: number;
    limit: number;
  };
  criteria: any;
}

const ResultsPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Estado inicial desde navigation state
  const state = location.state as ResultsState | null;
  const initialResults = state?.results;
  const initialProperties = initialResults?.properties || [];
  const [page, setPage] = useState<number>(initialResults?.page || 1);
  const [limit, setLimit] = useState<number>(initialResults?.limit || 50);
  const [total, setTotal] = useState<number>(initialResults?.total ?? initialProperties.length);

  // Handler para cambiar página (paginación local de filtros)
  const handleLocalPageChange = (_: any, newPage: number) => {
    setCurrentPage(newPage);
    // Scroll to top when changing page
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };




  const [filteredProperties, setFilteredProperties] = useState<Property[]>(initialProperties);
  const [propertyStats, setPropertyStats] = useState<any>(null);


  // Paginación local para propiedades filtradas
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12; // Propiedades por página

  // Calcular propiedades para la página actual
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentProperties = filteredProperties.slice(startIndex, endIndex);
  const totalPages = Math.ceil(filteredProperties.length / itemsPerPage);

  // Obtener datos del estado de navegación

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filteredProperties.length]);

  // Si no hay datos, redirigir a búsqueda
  useEffect(() => {
    if (!state?.results) {
      navigate('/', { replace: true });
    } else {
      // inicializar paginación desde state
      setPage(state.results.page || 1);
      setLimit(state.results.limit || 50);
      setTotal(state.results.total || state.results.properties.length);
    }
  }, [state, navigate]);

  if (!state?.results) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Cargando resultados...
        </Typography>
      </Container>
    );
  }

  const { results, criteria } = state;
  const { properties } = results;

  // Calcular estadísticas por source
  const sourceStats = properties.reduce((acc, property) => {
    const source = property.source || 'Sin fuente';
    acc[source] = (acc[source] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Función para volver a la búsqueda manteniendo los criterios
  const handleBackToSearch = () => {
    navigate('/', {
      replace: false,
      state: {
        previousCriteria: criteria,
        rememberInputs: true
      }
    });
  };

  // Función para formatear precio
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  };

  // Función para obtener color del source
  const getSourceColor = (source: string) => {
    const colors: { [key: string]: string } = {
      'Ciencuadras': '#388e3c',
      'Fincaraiz': '#d32f2f',
      'Arriendo': '#7b1fa2',
      'Metrocuadrado': '#1976d2',
      'Properati': '#ff5722',
      'Pads': '#795548',
      'Rentola': '#607d8b',
      'MercadoLibre': '#ff9800',
      'Trovit': '#f57c00'
    };
    return colors[source] || '#757575';
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <IconButton onClick={handleBackToSearch} color="primary">
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" component="h1" color="primary" fontWeight="bold">
            Resultados de Búsqueda
          </Typography>
        </Box>

        {/* Estadísticas compactas y botón Nueva Búsqueda */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
          {/* Estadísticas por source - más pequeñas y bonitas */}
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {Object.entries(sourceStats).map(([source, count]) => (
              <Chip
                key={source}
                label={`${source}: ${count}`}
                size="small"
                sx={{
                  bgcolor: getSourceColor(source),
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '0.75rem',
                  height: 24,
                  '& .MuiChip-label': {
                    px: 1
                  }
                }}
              />
            ))}
          </Box>

          {/* Botón Nueva Búsqueda */}
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleBackToSearch}
            size="small"
          >
            Nueva Búsqueda
          </Button>
        </Box>

        {/* Criterios de búsqueda */}
        <Paper elevation={1} sx={{ p: 2, mb: 3, bgcolor: 'grey.50' }}>
          <Typography variant="subtitle2" gutterBottom color="text.secondary">
            Criterios de búsqueda:
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {criteria.operation && (
              <Chip label={criteria.operation.charAt(0).toUpperCase() + criteria.operation.slice(1)} size="small" color="primary" />
            )}
            {criteria.propertyTypes && criteria.propertyTypes.length > 0 && (
              <Chip label={criteria.propertyTypes.join(', ')} size="small" color="secondary" />
            )}
            <Chip label={`${criteria.minRooms}-${criteria.maxRooms} habitaciones`} size="small" />
            {criteria.minBathrooms && criteria.maxBathrooms && (
              <Chip label={`${criteria.minBathrooms}-${criteria.maxBathrooms} baños`} size="small" />
            )}
            {criteria.minParking !== undefined && criteria.maxParking !== undefined && (
              <Chip label={`${criteria.minParking}-${criteria.maxParking} parqueaderos`} size="small" />
            )}
            <Chip label={`${criteria.minArea}-${criteria.maxArea} m²`} size="small" />
            <Chip label={`$${(criteria.minPrice || 0).toLocaleString('es-CO')} - $${criteria.maxPrice.toLocaleString('es-CO')}`} size="small" />
            {criteria.minStratum && criteria.maxStratum && (
              <Chip label={`Estrato ${criteria.minStratum}-${criteria.maxStratum}`} size="small" />
            )}
            {criteria.location?.neighborhoods?.length > 0 && (
              <Chip label={`${criteria.location.neighborhoods.join(', ')}`} size="small" />
            )}
            {criteria.allowAdminOverage && (
              <Chip label="Con sobrecosto admin" size="small" variant="outlined" />
            )}
            {/* Preferencias */}
            {criteria.preferences?.amenities?.length > 0 && (
              criteria.preferences.amenities.map((amenity: { name: string; priority: 'nice' | 'essential' }) => (
                <Chip
                  key={amenity.name}
                  label={`${amenity.name} (${amenity.priority === 'essential' ? 'Esencial' : 'Me gusta'})`}
                  size="small"
                  color={amenity.priority === 'essential' ? 'error' : 'info'}
                  variant="outlined"
                />
              ))
            )}
            {criteria.preferences?.sports?.length > 0 && (
              criteria.preferences.sports.map((sport: { name: string; priority: 'nice' | 'essential' }) => (
                <Chip
                  key={sport.name}
                  label={`${sport.name} (${sport.priority === 'essential' ? 'Esencial' : 'Me gusta'})`}
                  size="small"
                  color={sport.priority === 'essential' ? 'error' : 'info'}
                  variant="outlined"
                />
              ))
            )}
            {criteria.preferences?.wetAreas?.length > 0 && (
              criteria.preferences.wetAreas.map((wetArea: { name: string; priority: 'nice' | 'essential' }) => (
                <Chip
                  key={wetArea.name}
                  label={`${wetArea.name} (${wetArea.priority === 'essential' ? 'Esencial' : 'Me gusta'})`}
                  size="small"
                  color={wetArea.priority === 'essential' ? 'error' : 'info'}
                  variant="outlined"
                />
              ))
            )}
          </Box>
        </Paper>

        {/* Filtros Avanzados */}
        {properties.length > 0 && (
          <AdvancedFilters
            properties={properties}
            onFilterChange={setFilteredProperties}
            onStatsChange={setPropertyStats}
          />
        )}

        {/* Estadísticas Mejoradas - Solo las buenas */}
        {propertyStats && (
          <PropertyStats
            stats={propertyStats}
            totalProperties={properties.length}
          />
        )}



        {/* Información de Paginación - Solo si hay filtros activos */}
        {filteredProperties.length !== properties.length && filteredProperties.length > 0 && (
          <PaginationInfo
            currentPage={currentPage}
            totalPages={totalPages}
            itemsPerPage={itemsPerPage}
            filteredCount={filteredProperties.length}
            totalProperties={properties.length}
            backendPage={page}
            backendTotal={total}
            backendLimit={limit}
          />
        )}

        {/* Navegación Rápida - Solo para muchas páginas */}
        {totalPages > 5 && (
          <QuickNavigation
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={(page) => handleLocalPageChange(null, page)}
            disabled={false}
          />
        )}
      </Box>

      {/* Lista de propiedades */}
      {filteredProperties.length === 0 ? (
        <Box
          sx={{
            display: "flex",
            alignItems: "center", // centra verticalmente
            justifyContent: "center", // centra horizontalmente
          }}
        >
          <Alert severity="info" sx={{ textAlign: "center", borderRadius: 2}}>
            <Typography variant="h6" gutterBottom>
              {properties.length === 0
                ? "No se encontraron propiedades"
                : "No hay propiedades que coincidan con los filtros"
              }
            </Typography>
            <Typography variant="body2">
              {properties.length === 0
                ? "Intenta ajustar tus criterios de búsqueda para obtener más resultados."
                : "Ajusta los filtros para ver más propiedades."
              }
            </Typography>
            <Button
              variant="contained"
              onClick={handleBackToSearch}
              sx={{ mt: 2 }}
            >
              Modificar Búsqueda
            </Button>
          </Alert>
        </Box>

      ) : (
        <Grid container spacing={3}>
          {currentProperties.map((property, index) => (
            <Grid item xs={12} md={6} lg={4} key={property.id || index}>
              <Card
                elevation={3}
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 6
                  },
                  position: 'relative'
                }}
              >
                {/* Imagen real de la propiedad */}
                <CardMedia
                  component="img"
                  height={200}
                  image={property.images && property.images.length > 0 ? property.images[0] : '/placeholder-property.jpg'}
                  alt={property.title}
                  sx={{
                    objectFit: 'cover'
                  }}
                />
                {/* Badge del source */}
                {property.source && (
                  <Chip
                    label={property.source}
                    size="small"
                    sx={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      bgcolor: getSourceColor(property.source),
                      color: 'white',
                      fontWeight: 'bold',
                      zIndex: 2
                    }}
                  />
                )}

                <CardContent sx={{ flexGrow: 1, p: 2 }}>
                  {/* Título */}
                  <Typography variant="h6" component="h3" gutterBottom noWrap>
                    {typeof property.title === 'string' && property.title.trim().length > 0
                      ? property.title
                      : 'Propiedad sin título'}
                  </Typography>

                  {/* Precio */}
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="h5" color="primary" fontWeight="bold">
                      {property.price && property.price > 0 ? formatPrice(property.price) : 'Por confirmar'}
                    </Typography>
                    {property.adminFee > 0 && (
                      <Typography variant="body2" color="text.secondary">
                        + {formatPrice(property.adminFee)} admin
                      </Typography>
                    )}
                  </Box>

                  {/* Características */}
                  <Stack spacing={1}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <HomeIcon fontSize="small" color="action" />
                      <Typography variant="body2">
                        {typeof property.rooms === 'number' && property.rooms > 0 ? property.rooms : 'N/A'} habitaciones
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <BathtubIcon fontSize="small" color="action" />
                      <Typography variant="body2">
                        {typeof property.bathrooms === 'number' && property.bathrooms > 0 ? property.bathrooms : 'N/A'} baños
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <AreaIcon fontSize="small" color="action" />
                      <Typography variant="body2">
                        {typeof property.area === 'number' && property.area > 0 ? property.area : 'N/A'} m²
                      </Typography>
                    </Box>

                    {property.location && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LocationIcon fontSize="small" color="action" />
                        <Typography variant="body2" noWrap>
                          {typeof property.location === 'string'
                            ? property.location
                            : property.location.address || property.location.neighborhood || 'Ubicación disponible'
                          }
                        </Typography>
                      </Box>
                    )}
                  </Stack>

                  {/* Botón de contacto */}
                  <Button
                    variant="contained"
                    fullWidth
                    sx={{ mt: 2 }}
                    disabled={!property.url || property.url === '' || property.url === 'No disponible'}
                    onClick={() => {
                      if (property.url && property.url !== '' && property.url !== 'No disponible') {
                        window.open(property.url, '_blank');
                      }
                    }}
                  >
                    {property.url && property.url !== '' && property.url !== 'No disponible' ? 'Ver Detalles' : 'Sin URL'}
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Footer con estadísticas y paginación */}
      <Box sx={{ mt: 6, textAlign: 'center' }}>
        <Divider sx={{ mb: 3 }} />
        {/* Paginación Unificada */}
        {totalPages > 1 && (
          <Box sx={{ mb: 2 }}>
            {/* Información de paginación */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Mostrando {startIndex + 1}-{Math.min(endIndex, filteredProperties.length)} de {filteredProperties.length} propiedades
                {filteredProperties.length !== properties.length && (
                  <span> • {properties.length} total encontradas</span>
                )}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Página {currentPage} de {totalPages}
              </Typography>
            </Box>

            {/* Paginación principal */}
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <Pagination
                count={totalPages}
                page={currentPage}
                onChange={handleLocalPageChange}
                color="primary"
                size="large"
                showFirstButton
                showLastButton
              />
            </Box>
          </Box>
        )}


        <Typography variant="body2" color="text.secondary">
          Resultados obtenidos de múltiples fuentes inmobiliarias
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Última actualización: {new Date().toLocaleString('es-CO')}
        </Typography>
      </Box>
    </Container>
  );
};

export default ResultsPage;
