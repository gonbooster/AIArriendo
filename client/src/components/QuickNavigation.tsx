import React from 'react';
import {
  Box,
  Button,
  ButtonGroup,
  Typography,
  Chip,
  Paper
} from '@mui/material';
import {
  FirstPage as FirstPageIcon,
  LastPage as LastPageIcon,
  NavigateBefore as NavigateBeforeIcon,
  NavigateNext as NavigateNextIcon,
  SkipPrevious as SkipPreviousIcon,
  SkipNext as SkipNextIcon
} from '@mui/icons-material';

interface QuickNavigationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
}

const QuickNavigation: React.FC<QuickNavigationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  disabled = false
}) => {
  if (totalPages <= 1) return null;

  const handleFirst = () => onPageChange(1);
  const handlePrevious = () => onPageChange(Math.max(1, currentPage - 1));
  const handleNext = () => onPageChange(Math.min(totalPages, currentPage + 1));
  const handleLast = () => onPageChange(totalPages);
  const handlePrevious5 = () => onPageChange(Math.max(1, currentPage - 5));
  const handleNext5 = () => onPageChange(Math.min(totalPages, currentPage + 5));

  return (
    <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        {/* Page Info */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Página
          </Typography>
          <Chip 
            label={`${currentPage} de ${totalPages}`}
            size="small"
            color="primary"
            variant="outlined"
          />
        </Box>

        {/* Navigation Controls */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* First and Previous 5 */}
          <ButtonGroup size="small" disabled={disabled}>
            <Button
              onClick={handleFirst}
              disabled={currentPage === 1}
              startIcon={<FirstPageIcon />}
              variant="outlined"
            >
              Primera
            </Button>
            <Button
              onClick={handlePrevious5}
              disabled={currentPage <= 5}
              startIcon={<SkipPreviousIcon />}
              variant="outlined"
            >
              -5
            </Button>
          </ButtonGroup>

          {/* Previous and Next */}
          <ButtonGroup size="medium" disabled={disabled}>
            <Button
              onClick={handlePrevious}
              disabled={currentPage === 1}
              startIcon={<NavigateBeforeIcon />}
              variant="contained"
            >
              Anterior
            </Button>
            <Button
              onClick={handleNext}
              disabled={currentPage === totalPages}
              endIcon={<NavigateNextIcon />}
              variant="contained"
            >
              Siguiente
            </Button>
          </ButtonGroup>

          {/* Next 5 and Last */}
          <ButtonGroup size="small" disabled={disabled}>
            <Button
              onClick={handleNext5}
              disabled={currentPage > totalPages - 5}
              endIcon={<SkipNextIcon />}
              variant="outlined"
            >
              +5
            </Button>
            <Button
              onClick={handleLast}
              disabled={currentPage === totalPages}
              endIcon={<LastPageIcon />}
              variant="outlined"
            >
              Última
            </Button>
          </ButtonGroup>
        </Box>

        {/* Quick Jump */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Salto rápido:
          </Typography>
          {[1, Math.ceil(totalPages / 4), Math.ceil(totalPages / 2), Math.ceil(3 * totalPages / 4), totalPages]
            .filter((page, index, arr) => arr.indexOf(page) === index && page !== currentPage)
            .slice(0, 4)
            .map((page) => (
              <Button
                key={page}
                size="small"
                variant="text"
                onClick={() => onPageChange(page)}
                disabled={disabled}
                sx={{ minWidth: 'auto', px: 1 }}
              >
                {page}
              </Button>
            ))}
        </Box>
      </Box>
    </Paper>
  );
};

export default QuickNavigation;
