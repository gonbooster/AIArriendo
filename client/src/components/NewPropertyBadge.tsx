import React from 'react';
import { Chip, Tooltip } from '@mui/material';
import { NewReleases, Cached } from '@mui/icons-material';

interface NewPropertyBadgeProps {
  isNew?: boolean;
  cacheAge?: number;
  size?: 'small' | 'medium';
}

const NewPropertyBadge: React.FC<NewPropertyBadgeProps> = ({ 
  isNew = false, 
  cacheAge = 0,
  size = 'small' 
}) => {
  if (!isNew) return null;

  const getTooltipText = () => {
    if (cacheAge > 0) {
      return `Nueva desde la última búsqueda (hace ${cacheAge}s)`;
    }
    return 'Propiedad nueva encontrada';
  };

  return (
    <Tooltip title={getTooltipText()} arrow>
      <Chip
        icon={<NewReleases sx={{ fontSize: size === 'small' ? 14 : 16 }} />}
        label="NUEVO"
        color="success"
        variant="filled"
        size={size}
        sx={{
          fontWeight: 'bold',
          fontSize: size === 'small' ? '0.7rem' : '0.75rem',
          height: size === 'small' ? 20 : 24,
          animation: 'pulse 2s infinite',
          '@keyframes pulse': {
            '0%': {
              boxShadow: '0 0 0 0 rgba(76, 175, 80, 0.7)',
            },
            '70%': {
              boxShadow: '0 0 0 10px rgba(76, 175, 80, 0)',
            },
            '100%': {
              boxShadow: '0 0 0 0 rgba(76, 175, 80, 0)',
            },
          },
        }}
      />
    </Tooltip>
  );
};

export default NewPropertyBadge;
