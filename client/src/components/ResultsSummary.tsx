import React from 'react';
import {
  Box,
  Typography,
  Chip,
  Paper,
  Grid,
  LinearProgress,
  Button
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Visibility as VisibilityIcon,
  CloudDownload as LoadMoreIcon
} from '@mui/icons-material';

interface ResultsSummaryProps {
  // Current view
  currentProperties: number;
  filteredProperties: number;
  totalProperties: number;
  
  // Pagination
  currentPage: number;
  totalPages: number;
  
  // Backend
  backendPage: number;
  backendTotal: number;
  hasMorePages: boolean;
  
  // Actions
  onLoadMore?: () => void;
  loading?: boolean;
}

const ResultsSummary: React.FC<ResultsSummaryProps> = ({
  currentProperties,
  filteredProperties,
  totalProperties,
  currentPage,
  totalPages,
  backendPage,
  backendTotal,
  hasMorePages,
  onLoadMore,
  loading = false
}) => {
  const filtersActive = filteredProperties !== totalProperties;
  const viewProgress = (currentPage / totalPages) * 100;
  
  return (
    <Paper elevation={2} sx={{ p: 3, mb: 3, bgcolor: 'primary.50' }}>
      <Grid container spacing={3} alignItems="center">
        {/* Main Summary */}
        <Grid item xs={12} md={6}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <VisibilityIcon color="primary" />
            <Typography variant="h6" fontWeight="bold">
              Mostrando {currentProperties} propiedades
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip 
              icon={<SearchIcon />}
              label={`${totalProperties} encontradas`}
              color="primary"
              variant="outlined"
            />
            
            {filtersActive && (
              <Chip 
                icon={<FilterIcon />}
                label={`${filteredProperties} filtradas`}
                color="warning"
                variant="outlined"
              />
            )}
            
            {totalPages > 1 && (
              <Chip 
                label={`Página ${currentPage}/${totalPages}`}
                color="info"
                variant="outlined"
              />
            )}
          </Box>
        </Grid>

        {/* Progress and Actions */}
        <Grid item xs={12} md={6}>
          {/* View Progress */}
          {totalPages > 1 && (
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Progreso de visualización
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {Math.round(viewProgress)}%
                </Typography>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={viewProgress} 
                sx={{ height: 8, borderRadius: 4 }}
              />
            </Box>
          )}

          {/* Load More Button */}
          {hasMorePages && onLoadMore && (
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <Button
                variant="contained"
                startIcon={loading ? undefined : <LoadMoreIcon />}
                onClick={onLoadMore}
                disabled={loading}
                size="large"
                sx={{ minWidth: 200 }}
              >
                {loading ? 'Cargando...' : `Cargar más (${backendTotal - totalProperties} disponibles)`}
              </Button>
            </Box>
          )}
        </Grid>
      </Grid>


    </Paper>
  );
};

export default ResultsSummary;
