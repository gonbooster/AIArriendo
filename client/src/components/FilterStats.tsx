import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Chip,
  LinearProgress,
  Divider
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  Home as HomeIcon,
  AttachMoney as MoneyIcon,
  SquareFoot as AreaIcon
} from '@mui/icons-material';

interface FilterStatsProps {
  stats: {
    total: number;
    avgPrice: number;
    avgArea: number;
    avgPricePerM2: number;
    sourceBreakdown: Record<string, number>;
  } | null;
  totalProperties: number;
}

const FilterStats: React.FC<FilterStatsProps> = ({ stats, totalProperties }) => {
  if (!stats) return null;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  };

  const getSourceColor = (source: string) => {
    const colors: Record<string, string> = {
      'MercadoLibre': '#FFE600',
      'Fincaraiz': '#00A651',
      'Metrocuadrado': '#FF6B35',
      'Ciencuadras': '#4A90E2',
      'Trovit': '#FF4081',
      'Properati': '#9C27B0',
      'PADS': '#FF9800',
      'Rentola': '#795548'
    };
    return colors[source] || '#757575';
  };

  return (
    <Paper elevation={1} sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <TrendingUpIcon color="primary" />
        Estadísticas de Filtros
      </Typography>

      <Grid container spacing={2}>
        {/* Resumen General */}
        <Grid item xs={12} md={3}>
          <Box sx={{ textAlign: 'center' }}>
            <HomeIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
            <Typography variant="h4" color="primary.main" fontWeight="bold">
              {stats.total}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              de {totalProperties} propiedades
            </Typography>
            <LinearProgress 
              variant="determinate" 
              value={(stats.total / totalProperties) * 100} 
              sx={{ mt: 1, height: 6, borderRadius: 3 }}
            />
          </Box>
        </Grid>

        {/* Precio Promedio */}
        <Grid item xs={12} md={3}>
          <Box sx={{ textAlign: 'center' }}>
            <MoneyIcon sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
            <Typography variant="h6" color="success.main" fontWeight="bold">
              {formatPrice(stats.avgPrice)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Precio promedio
            </Typography>
          </Box>
        </Grid>

        {/* Área Promedio */}
        <Grid item xs={12} md={3}>
          <Box sx={{ textAlign: 'center' }}>
            <AreaIcon sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
            <Typography variant="h6" color="info.main" fontWeight="bold">
              {stats.avgArea} m²
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Área promedio
            </Typography>
          </Box>
        </Grid>

        {/* Precio por m² */}
        <Grid item xs={12} md={3}>
          <Box sx={{ textAlign: 'center' }}>
            <TrendingUpIcon sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
            <Typography variant="h6" color="warning.main" fontWeight="bold">
              {formatPrice(stats.avgPricePerM2)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Precio por m²
            </Typography>
          </Box>
        </Grid>
      </Grid>

      <Divider sx={{ my: 2 }} />

      {/* Distribución por Fuente */}
      <Typography variant="subtitle1" gutterBottom fontWeight="bold">
        Distribución por Fuente
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {Object.entries(stats.sourceBreakdown)
          .sort(([,a], [,b]) => b - a)
          .map(([source, count]) => {
            const percentage = ((count / stats.total) * 100).toFixed(1);
            return (
              <Chip
                key={source}
                label={`${source}: ${count} (${percentage}%)`}
                size="small"
                sx={{
                  bgcolor: getSourceColor(source),
                  color: 'white',
                  fontWeight: 'bold',
                  '& .MuiChip-label': {
                    fontSize: '0.75rem'
                  }
                }}
              />
            );
          })}
      </Box>

      {/* Indicadores de Calidad */}
      <Box sx={{ mt: 2 }}>
        <Typography variant="subtitle2" color="text.secondary">
          💡 Tip: Usa los filtros para refinar tu búsqueda y encontrar la propiedad perfecta
        </Typography>
      </Box>
    </Paper>
  );
};

export default FilterStats;
