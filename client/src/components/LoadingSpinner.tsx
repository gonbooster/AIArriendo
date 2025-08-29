import React from 'react';
import {
  Box,
  CircularProgress,
  Typography,
  Skeleton,
  Card,
  CardContent,
  Grid,
  useTheme,
  useMediaQuery,
  Fade,
} from '@mui/material';

interface LoadingSpinnerProps {
  size?: number;
  message?: string;
  variant?: 'spinner' | 'skeleton' | 'cards';
  fullHeight?: boolean;
  color?: 'primary' | 'secondary' | 'inherit';
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 40,
  message = 'Cargando...',
  variant = 'spinner',
  fullHeight = false,
  color = 'primary',
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const containerHeight = fullHeight ? '100vh' : 'auto';
  const minHeight = fullHeight ? '100vh' : '200px';

  if (variant === 'skeleton') {
    return (
      <Box sx={{ p: 2 }}>
        <Skeleton variant="text" width="60%" height={40} sx={{ mb: 2 }} />
        <Skeleton variant="text" width="40%" height={24} sx={{ mb: 3 }} />
        <Skeleton variant="rectangular" width="100%" height={200} sx={{ mb: 2, borderRadius: 2 }} />
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <Skeleton variant="rectangular" width={80} height={32} sx={{ borderRadius: 1 }} />
          <Skeleton variant="rectangular" width={100} height={32} sx={{ borderRadius: 1 }} />
          <Skeleton variant="rectangular" width={60} height={32} sx={{ borderRadius: 1 }} />
        </Box>
        <Skeleton variant="text" width="80%" height={20} />
        <Skeleton variant="text" width="70%" height={20} />
        <Skeleton variant="text" width="50%" height={20} />
      </Box>
    );
  }

  if (variant === 'cards') {
    return (
      <Grid container spacing={3} sx={{ p: 2 }}>
        {[1, 2, 3, 4, 5, 6].map((item) => (
          <Grid item xs={12} sm={6} md={4} key={item}>
            <Card>
              <Skeleton variant="rectangular" width="100%" height={200} />
              <CardContent>
                <Skeleton variant="text" width="80%" height={32} sx={{ mb: 1 }} />
                <Skeleton variant="text" width="60%" height={24} sx={{ mb: 2 }} />
                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  <Skeleton variant="rectangular" width={60} height={24} sx={{ borderRadius: 1 }} />
                  <Skeleton variant="rectangular" width={80} height={24} sx={{ borderRadius: 1 }} />
                </Box>
                <Skeleton variant="text" width="100%" height={20} />
                <Skeleton variant="text" width="70%" height={20} />
                <Skeleton variant="rectangular" width="100%" height={36} sx={{ mt: 2, borderRadius: 1 }} />
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    );
  }

  return (
    <Fade in timeout={300}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: containerHeight,
          minHeight: minHeight,
          p: 3,
          textAlign: 'center',
        }}
      >
        <Box
          sx={{
            position: 'relative',
            display: 'inline-flex',
            mb: 2,
          }}
        >
          <CircularProgress
            size={size}
            color={color}
            thickness={4}
            sx={{
              animationDuration: '1.5s',
            }}
          />
          <Box
            sx={{
              top: 0,
              left: 0,
              bottom: 0,
              right: 0,
              position: 'absolute',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CircularProgress
              variant="determinate"
              value={25}
              size={size - 8}
              thickness={2}
              sx={{
                color: theme.palette.grey[300],
                animationDuration: '2s',
                transform: 'rotate(180deg)',
              }}
            />
          </Box>
        </Box>

        {message && (
          <Typography
            variant={isMobile ? 'body1' : 'h6'}
            color="text.secondary"
            sx={{
              fontWeight: 500,
              maxWidth: 300,
              lineHeight: 1.4,
            }}
          >
            {message}
          </Typography>
        )}

        {/* Animated dots */}
        <Box
          sx={{
            display: 'flex',
            gap: 0.5,
            mt: 1,
          }}
        >
          {[0, 1, 2].map((index) => (
            <Box
              key={index}
              sx={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                backgroundColor: 'primary.main',
                animation: 'pulse 1.5s ease-in-out infinite',
                animationDelay: `${index * 0.2}s`,
                '@keyframes pulse': {
                  '0%, 80%, 100%': {
                    opacity: 0.3,
                    transform: 'scale(0.8)',
                  },
                  '40%': {
                    opacity: 1,
                    transform: 'scale(1)',
                  },
                },
              }}
            />
          ))}
        </Box>
      </Box>
    </Fade>
  );
};

// Loading overlay component
interface LoadingOverlayProps {
  loading: boolean;
  children: React.ReactNode;
  message?: string;
  backdrop?: boolean;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  loading,
  children,
  message = 'Cargando...',
  backdrop = true,
}) => {
  return (
    <Box sx={{ position: 'relative' }}>
      {children}
      {loading && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: backdrop ? 'rgba(255, 255, 255, 0.8)' : 'transparent',
            backdropFilter: backdrop ? 'blur(2px)' : 'none',
            zIndex: 1000,
            borderRadius: 'inherit',
          }}
        >
          <LoadingSpinner message={message} />
        </Box>
      )}
    </Box>
  );
};

// Property card skeleton
export const PropertyCardSkeleton: React.FC = () => {
  return (
    <Card sx={{ height: 420 }}>
      <Skeleton variant="rectangular" width="100%" height={200} />
      <CardContent>
        <Skeleton variant="text" width="70%" height={32} sx={{ mb: 1 }} />
        <Skeleton variant="text" width="50%" height={20} sx={{ mb: 1 }} />
        <Skeleton variant="text" width="90%" height={20} sx={{ mb: 2 }} />
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <Skeleton variant="rectangular" width={60} height={24} sx={{ borderRadius: 1 }} />
          <Skeleton variant="rectangular" width={80} height={24} sx={{ borderRadius: 1 }} />
        </Box>
        <Box sx={{ display: 'flex', gap: 0.5, mb: 2 }}>
          <Skeleton variant="rectangular" width={50} height={20} sx={{ borderRadius: 1 }} />
          <Skeleton variant="rectangular" width={60} height={20} sx={{ borderRadius: 1 }} />
          <Skeleton variant="rectangular" width={40} height={20} sx={{ borderRadius: 1 }} />
        </Box>
        <Skeleton variant="rectangular" width="100%" height={36} sx={{ borderRadius: 1 }} />
      </CardContent>
    </Card>
  );
};

export default LoadingSpinner;
