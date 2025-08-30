import React, { useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Container,
  Fade,
  useTheme
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { useSearchProgress } from '../hooks/useSearchProgress';
import { ProgressBar } from './search/ProgressBar';
import { SourcesProgress } from './search/SourcesProgress';
import { SearchStats } from './search/SearchStats';

const SearchProgress: React.FC = () => {
  const theme = useTheme();
  const {
    isSearching,
    progress,
    currentPhase,
    currentSource,
    sourcesCompleted,
    totalSources,
    propertiesFound,
    timeElapsed,
    estimatedTimeRemaining,
    startSearch,
    completeSearch,
    SOURCES
  } = useSearchProgress();

  // Iniciar búsqueda automáticamente
  useEffect(() => {
    startSearch();
    
    // Simular finalización después de 45-60 segundos
    const timer = setTimeout(() => {
      completeSearch();
    }, 45000 + Math.random() * 15000);

    return () => clearTimeout(timer);
  }, [startSearch, completeSearch]);

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Fade in timeout={800}>
        <Paper
          elevation={8}
          sx={{
            p: 4,
            borderRadius: 3,
            background: `linear-gradient(135deg, 
              ${theme.palette.background.paper} 0%, 
              ${theme.palette.grey[50]} 100%)`,
            border: `1px solid ${theme.palette.divider}`,
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Fondo animado */}
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: `radial-gradient(circle at 20% 80%, 
                ${theme.palette.primary.main}15 0%, 
                transparent 50%),
                radial-gradient(circle at 80% 20%, 
                ${theme.palette.secondary.main}15 0%, 
                transparent 50%)`,
              zIndex: 0
            }}
          />

          {/* Contenido */}
          <Box sx={{ position: 'relative', zIndex: 1 }}>
            {/* Header */}
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  background: `linear-gradient(135deg, 
                    ${theme.palette.primary.main}, 
                    ${theme.palette.secondary.main})`,
                  mb: 2,
                  animation: 'pulse 2s ease-in-out infinite'
                }}
              >
                <SearchIcon sx={{ fontSize: 40, color: 'white' }} />
              </Box>
              
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 'bold',
                  background: `linear-gradient(135deg, 
                    ${theme.palette.primary.main}, 
                    ${theme.palette.secondary.main})`,
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  mb: 1
                }}
              >
                Buscando Propiedades
              </Typography>
              
              <Typography variant="subtitle1" color="text.secondary">
                Analizando múltiples fuentes de datos inmobiliarios
              </Typography>
            </Box>

            {/* Barra de progreso principal */}
            <ProgressBar
              progress={progress}
              currentPhase={currentPhase}
              timeElapsed={timeElapsed}
              estimatedTimeRemaining={estimatedTimeRemaining}
            />

            {/* Estadísticas en tiempo real */}
            <SearchStats
              propertiesFound={propertiesFound}
              sourcesCompleted={sourcesCompleted}
              totalSources={totalSources}
              timeElapsed={timeElapsed}
            />

            {/* Progreso de fuentes */}
            <SourcesProgress
              sources={SOURCES}
              currentSource={currentSource}
              sourcesCompleted={sourcesCompleted}
              totalSources={totalSources}
            />

            {/* Mensaje motivacional divertido */}
            <Box
              sx={{
                textAlign: 'center',
                mt: 3,
                p: 2,
                backgroundColor: theme.palette.action.hover,
                borderRadius: 2,
                border: `1px solid ${theme.palette.divider}`
              }}
            >
              <Typography variant="body2" color="text.secondary">
                {timeElapsed < 15 ? (
                  <>🚀 <strong>¡Despegamos!</strong> Nuestros robots están corriendo por todas partes buscando tu hogar perfecto.</>
                ) : timeElapsed < 30 ? (
                  <>🕵️ <strong>Misión en progreso:</strong> Infiltrándonos en las mejores páginas inmobiliarias... ¡Shh!</>
                ) : timeElapsed < 45 ? (
                  <>🏠 <strong>¡Eureka!</strong> Encontrando propiedades más rápido que un delivery de pizza.</>
                ) : (
                  <>🎯 <strong>¡Casi listo!</strong> Puliendo los resultados como diamantes... ¡Brillarán para ti!</>
                )}
              </Typography>
            </Box>
          </Box>

          {/* Animaciones CSS */}
          <style>
            {`
              @keyframes pulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.05); }
              }
            `}
          </style>
        </Paper>
      </Fade>
    </Container>
  );
};

export default SearchProgress;
