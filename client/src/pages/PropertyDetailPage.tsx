import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  IconButton,
  Button,
  ImageList,
  ImageListItem,
  Divider,
  Alert,
  Skeleton,
} from '@mui/material';
import {
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
  LocationOn as LocationIcon,
  Home as HomeIcon,
  Bathtub as BathtubIcon,
  SquareFoot as SquareFootIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Person as PersonIcon,
  OpenInNew as OpenInNewIcon,
  ArrowBack as ArrowBackIcon,
  Star as StarIcon,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { useSearch } from '../contexts/SearchContext';
import { searchAPI } from '../services/api';
import { Property } from '../types';

const PropertyDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addFavorite, removeFavorite, isFavorite } = useSearch();
  
  const [property, setProperty] = useState<Property | null>(null);
  const [similarProperties, setSimilarProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProperty = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        const [propertyData, similarData] = await Promise.all([
          searchAPI.getProperty(id),
          searchAPI.getSimilarProperties(id, 4)
        ]);
        
        setProperty(propertyData);
        setSimilarProperties(similarData);
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Failed to load property');
      } finally {
        setLoading(false);
      }
    };

    fetchProperty();
  }, [id]);

  const handleFavoriteToggle = () => {
    if (!property) return;
    
    if (isFavorite(property.id)) {
      removeFavorite(property.id);
    } else {
      addFavorite(property.id);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const getScoreColor = (score?: number) => {
    if (!score) return 'default';
    if (score >= 4) return 'success';
    if (score >= 2) return 'warning';
    return 'error';
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Skeleton variant="rectangular" height={400} sx={{ mb: 3 }} />
        <Grid container spacing={3}>
          <Grid xs={12} md={8}>
            <Skeleton variant="text" height={40} />
            <Skeleton variant="text" height={24} />
            <Skeleton variant="text" height={24} />
            <Skeleton variant="rectangular" height={200} />
          </Grid>
          <Grid xs={12} md={4}>
            <Skeleton variant="rectangular" height={300} />
          </Grid>
        </Grid>
      </Container>
    );
  }

  if (error || !property) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">
          {error || 'Property not found'}
        </Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(-1)}
          sx={{ mt: 2 }}
        >
          Volver
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Back Button */}
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate(-1)}
        sx={{ mb: 3 }}
      >
        Volver a resultados
      </Button>

      {/* Property Images */}
      {property.images.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <ImageList
            sx={{ height: 400 }}
            cols={property.images.length === 1 ? 1 : 3}
            rowHeight={property.images.length === 1 ? 400 : 200}
          >
            {property.images.map((image, index) => (
              <ImageListItem key={index}>
                <img
                  src={image}
                  alt={`${property.title} - ${index + 1}`}
                  loading="lazy"
                  style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                />
              </ImageListItem>
            ))}
          </ImageList>
        </Card>
      )}

      <Grid container spacing={3}>
        {/* Main Content */}
        <Grid xs={12} md={8}>
          <Card>
            <CardContent>
              {/* Header */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Typography variant="h4" component="h1" sx={{ flexGrow: 1 }}>
                  {property.title}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {property.score && (
                    <Chip
                      icon={<StarIcon />}
                      label={`${property.score.toFixed(1)} puntos`}
                      color={getScoreColor(property.score)}
                    />
                  )}
                  <IconButton
                    onClick={handleFavoriteToggle}
                    color={isFavorite(property.id) ? 'error' : 'default'}
                    size="large"
                  >
                    {isFavorite(property.id) ? <FavoriteIcon /> : <FavoriteBorderIcon />}
                  </IconButton>
                </Box>
              </Box>

              {/* Location */}
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <LocationIcon sx={{ mr: 1, color: 'text.secondary' }} />
                <Typography variant="h6" color="text.secondary">
                  {property.location.address}
                </Typography>
              </Box>

              {/* Property Details */}
              <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid xs={6} sm={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <HomeIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                    <Typography variant="h6">{property.rooms}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Habitaciones
                    </Typography>
                  </Box>
                </Grid>
                {property.bathrooms && (
                  <Grid xs={6} sm={3}>
                    <Box sx={{ textAlign: 'center' }}>
                      <BathtubIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                      <Typography variant="h6">{property.bathrooms}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Baños
                      </Typography>
                    </Box>
                  </Grid>
                )}
                <Grid xs={6} sm={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <SquareFootIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                    <Typography variant="h6">{property.area}m²</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Área
                    </Typography>
                  </Box>
                </Grid>
                <Grid xs={6} sm={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" color="primary.main" sx={{ mb: 1 }}>
                      {formatPrice(property.pricePerM2)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Precio/m²
                    </Typography>
                  </Box>
                </Grid>
              </Grid>

              <Divider sx={{ my: 3 }} />

              {/* Description */}
              {property.description && (
                <>
                  <Typography variant="h6" gutterBottom>
                    Descripción
                  </Typography>
                  <Typography variant="body1" paragraph>
                    {property.description}
                  </Typography>
                  <Divider sx={{ my: 3 }} />
                </>
              )}

              {/* Amenities */}
              {property.amenities.length > 0 && (
                <>
                  <Typography variant="h6" gutterBottom>
                    Amenidades
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 3 }}>
                    {property.amenities.map((amenity) => (
                      <Chip
                        key={amenity}
                        label={amenity}
                        variant="outlined"
                        color={property.preferenceMatches?.includes(amenity) ? 'primary' : 'default'}
                      />
                    ))}
                  </Box>
                  <Divider sx={{ my: 3 }} />
                </>
              )}

              {/* Preference Matches */}
              {property.preferenceMatches && property.preferenceMatches.length > 0 && (
                <>
                  <Typography variant="h6" gutterBottom>
                    Preferencias Encontradas
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 3 }}>
                    {property.preferenceMatches.map((match) => (
                      <Chip
                        key={match}
                        label={match}
                        color="success"
                        icon={<StarIcon />}
                      />
                    ))}
                  </Box>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Sidebar */}
        <Grid xs={12} md={4}>
          {/* Price Card */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Precio
              </Typography>
              <Typography variant="h4" color="primary" sx={{ fontWeight: 'bold', mb: 1 }}>
                {formatPrice(property.price)}
              </Typography>
              {property.adminFee > 0 && (
                <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
                  + {formatPrice(property.adminFee)} administración
                </Typography>
              )}
              <Typography variant="h6" color="text.secondary">
                Total: {formatPrice(property.totalPrice)}
              </Typography>
            </CardContent>
          </Card>

          {/* Contact Card */}
          {property.contactInfo && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Contacto
                </Typography>
                {property.contactInfo.agent && (
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <PersonIcon sx={{ mr: 1, color: 'text.secondary' }} />
                    <Typography>{property.contactInfo.agent}</Typography>
                  </Box>
                )}
                {property.contactInfo.phone && (
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <PhoneIcon sx={{ mr: 1, color: 'text.secondary' }} />
                    <Typography>{property.contactInfo.phone}</Typography>
                  </Box>
                )}
                {property.contactInfo.email && (
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <EmailIcon sx={{ mr: 1, color: 'text.secondary' }} />
                    <Typography>{property.contactInfo.email}</Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          )}

          {/* Source Card */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Fuente
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Chip label={property.source} variant="outlined" />
                <Button
                  variant="outlined"
                  startIcon={<OpenInNewIcon />}
                  onClick={() => window.open(property.url, '_blank')}
                >
                  Ver original
                </Button>
              </Box>
              {property.publishedDate && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Publicado: {new Date(property.publishedDate).toLocaleDateString()}
                </Typography>
              )}
              <Typography variant="body2" color="text.secondary">
                Actualizado: {new Date(property.scrapedDate).toLocaleDateString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Similar Properties */}
      {similarProperties.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h5" gutterBottom>
            Propiedades Similares
          </Typography>
          <Grid container spacing={2}>
            {similarProperties.map((similar) => (
              <Grid xs={12} sm={6} md={3} key={similar.id}>
                <Card 
                  sx={{ 
                    cursor: 'pointer',
                    '&:hover': { transform: 'translateY(-2px)', boxShadow: 3 }
                  }}
                  onClick={() => navigate(`/property/${similar.id}`)}
                >
                  <CardContent>
                    <Typography variant="subtitle1" noWrap>
                      {similar.title}
                    </Typography>
                    <Typography variant="h6" color="primary">
                      {formatPrice(similar.price)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {similar.rooms} hab • {similar.area}m²
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </Container>
  );
};

export default PropertyDetailPage;
