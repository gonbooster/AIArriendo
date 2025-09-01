import React from 'react';
import { Box, LinearProgress, Typography, useTheme } from '@mui/material';

interface ProgressBarProps {
  progress: number;
  currentPhase: string;
  // timeElapsed: number; // SIN TIEMPO
  // estimatedTimeRemaining: number; // SIN TIEMPO
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  currentPhase
  // timeElapsed, // SIN TIEMPO
  // estimatedTimeRemaining // SIN TIEMPO
}) => {
  const theme = useTheme();

  // const formatTime = (seconds: number) => { // SIN TIEMPO
  //   if (seconds < 60) return `${seconds}s`;
  //   const minutes = Math.floor(seconds / 60);
  //   const remainingSeconds = seconds % 60;
  //   return `${minutes}m ${remainingSeconds}s`;
  // };

  return (
    <Box sx={{ width: '100%', mb: 3 }}>
      {/* Barra de progreso principal */}
      <Box sx={{ position: 'relative', mb: 2 }}>
        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{
            height: 12,
            borderRadius: 6,
            backgroundColor: theme.palette.grey[200],
            '& .MuiLinearProgress-bar': {
              borderRadius: 6,
              background: `linear-gradient(90deg, 
                ${theme.palette.primary.main} 0%, 
                ${theme.palette.secondary.main} 100%)`
            }
          }}
        />
        <Typography
          variant="caption"
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: 'white',
            fontWeight: 'bold',
            textShadow: '1px 1px 2px rgba(0,0,0,0.5)'
          }}
        >
          {Math.round(progress)}%
        </Typography>
      </Box>

      {/* Fase actual */}
      <Typography
        variant="h6"
        sx={{
          textAlign: 'center',
          mb: 1,
          color: theme.palette.primary.main,
          fontWeight: 'medium'
        }}
      >
        {currentPhase}
      </Typography>

      {/* SIN INFORMACIÓN DE TIEMPO */}
    </Box>
  );
};
