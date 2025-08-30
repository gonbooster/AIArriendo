import React from 'react';
import { Box, Typography, Grid, Paper, useTheme } from '@mui/material';
import { Home, Speed, Source, TrendingUp } from '@mui/icons-material';

interface SearchStatsProps {
  propertiesFound: number;
  sourcesCompleted: number;
  totalSources: number;
  timeElapsed: number;
}

export const SearchStats: React.FC<SearchStatsProps> = ({
  propertiesFound,
  sourcesCompleted,
  totalSources,
  timeElapsed
}) => {
  const theme = useTheme();

  const stats = [
    {
      icon: <Home sx={{ fontSize: 24, color: theme.palette.primary.main }} />,
      label: 'Propiedades',
      value: propertiesFound.toLocaleString(),
      subtitle: 'encontradas'
    },
    {
      icon: <Source sx={{ fontSize: 24, color: theme.palette.secondary.main }} />,
      label: 'Fuentes',
      value: `${sourcesCompleted}/${totalSources}`,
      subtitle: 'completadas'
    },
    {
      icon: <Speed sx={{ fontSize: 24, color: theme.palette.success.main }} />,
      label: 'Velocidad',
      value: timeElapsed > 0 ? Math.round(propertiesFound / timeElapsed) : 0,
      subtitle: 'props/seg'
    },
    {
      icon: <TrendingUp sx={{ fontSize: 24, color: theme.palette.warning.main }} />,
      label: 'Tiempo',
      value: `${timeElapsed}s`,
      subtitle: 'transcurrido'
    }
  ];

  return (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      {stats.map((stat, index) => (
        <Grid item xs={6} sm={3} key={index}>
          <Paper
            elevation={2}
            sx={{
              p: 2,
              textAlign: 'center',
              background: `linear-gradient(135deg, 
                ${theme.palette.background.paper} 0%, 
                ${theme.palette.grey[50]} 100%)`,
              border: `1px solid ${theme.palette.divider}`,
              transition: 'transform 0.2s ease-in-out',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: theme.shadows[4]
              }
            }}
          >
            <Box sx={{ mb: 1 }}>
              {stat.icon}
            </Box>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 'bold',
                color: theme.palette.text.primary,
                mb: 0.5
              }}
            >
              {stat.value}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {stat.label}
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block">
              {stat.subtitle}
            </Typography>
          </Paper>
        </Grid>
      ))}
    </Grid>
  );
};
