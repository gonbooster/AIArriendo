import React from 'react';
import {
  Card,
  CardContent,
  CardMedia,
  Typography,
  Box,
  Chip,
  IconButton,
  Button,
  Tooltip,
  useTheme,
  useMediaQuery,
  Stack,
  Divider,
} from '@mui/material';
import NewPropertyBadge from './NewPropertyBadge';
import {
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
  LocationOn as LocationIcon,
  Home as HomeIcon,
  Straighten as AreaIcon,
  AttachMoney as PriceIcon,
  Star as StarIcon,
  Visibility as ViewIcon,
  Share as ShareIcon,
  Bathtub as BathtubIcon,
  DirectionsCar as ParkingIcon,
  Apartment as StratumIcon
} from '@mui/icons-material';
import { Property } from '../types';

interface PropertyCardProps {
  property: Property;
}

// Local interface for backward compatibility
interface LegacyProperty {
  id: string;
  title: string;
  price: number;
  area: number;
  rooms: number;
  bathrooms?: number;
  location: {
    address: string;
    neighborhood?: string;
    city: string;
  };
  images: string[];
  amenities: string[];
  score: number;
  source: string;
  url: string;
  description?: string;
  pricePerM2?: number;
}

interface PropertyCardProps {
  property: Property;
  onFavoriteToggle?: (propertyId: string) => void;
  isFavorite?: boolean;
  onView?: (property: Property) => void;
  compact?: boolean;
}

const PropertyCard: React.FC<PropertyCardProps> = ({
  property,
  onFavoriteToggle,
  isFavorite = false,
  onView,
  compact = false,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const formatArea = (area: number) => {
    return `${area} m²`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'success';
    if (score >= 6) return 'warning';
    return 'error';
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onFavoriteToggle) {
      onFavoriteToggle(property.id);
    }
  };

  const handleViewClick = () => {
    if (onView) {
      onView(property);
    }
  };

  const handleShareClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (navigator.share) {
      navigator.share({
        title: property.title,
        text: `Check out this property: ${property.title}`,
        url: property.url,
      });
    } else {
      // Fallback to clipboard
      navigator.clipboard.writeText(property.url);
    }
  };

  const cardHeight = compact ? (isMobile ? 280 : 320) : (isMobile ? 380 : 420);
  const imageHeight = compact ? 140 : 200;

  return (
    <Card
      sx={{
        height: cardHeight,
        display: 'flex',
        flexDirection: 'column',
        cursor: 'pointer',
        transition: 'all 0.3s ease-in-out',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: theme.shadows[8],
        },
        position: 'relative',
        overflow: 'hidden',
      }}
      onClick={handleViewClick}
    >
      {/* Imagen de la propiedad */}
      <CardMedia
        component="img"
        height={imageHeight}
        image={property.images[0] || '/placeholder-property.jpg'}
        alt={property.title}
        sx={{
          objectFit: 'cover',
          transition: 'transform 0.3s ease-in-out',
          '&:hover': {
            transform: 'scale(1.05)',
          },
        }}
      />

      {/* Badges y botones superpuestos */}
      <Box sx={{ position: 'relative', mt: -6, mx: 1, zIndex: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          {/* Badges izquierda */}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {/* 🆕 Badge de propiedad nueva */}
            <NewPropertyBadge isNew={property.isNew} />

            <Chip
              icon={<StarIcon />}
              label={property.score?.toFixed(1) || '0.0'}
              color={getScoreColor(property.score || 0)}
              size="small"
              sx={{
                fontWeight: 'bold',
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                color: 'white',
                '& .MuiChip-icon': {
                  color: 'white'
                }
              }}
            />
            <Chip
              label={property.source}
              size="small"
              sx={{
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                color: 'white',
                fontSize: '0.75rem',
              }}
            />
          </Box>

          {/* Action Buttons derecha */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title={isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}>
              <IconButton
                size="small"
                onClick={handleFavoriteClick}
                sx={{
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  '&:hover': { backgroundColor: 'rgba(255, 255, 255, 1)' },
                }}
              >
                {isFavorite ? (
                  <FavoriteIcon color="error" />
                ) : (
                  <FavoriteBorderIcon />
                )}
              </IconButton>
            </Tooltip>

            <Tooltip title="Compartir">
              <IconButton
                size="small"
                onClick={handleShareClick}
                sx={{
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  '&:hover': { backgroundColor: 'rgba(255, 255, 255, 1)' },
                }}
              >
                <ShareIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Box>

      {/* Content Section */}
      <CardContent
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          p: compact ? 1.5 : 2,
          '&:last-child': { pb: compact ? 1.5 : 2 },
          justifyContent: 'space-between' // ✅ Distribuir contenido uniformemente
        }}
      >
        {/* Main Content Container */}
        <Box sx={{ flex: 1 }}>
          {/* Price */}
          <Typography
          variant={compact ? 'h6' : 'h5'}
          component="div"
          sx={{
            fontWeight: 'bold',
            color: 'primary.main',
            mb: 0.5,
            fontSize: isMobile ? '1.1rem' : undefined,
          }}
        >
          {formatPrice(property.price)}
        </Typography>

        {/* Price per m² */}
        {property.pricePerM2 && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mb: 1 }}
          >
            {formatPrice(property.pricePerM2)}/m²
          </Typography>
        )}

        {/* Title */}
        <Typography
          variant={compact ? 'body2' : 'body1'}
          component="div"
          sx={{
            fontWeight: 500,
            mb: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: compact ? 2 : 2, // ✅ Fijar a 2 líneas para consistencia
            WebkitBoxOrient: 'vertical',
            lineHeight: 1.3,
            minHeight: compact ? '2.6em' : '2.6em', // ✅ Altura mínima fija
          }}
        >
          {property.title}
        </Typography>

        {/* Location */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <LocationIcon sx={{ fontSize: 16, color: 'text.secondary', mr: 0.5 }} />
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {property.location.neighborhood || property.location.address}
          </Typography>
        </Box>

        {/* Property Details */}
        <Stack
          direction="row"
          spacing={2}
          sx={{
            mb: 1.5,
            flexWrap: 'wrap',
            gap: 1,
            alignItems: 'center',
            minHeight: '24px' // ✅ Altura mínima para consistencia
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <HomeIcon sx={{ fontSize: 16, color: 'text.secondary', mr: 0.5 }} />
            <Typography variant="caption" color="text.secondary">
              {property.rooms} hab
            </Typography>
          </Box>

          {property.bathrooms && property.bathrooms > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <BathtubIcon sx={{ fontSize: 16, color: 'text.secondary', mr: 0.5 }} />
              <Typography variant="caption" color="text.secondary">
                {property.bathrooms} baños
              </Typography>
            </Box>
          )}

          {property.parking && property.parking > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <ParkingIcon sx={{ fontSize: 16, color: 'text.secondary', mr: 0.5 }} />
              <Typography variant="caption" color="text.secondary">
                {property.parking} parq
              </Typography>
            </Box>
          )}

          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <AreaIcon sx={{ fontSize: 16, color: 'text.secondary', mr: 0.5 }} />
            <Typography variant="caption" color="text.secondary">
              {formatArea(property.area)}
            </Typography>
          </Box>

          {property.stratum && property.stratum > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <StratumIcon sx={{ fontSize: 16, color: 'text.secondary', mr: 0.5 }} />
              <Typography variant="caption" color="text.secondary">
                Estrato {property.stratum}
              </Typography>
            </Box>
          )}
        </Stack>

        {/* Amenities */}
        <Box sx={{ mb: 1.5, minHeight: compact ? '0px' : '32px' }}>
          {!compact && property.amenities.length > 0 && (
            <Tooltip
              title={
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                    Amenidades ({property.amenities.length})
                  </Typography>
                  {property.amenities.map((amenity, index) => (
                    <Typography key={index} variant="body2" sx={{ mb: 0.5 }}>
                      • {amenity}
                    </Typography>
                  ))}
                </Box>
              }
              arrow
              placement="top"
            >
              <Chip
                label={`${property.amenities.length} amenidades`}
                size="small"
                variant="outlined"
                sx={{
                  fontSize: '0.7rem',
                  height: 20,
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.04)',
                  }
                }}
              />
            </Tooltip>
          )}
        </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default PropertyCard;
