import React from 'react';
import { 
  Alert, 
  Box, 
  Typography, 
  Chip,
  IconButton,
  Collapse
} from '@mui/material';
import { 
  Cached, 
  NewReleases, 
  Speed,
  ExpandMore,
  ExpandLess,
  Info
} from '@mui/icons-material';

interface CacheInfoBannerProps {
  cacheInfo?: {
    wasFromCache: boolean;
    hasNewItems: boolean;
    totalNewItems: number;
    cacheAge: number;
  };
  totalProperties: number;
}

const CacheInfoBanner: React.FC<CacheInfoBannerProps> = ({ 
  cacheInfo, 
  totalProperties 
}) => {
  const [expanded, setExpanded] = React.useState(false);

  if (!cacheInfo) return null;

  const { wasFromCache, hasNewItems, totalNewItems, cacheAge } = cacheInfo;

  // No mostrar banner si no hay información relevante
  if (!wasFromCache && !hasNewItems) return null;

  const formatCacheAge = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getSeverity = () => {
    if (hasNewItems && totalNewItems > 0) return 'success';
    if (wasFromCache) return 'info';
    return 'info';
  };

  const getMainMessage = () => {
    if (hasNewItems && totalNewItems > 0) {
      return `¡${totalNewItems} propiedades nuevas encontradas!`;
    }
    if (wasFromCache) {
      return `Resultados desde cache (${formatCacheAge(cacheAge)} de antigüedad)`;
    }
    return 'Resultados actualizados';
  };

  const getIcon = () => {
    if (hasNewItems && totalNewItems > 0) return <NewReleases />;
    if (wasFromCache) return <Cached />;
    return <Speed />;
  };

  return (
    <Alert 
      severity={getSeverity()}
      icon={getIcon()}
      sx={{ 
        mb: 2,
        '& .MuiAlert-message': {
          width: '100%'
        }
      }}
      action={
        <IconButton
          size="small"
          onClick={() => setExpanded(!expanded)}
          sx={{ color: 'inherit' }}
        >
          {expanded ? <ExpandLess /> : <ExpandMore />}
        </IconButton>
      }
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: expanded ? 1 : 0 }}>
        <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
          {getMainMessage()}
        </Typography>
        
        {hasNewItems && totalNewItems > 0 && (
          <Chip
            label={`+${totalNewItems}`}
            color="success"
            size="small"
            sx={{ fontWeight: 'bold' }}
          />
        )}
      </Box>

      <Collapse in={expanded}>
        <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            <Info sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
            Detalles del cache:
          </Typography>
          
          <Chip
            label={`Total: ${totalProperties} propiedades`}
            variant="outlined"
            size="small"
          />
          
          {wasFromCache && (
            <Chip
              label={`Cache: ${formatCacheAge(cacheAge)}`}
              variant="outlined"
              size="small"
              icon={<Cached sx={{ fontSize: 14 }} />}
            />
          )}
          
          {hasNewItems && (
            <Chip
              label={`Nuevas: ${totalNewItems}`}
              color="success"
              variant="outlined"
              size="small"
              icon={<NewReleases sx={{ fontSize: 14 }} />}
            />
          )}
          
          <Chip
            label="Cache inteligente activo"
            color="primary"
            variant="outlined"
            size="small"
            icon={<Speed sx={{ fontSize: 14 }} />}
          />
        </Box>
        
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          💡 Las propiedades nuevas aparecen marcadas y se muestran primero. 
          El cache se actualiza automáticamente en cada búsqueda.
        </Typography>
      </Collapse>
    </Alert>
  );
};

export default CacheInfoBanner;
