import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  Home as HomeIcon,
  AttachMoney as MoneyIcon,
  SquareFoot as AreaIcon
} from '@mui/icons-material';

interface PropertyStatsProps {
  stats: {
    total: number;
    avgPrice: number;
    avgArea: number;
    avgPricePerM2: number;
  } | null;
  totalProperties: number;
}

const PropertyStats: React.FC<PropertyStatsProps> = ({ stats, totalProperties }) => {
  if (!stats) return null;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  };

  const statsData = [
    {
      icon: HomeIcon,
      value: stats.total,
      label: `de ${totalProperties} propiedades`,
      color: 'primary.main',
      format: (val: number) => val.toString()
    },
    {
      icon: MoneyIcon,
      value: stats.avgPrice,
      label: 'Precio promedio',
      color: 'success.main',
      format: formatPrice
    },
    {
      icon: AreaIcon,
      value: stats.avgArea,
      label: 'Área promedio',
      color: 'info.main',
      format: (val: number) => `${val} m²`
    },
    {
      icon: TrendingUpIcon,
      value: stats.avgPricePerM2,
      label: 'Precio por m²',
      color: 'warning.main',
      format: formatPrice
    }
  ];

  return (
    <Paper 
      elevation={2} 
      sx={{ 
        p: 2, 
        mb: 3, 
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        borderRadius: 2
      }}
    >
      <Typography 
        variant="h6" 
        gutterBottom 
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1,
          color: 'primary.main',
          fontWeight: 'bold',
          mb: 2
        }}
      >
        <TrendingUpIcon />
        Estadísticas de Propiedades
      </Typography>

      <Grid container spacing={2}>
        {statsData.map((stat, index) => {
          const IconComponent = stat.icon;
          return (
            <Grid item xs={6} md={3} key={index}>
              <Card 
                elevation={3}
                sx={{ 
                  height: '100%',
                  background: 'white',
                  borderRadius: 2,
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: 4
                  }
                }}
              >
                <CardContent sx={{ textAlign: 'center', p: 2 }}>
                  <IconComponent 
                    sx={{ 
                      fontSize: 32, 
                      color: stat.color, 
                      mb: 1 
                    }} 
                  />
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      color: stat.color, 
                      fontWeight: 'bold',
                      fontSize: '1.1rem',
                      mb: 0.5
                    }}
                  >
                    {stat.format(stat.value)}
                  </Typography>
                  <Typography 
                    variant="caption" 
                    color="text.secondary"
                    sx={{ 
                      fontSize: '0.75rem',
                      lineHeight: 1.2
                    }}
                  >
                    {stat.label}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Paper>
  );
};

export default PropertyStats;
