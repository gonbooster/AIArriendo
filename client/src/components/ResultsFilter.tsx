import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Collapse,
  Divider,
  Badge,
  IconButton,
  Tooltip,
} from '@mui/material';
import Grid from '@mui/material/Unstable_Grid2';
import { styled } from '@mui/material/styles';
import {
  FilterList as FilterIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Sort as SortIcon,
  TrendingUp as TrendingUpIcon,
  LocationOn as LocationIcon,
  AttachMoney as MoneyIcon,
  Home as HomeIcon,
} from '@mui/icons-material';

interface ResultsFilterProps {
  totalResults: number;
  sortBy: string;
  onSortChange: (sortBy: string) => void;
  sourceBreakdown?: { [key: string]: number };
  searchTime?: number;
}

const FilterCard = styled(Card)(({ theme }) => ({
  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
  color: 'white',
  marginBottom: theme.spacing(8),
  borderRadius: theme.spacing(2),
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
  overflow: 'visible',
}));

const StatsChip = styled(Chip)(({ theme }) => ({
  backgroundColor: 'rgba(255, 255, 255, 0.15)',
  color: 'white',
  fontWeight: 600,
  '& .MuiChip-icon': {
    color: 'white',
  },
  '&:hover': {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
}));

const SourceChip = styled(Chip)<{ source: string }>(({ theme, source }) => {
  const colors = {
    fincaraiz: '#4caf50',
    metrocuadrado: '#2196f3',
    trovit: '#ff9800',
    ciencuadras: '#9c27b0',
  };
  
  const color = colors[source as keyof typeof colors] || theme.palette.grey[500];
  
  return {
    backgroundColor: color,
    color: 'white',
    fontWeight: 600,
    '&:hover': {
      backgroundColor: color,
      filter: 'brightness(1.1)',
    },
  };
});

const SortSelect = styled(Select)(({ theme }) => ({
  backgroundColor: 'rgba(255, 255, 255, 0.1)',
  color: 'white',
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  '&:hover .MuiOutlinedInput-notchedOutline': {
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: 'white',
  },
  '& .MuiSelect-icon': {
    color: 'white',
  },
}));

const ResultsFilter: React.FC<ResultsFilterProps> = ({
  totalResults,
  sortBy,
  onSortChange,
  sourceBreakdown,
  searchTime,
}) => {
  const [showDetails, setShowDetails] = useState(false);

  const getSortIcon = (sortValue: string) => {
    switch (sortValue) {
      case 'score':
        return <TrendingUpIcon />;
      case 'price':
        return <MoneyIcon />;
      case 'rooms':
        return <HomeIcon />;
      case 'area':
        return <LocationIcon />;
      default:
        return <SortIcon />;
    }
  };

  const getSortLabel = (sortValue: string) => {
    switch (sortValue) {
      case 'score':
        return 'Mejor puntuación';
      case 'price':
        return 'Precio';
      case 'rooms':
        return 'Habitaciones';
      case 'area':
        return 'Área';
      default:
        return 'Relevancia';
    }
  };

  return (
    <FilterCard>
      <CardContent sx={{ pb: 2 }}>
        {/* Header con estadísticas principales */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <FilterIcon sx={{ fontSize: 28 }} />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                {totalResults} Propiedades Encontradas
              </Typography>
              {searchTime && (
                <Typography variant="body2" sx={{ opacity: 0.8 }}>
                  Búsqueda en {searchTime}ms
                </Typography>
              )}
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Tooltip title="Ver detalles">
              <IconButton
                onClick={() => setShowDetails(!showDetails)}
                sx={{ color: 'white' }}
              >
                {showDetails ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Controles principales */}
        <Grid container spacing={3} alignItems="center">
          {/* Ordenamiento */}
          <Grid xs={12} sm={6} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                Ordenar por
              </InputLabel>
              <SortSelect
                value={sortBy}
                onChange={(e) => onSortChange(e.target.value as string)}
                label="Ordenar por"
                startAdornment={getSortIcon(sortBy)}
              >
                <MenuItem value="score">Mejor puntuación</MenuItem>
                <MenuItem value="price">Precio (menor a mayor)</MenuItem>
                <MenuItem value="rooms">Habitaciones</MenuItem>
                <MenuItem value="area">Área</MenuItem>
              </SortSelect>
            </FormControl>
          </Grid>

          {/* Estadísticas rápidas */}
          <Grid xs={12} sm={6} md={8}>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <StatsChip
                icon={<TrendingUpIcon />}
                label={`${totalResults} resultados`}
                size="small"
              />
              {searchTime && (
                <StatsChip
                  icon={<SortIcon />}
                  label={`${searchTime}ms`}
                  size="small"
                />
              )}
            </Box>
          </Grid>
        </Grid>

        {/* Detalles colapsables */}
        <Collapse in={showDetails}>
          <Box sx={{ mt: 3 }}>
            <Divider sx={{ backgroundColor: 'rgba(255, 255, 255, 0.2)', mb: 2 }} />
            
            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
              Distribución por Portal
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {sourceBreakdown && Object.entries(sourceBreakdown).map(([source, count]) => (
                <SourceChip
                  key={source}
                  source={source}
                  label={`${source}: ${count}`}
                  size="small"
                />
              ))}
            </Box>
          </Box>
        </Collapse>
      </CardContent>
    </FilterCard>
  );
};

export default ResultsFilter;
