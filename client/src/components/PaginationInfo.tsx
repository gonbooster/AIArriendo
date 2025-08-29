import React from 'react';
import {
  Box,
  Typography,
  Chip,
  Paper,
  LinearProgress
} from '@mui/material';
import {
  ViewList as ViewListIcon,
  FilterList as FilterListIcon,
  Search as SearchIcon
} from '@mui/icons-material';

interface PaginationInfoProps {
  // Local pagination (filtered results)
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  filteredCount: number;
  totalProperties: number;
  
  // Backend pagination
  backendPage: number;
  backendTotal: number;
  backendLimit: number;
}

const PaginationInfo: React.FC<PaginationInfoProps> = ({
  currentPage,
  totalPages,
  itemsPerPage,
  filteredCount,
  totalProperties,
  backendPage,
  backendTotal,
  backendLimit
}) => {
  const startIndex = (currentPage - 1) * itemsPerPage + 1;
  const endIndex = Math.min(currentPage * itemsPerPage, filteredCount);
  const backendTotalPages = Math.ceil(backendTotal / backendLimit);
  
  return (
    <Paper elevation={1} sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        {/* Current View Info */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ViewListIcon color="primary" />
          <Typography variant="body2" fontWeight="bold">
            Mostrando {startIndex}-{endIndex} de {filteredCount}
          </Typography>
        </Box>

        {/* Filter Status */}
        {filteredCount !== totalProperties && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FilterListIcon color="warning" />
            <Chip 
              label={`${filteredCount} de ${totalProperties} filtradas`}
              size="small"
              color="warning"
              variant="outlined"
            />
          </Box>
        )}

        {/* Backend Status */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SearchIcon color="info" />
          <Typography variant="caption" color="text.secondary">
            Backend: página {backendPage} de {backendTotalPages} ({backendTotal} total)
          </Typography>
        </Box>
      </Box>

      {/* Progress Bar */}
      <Box sx={{ mt: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Progreso de visualización
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {Math.round((endIndex / filteredCount) * 100)}%
          </Typography>
        </Box>
        <LinearProgress 
          variant="determinate" 
          value={(endIndex / filteredCount) * 100} 
          sx={{ height: 6, borderRadius: 3 }}
        />
      </Box>

      {/* Tips */}
      <Box sx={{ mt: 2 }}>
        <Typography variant="caption" color="text.secondary">
          💡 Usa los filtros para refinar resultados • 
          Cambia de página del backend para más propiedades • 
          {totalPages > 1 && ` ${totalPages} páginas de filtros disponibles`}
        </Typography>
      </Box>
    </Paper>
  );
};

export default PaginationInfo;
