import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  LinearProgress,
  Paper,
  Chip,
  useTheme,
  Fade,
  Grid,
  Card
} from '@mui/material';
import {
  Search as SearchIcon,
  TrendingUp as TrendingIcon,
  Speed as SpeedIcon,
  Home as HomeIcon
} from '@mui/icons-material';

interface SearchProgressProps {
  isSearching: boolean;
  onComplete?: () => void;
}

const FUNNY_PHRASES = [
  "🔍 Buscando las mejores ofertas...",
  "🏠 Revisando apartamentos con buena vibra...",
  "💰 Calculando precios que no te hagan llorar...",
  "📍 Explorando barrios geniales...",
  "🎯 Filtrando propiedades de ensueño...",
  "🚀 Navegando por el universo inmobiliario...",
  "✨ Encontrando tu próximo hogar...",
  "🔥 Descubriendo ofertas irresistibles...",
  "🎪 Haciendo magia inmobiliaria...",
  "🌟 Buscando diamantes en bruto...",
  "🎨 Pintando el mapa de opciones...",
  "🎵 Componiendo la sinfonía perfecta de precios...",
  "🍕 Cocinando resultados deliciosos...",
  "🎭 Actuando como detective inmobiliario...",
  "🎪 Montando el circo de las oportunidades...",
  "🚁 Sobrevolando el mercado inmobiliario...",
  "🎯 Apuntando a tu apartamento ideal...",
  "🎲 Jugando con las mejores opciones...",
  "🎪 Haciendo malabares con los precios...",
  "🎨 Creando tu obra maestra habitacional..."
];

const SEARCH_SOURCES = [
  "MercadoLibre",
  "Fincaraiz", 
  "Metrocuadrado",
  "Trovit",
  "Ciencuadras",
  "Rentola",
  "Properati",
  "PADS"
];

const SearchProgress: React.FC<SearchProgressProps> = ({ isSearching, onComplete }) => {
  const theme = useTheme();
  const [progress, setProgress] = useState(0);
  const [currentPhrase, setCurrentPhrase] = useState(FUNNY_PHRASES[0]);
  const [currentSource, setCurrentSource] = useState(0);
  const [propertiesFound, setPropertiesFound] = useState(0);

  useEffect(() => {
    if (!isSearching) {
      setProgress(0);
      setCurrentSource(0);
      setPropertiesFound(0);
      return;
    }

    // Simular progreso realista
    const interval = setInterval(() => {
      setProgress(prev => {
        const newProgress = Math.min(prev + Math.random() * 8 + 2, 100);
        
        // Cambiar fuente basado en progreso
        const sourceIndex = Math.floor((newProgress / 100) * SEARCH_SOURCES.length);
        setCurrentSource(Math.min(sourceIndex, SEARCH_SOURCES.length - 1));
        
        // Simular propiedades encontradas
        if (newProgress > prev) {
          setPropertiesFound(prev => prev + Math.floor(Math.random() * 15 + 5));
        }
        
        // Completar búsqueda
        if (newProgress >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            onComplete?.();
          }, 1000);
        }
        
        return newProgress;
      });
    }, 800);

    // Cambiar frases cada 3 segundos
    const phraseInterval = setInterval(() => {
      const randomPhrase = FUNNY_PHRASES[Math.floor(Math.random() * FUNNY_PHRASES.length)];
      setCurrentPhrase(randomPhrase);
    }, 3000);

    return () => {
      clearInterval(interval);
      clearInterval(phraseInterval);
    };
  }, [isSearching, onComplete]);

  console.log('SearchProgress rendering with isSearching:', isSearching);

  if (!isSearching) {
    return null;
  }

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 99999,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2
      }}
    >
      <Paper
        elevation={20}
        sx={{
          p: 8,
          textAlign: 'center',
          background: 'linear-gradient(135deg, #ff6b6b, #4ecdc4, #45b7d1)',
          border: '8px solid #ff6b6b',
          borderRadius: 6,
          position: 'relative',
          overflow: 'hidden',
          minHeight: '600px',
          maxWidth: '800px',
          width: '100%',
          boxShadow: '0 30px 80px rgba(255, 107, 107, 0.8)',
          transform: 'scale(1.05)',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '12px',
            background: 'linear-gradient(90deg, #ff6b6b, #4ecdc4, #45b7d1)',
            animation: 'shimmer 0.8s infinite'
          }
        }}
      >
        {/* Header */}
        <Box sx={{ mb: 3 }}>
          <SearchIcon
            sx={{
              fontSize: 64,
              color: theme.palette.primary.main,
              mb: 2,
              animation: 'pulse 2s infinite, bounce 3s infinite'
            }}
          />
          <Typography variant="h2" gutterBottom sx={{ fontWeight: 'bold', color: 'white' }}>
            🔍 BÚSQUEDA EN PROGRESO
          </Typography>
          <Typography variant="h5" sx={{ color: 'white', fontWeight: 'bold' }}>
            ¡Explorando las mejores opciones para ti!
          </Typography>
        </Box>

        {/* Progress Bar */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Progreso
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
              {Math.round(progress)}%
            </Typography>
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={progress}
            sx={{ 
              height: 8, 
              borderRadius: 4,
              backgroundColor: theme.palette.grey[200],
              '& .MuiLinearProgress-bar': {
                borderRadius: 4,
                background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`
              }
            }}
          />
        </Box>

        {/* Current Status */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={4}>
            <Card elevation={1} sx={{ p: 2, textAlign: 'center' }}>
              <SpeedIcon sx={{ color: theme.palette.primary.main, mb: 1 }} />
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                {propertiesFound}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Propiedades encontradas
              </Typography>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card elevation={1} sx={{ p: 2, textAlign: 'center' }}>
              <HomeIcon sx={{ color: theme.palette.secondary.main, mb: 1 }} />
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                {currentSource + 1}/{SEARCH_SOURCES.length}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Fuentes exploradas
              </Typography>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card elevation={1} sx={{ p: 2, textAlign: 'center' }}>
              <TrendingIcon sx={{ color: theme.palette.success.main, mb: 1 }} />
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                {Math.round(progress)}%
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Completado
              </Typography>
            </Card>
          </Grid>
        </Grid>

        {/* Current Source */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Explorando actualmente:
          </Typography>
          <Chip 
            label={SEARCH_SOURCES[currentSource]}
            color="primary"
            variant="filled"
            sx={{ fontWeight: 'bold' }}
          />
        </Box>

        {/* Funny Phrase - MÁS VISIBLE */}
        <Box
          sx={{
            p: 4,
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            borderRadius: 3,
            border: '3px solid white',
            minHeight: '100px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
          }}
        >
          <Typography
            variant="h4"
            sx={{
              fontStyle: 'italic',
              color: '#ff6b6b',
              fontWeight: 'bold',
              textAlign: 'center',
              textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
            }}
          >
            {currentPhrase}
          </Typography>
        </Box>

        {/* CSS Animation */}
        <style>
          {`
            @keyframes pulse {
              0% { transform: scale(1); }
              50% { transform: scale(1.1); }
              100% { transform: scale(1); }
            }
            @keyframes shimmer {
              0% { transform: translateX(-100%); }
              100% { transform: translateX(100%); }
            }
            @keyframes bounce {
              0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
              40% { transform: translateY(-10px); }
              60% { transform: translateY(-5px); }
            }
          `}
        </style>
      </Paper>
    </Box>
  );
};

export default SearchProgress;
