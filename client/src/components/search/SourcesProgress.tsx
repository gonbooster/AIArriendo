import React from 'react';
import { Box, Typography, Chip, Grid, useTheme } from '@mui/material';
import { CheckCircle, RadioButtonUnchecked, Sync } from '@mui/icons-material';

interface SourcesProgressProps {
  sources: string[];
  currentSource: string;
  sourcesCompleted: number;
  totalSources: number;
}

export const SourcesProgress: React.FC<SourcesProgressProps> = ({
  sources,
  currentSource,
  sourcesCompleted,
  totalSources
}) => {
  const theme = useTheme();

  const getSourceStatus = (source: string, index: number) => {
    if (index < sourcesCompleted) return 'completed';
    if (source === currentSource) return 'active';
    return 'pending';
  };

  const getSourceIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle sx={{ fontSize: 16, color: theme.palette.success.main }} />;
      case 'active':
        return <Sync sx={{ fontSize: 16, color: theme.palette.primary.main, animation: 'spin 1s linear infinite' }} />;
      default:
        return <RadioButtonUnchecked sx={{ fontSize: 16, color: theme.palette.grey[400] }} />;
    }
  };

  const getSourceColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'active':
        return 'primary';
      default:
        return 'default';
    }
  };

  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'medium' }}>
        Fuentes de Datos
      </Typography>
      
      <Grid container spacing={1}>
        {sources.map((source, index) => {
          const status = getSourceStatus(source, index);
          return (
            <Grid item xs={6} sm={4} md={3} key={source}>
              <Chip
                icon={getSourceIcon(status)}
                label={source}
                color={getSourceColor(status) as any}
                variant={status === 'completed' ? 'filled' : 'outlined'}
                size="small"
                sx={{
                  width: '100%',
                  justifyContent: 'flex-start',
                  '& .MuiChip-icon': {
                    marginLeft: 1
                  }
                }}
              />
            </Grid>
          );
        })}
      </Grid>

      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </Box>
  );
};
