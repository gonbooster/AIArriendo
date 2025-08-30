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
  CircularProgress,
  IconButton,
  Alert
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  LocationOn as LocationIcon,
  Home as HomeIcon,
  Bathtub as BathtubIcon,
  SquareFoot as AreaIcon,
  AttachMoney as PriceIcon
} from '@mui/icons-material';

import AdvancedFilters from '../components/AdvancedFilters';
import ModernFiltersMUI from '../components/filters/ModernFiltersMUI';
import PropertyStatsMUI from '../components/stats/PropertyStatsMUI';
import { Property } from '../types';
import { searchAPI } from '../services/api';

const NewResultsPage: React.FC = () => {
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
  const [propertyStats, setPropertyStats] = useState<any>(null);

  // Paginación local
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentProperties = filteredProperties.slice(startIndex, endIndex);
  const totalPages = Math.ceil(filteredProperties.length / itemsPerPage);

  // Ejecutar búsqueda inicial si venimos desde SimpleSearchPage
  useEffect(() => {
    const executeSearch = async () => {
      if (fromSimpleSearch && searchCriteria && !initialResults) {
        console.log('🔍 Ejecutando búsqueda desde SimpleSearchPage...', searchCriteria);
        setLoading(true);
        setError(null);

        try {
          const result = await searchAPI.search(searchCriteria);
          console.log('✅ Búsqueda completada:', result);
          
          const properties = result.properties || [];
          setAllProperties(properties);
          setFilteredProperties(properties);
          
        } catch (err) {
          console.error('❌ Error en búsqueda:', err);
          setError('Error al buscar propiedades. Por favor intenta de nuevo.');
        } finally {
          setLoading(false);
        }
      }
    };

    executeSearch();
  }, [fromSimpleSearch, searchCriteria, initialResults]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filteredProperties.length]);

  // Redirigir si no hay datos válidos
  useEffect(() => {
    if (!fromSimpleSearch && !initialResults) {
      navigate('/', { replace: true });
    }
  }, [fromSimpleSearch, initialResults, navigate]);

  // Función para volver a la búsqueda
  const handleBackToSearch = () => {
    navigate('/', {
      state: {
        previousCriteria: searchCriteria,
        rememberInputs: true
      }
    });
  };

  // Mostrar loading
  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
          <CircularProgress size={60} />
          <Typography variant="h6" sx={{ ml: 2 }}>
            Buscando propiedades...
          </Typography>
        </Box>
      </Container>
    );
  }

  // Mostrar error
  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button variant="contained" onClick={handleBackToSearch}>
          Volver a buscar
        </Button>
      </Container>
    );
  }

  // Calcular estadísticas por source
  const sourceStats = allProperties.reduce((acc, property) => {
    const source = property.source || 'Sin fuente';
    acc[source] = (acc[source] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header con botón de volver */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={handleBackToSearch} sx={{ mr: 2 }}>
          <ArrowBackIcon />
        </IconButton>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Resultados de búsqueda
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {allProperties.length} propiedades encontradas
            {searchCriteria?.location?.neighborhoods?.[0] && 
              ` en ${searchCriteria.location.neighborhoods[0]}`
            }
          </Typography>
        </Box>
      </Box>

      {/* Estadísticas Modernas */}
      {allProperties.length > 0 && (
        <PropertyStatsMUI properties={filteredProperties} />
      )}

      {/* Filtros Modernos */}
      {allProperties.length > 0 && (
        <ModernFiltersMUI
          properties={allProperties}
          onFiltersChange={setFilteredProperties}
        />
      )}

      {/* Información de resultados filtrados */}
      {filteredProperties.length !== allProperties.length && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Mostrando {filteredProperties.length} de {allProperties.length} propiedades después de aplicar filtros
        </Alert>
      )}

      {/* Lista de propiedades */}
      {filteredProperties.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h5" gutterBottom>
            {allProperties.length === 0 ? 'No se encontraron propiedades' : 'Sin resultados con estos filtros'}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            {allProperties.length === 0 
              ? 'Intenta buscar en otra ubicación o ajustar los criterios.'
              : 'Prueba relajando algunos filtros para ver más opciones.'
            }
          </Typography>
          <Button variant="contained" onClick={handleBackToSearch}>
            Nueva búsqueda
          </Button>
        </Box>
      ) : (
        <>
          <Grid container spacing={3}>
            {currentProperties.map((property, index) => (
              <Grid item xs={12} md={6} lg={4} key={property.id || index}>
                <Card elevation={3} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  {property.images && property.images.length > 0 && (
                    <CardMedia
                      component="img"
                      height="200"
                      image={property.images[0]}
                      alt={property.title}
                      sx={{ objectFit: 'cover' }}
                    />
                  )}
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Typography variant="h6" gutterBottom noWrap>
                      {property.title}
                    </Typography>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <LocationIcon fontSize="small" color="action" sx={{ mr: 0.5 }} />
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {property.location?.address || property.location?.neighborhood || 'Ubicación no especificada'}
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <PriceIcon fontSize="small" color="primary" sx={{ mr: 0.5 }} />
                      <Typography variant="h6" color="primary">
                        ${property.price?.toLocaleString()}
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                      {property.rooms && (
                        <Chip
                          icon={<HomeIcon />}
                          label={`${property.rooms} hab`}
                          size="small"
                          variant="outlined"
                        />
                      )}
                      {property.bathrooms && (
                        <Chip
                          icon={<BathtubIcon />}
                          label={`${property.bathrooms} baños`}
                          size="small"
                          variant="outlined"
                        />
                      )}
                      {property.area && (
                        <Chip
                          icon={<AreaIcon />}
                          label={`${property.area} m²`}
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </Box>

                    <Chip
                      label={property.source || 'Sin fuente'}
                      size="small"
                      color="secondary"
                      variant="filled"
                    />
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Paginación */}
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <Button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
                sx={{ mr: 2 }}
              >
                Anterior
              </Button>
              <Typography sx={{ mx: 2, alignSelf: 'center' }}>
                Página {currentPage} de {totalPages}
              </Typography>
              <Button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
                sx={{ ml: 2 }}
              >
                Siguiente
              </Button>
            </Box>
          )}
        </>
      )}
    </Container>
  );
};

export default NewResultsPage;
