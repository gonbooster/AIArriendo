import React from 'react';
import {
  Paper,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Divider,
  useTheme
} from '@mui/material';
import {
  Home as HomeIcon,
  AttachMoney as MoneyIcon,
  Straighten as AreaIcon,
  TrendingUp as TrendIcon,
  Public as SourceIcon,
  LocationOn as LocationIcon
} from '@mui/icons-material';
import { Property } from '../../types';

interface PropertyStatsMUIProps {
  properties: Property[];
}

const PropertyStatsMUI: React.FC<PropertyStatsMUIProps> = ({ properties }) => {
  const theme = useTheme();

  // Calcular estadísticas
  const stats = React.useMemo(() => {
    if (properties.length === 0) {
      return {
        total: 0,
        avgPrice: 0,
        avgArea: 0,
        avgPricePerM2: 0,
        sources: 0,
        neighborhoods: 0,
        priceRange: { min: 0, max: 0 },
        areaRange: { min: 0, max: 0 }
      };
    }

    const validPrices = properties.filter(p => p.totalPrice > 0);
    const validAreas = properties.filter(p => p.area > 0);
    const validPricePerM2 = properties.filter(p => p.area > 0 && p.totalPrice > 0);

    const avgPrice = validPrices.length > 0 
      ? validPrices.reduce((sum, p) => sum + p.totalPrice, 0) / validPrices.length 
      : 0;

    const avgArea = validAreas.length > 0 
      ? validAreas.reduce((sum, p) => sum + p.area, 0) / validAreas.length 
      : 0;

    const avgPricePerM2 = validPricePerM2.length > 0 
      ? validPricePerM2.reduce((sum, p) => sum + (p.totalPrice / p.area), 0) / validPricePerM2.length 
      : 0;

    const sources = new Set(properties.map(p => p.source)).size;
    const neighborhoods = new Set(properties.map(p => p.location.neighborhood).filter(Boolean)).size;

    const prices = validPrices.map(p => p.totalPrice);
    const areas = validAreas.map(p => p.area);

    return {
      total: properties.length,
      avgPrice,
      avgArea,
      avgPricePerM2,
      sources,
      neighborhoods,
      priceRange: {
        min: prices.length > 0 ? Math.min(...prices) : 0,
        max: prices.length > 0 ? Math.max(...prices) : 0
      },
      areaRange: {
        min: areas.length > 0 ? Math.min(...areas) : 0,
        max: areas.length > 0 ? Math.max(...areas) : 0
      }
    };
  }, [properties]);

  const formatPrice = (price: number): string => {
    if (price >= 1000000) {
      return `$${(price / 1000000).toFixed(1)}M`;
    }
    if (price >= 1000) {
      return `$${(price / 1000).toFixed(0)}K`;
    }
    return `$${price.toFixed(0)}`;
  };

  const formatNumber = (num: number): string => {
    return num.toLocaleString();
  };

  const statCards = [
    {
      label: 'Total Propiedades',
      value: formatNumber(stats.total),
      icon: <HomeIcon />,
      color: theme.palette.primary.main,
    },
    {
      label: 'Precio Promedio',
      value: formatPrice(stats.avgPrice),
      icon: <MoneyIcon />,
      color: theme.palette.success.main,
    },
    {
      label: 'Área Promedio',
      value: `${stats.avgArea.toFixed(0)}m²`,
      icon: <AreaIcon />,
      color: theme.palette.secondary.main,
    },
    {
      label: 'Precio/m²',
      value: formatPrice(stats.avgPricePerM2),
      icon: <TrendIcon />,
      color: theme.palette.warning.main,
    },
    {
      label: 'Fuentes',
      value: stats.sources.toString(),
      icon: <SourceIcon />,
      color: theme.palette.info.main,
    },
    {
      label: 'Barrios',
      value: stats.neighborhoods.toString(),
      icon: <LocationIcon />,
      color: theme.palette.error.main,
    }
  ];

  return (
    <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <TrendIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
        Estadísticas del Mercado
      </Typography>

      {/* Stats Grid */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {statCards.map((stat, index) => (
          <Grid item xs={6} sm={4} md={2} key={index}>
            <Card 
              elevation={1} 
              sx={{ 
                height: '100%',
                transition: 'all 0.2s ease',
                '&:hover': {
                  elevation: 3,
                  transform: 'translateY(-2px)'
                }
              }}
            >
              <CardContent sx={{ textAlign: 'center', p: 2 }}>
                <Box sx={{ color: stat.color, mb: 1 }}>
                  {stat.icon}
                </Box>
                <Typography variant="h6" component="div" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                  {stat.value}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {stat.label}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Rangos */}
      {stats.total > 0 && (
        <>
          <Divider sx={{ my: 2 }} />
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Rango de Precios:
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                  {formatPrice(stats.priceRange.min)} - {formatPrice(stats.priceRange.max)}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Rango de Áreas:
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                  {stats.areaRange.min.toFixed(0)}m² - {stats.areaRange.max.toFixed(0)}m²
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </>
      )}


    </Paper>
  );
};

export default PropertyStatsMUI;
