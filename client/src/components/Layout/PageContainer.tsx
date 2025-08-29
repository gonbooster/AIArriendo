import React from 'react';
import {
  Container,
  Box,
  Typography,
  Breadcrumbs,
  Link,
  useTheme,
  useMediaQuery,
  Fade,
} from '@mui/material';
import { NavigateNext as NavigateNextIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface PageContainerProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false;
  disableGutters?: boolean;
  background?: 'default' | 'paper' | 'transparent';
  padding?: number;
  showHeader?: boolean;
}

const PageContainer: React.FC<PageContainerProps> = ({
  children,
  title,
  subtitle,
  breadcrumbs,
  maxWidth = 'lg',
  disableGutters = false,
  background = 'default',
  padding,
  showHeader = true,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();

  const handleBreadcrumbClick = (path?: string) => {
    if (path) {
      navigate(path);
    }
  };

  const getBackgroundColor = () => {
    switch (background) {
      case 'paper':
        return 'background.paper';
      case 'transparent':
        return 'transparent';
      default:
        return 'background.default';
    }
  };

  const containerPadding = padding !== undefined ? padding : (isMobile ? 2 : 3);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: getBackgroundColor(),
        pt: showHeader ? (isMobile ? 2 : 3) : 0,
        pb: isMobile ? 2 : 3,
      }}
    >
      <Container
        maxWidth={maxWidth}
        disableGutters={disableGutters}
        sx={{
          px: disableGutters ? 0 : containerPadding,
        }}
      >
        {showHeader && (breadcrumbs || title || subtitle) && (
          <Fade in timeout={600}>
            <Box sx={{ mb: isMobile ? 2 : 4 }}>
              {/* Breadcrumbs */}
              {breadcrumbs && breadcrumbs.length > 0 && (
                <Breadcrumbs
                  separator={<NavigateNextIcon fontSize="small" />}
                  sx={{
                    mb: 2,
                    '& .MuiBreadcrumbs-separator': {
                      color: 'text.secondary',
                    },
                  }}
                >
                  {breadcrumbs.map((item, index) => {
                    const isLast = index === breadcrumbs.length - 1;
                    
                    if (isLast || !item.path) {
                      return (
                        <Typography
                          key={index}
                          color={isLast ? 'text.primary' : 'text.secondary'}
                          variant="body2"
                          sx={{
                            fontWeight: isLast ? 600 : 400,
                          }}
                        >
                          {item.label}
                        </Typography>
                      );
                    }

                    return (
                      <Link
                        key={index}
                        color="text.secondary"
                        variant="body2"
                        sx={{
                          cursor: 'pointer',
                          textDecoration: 'none',
                          '&:hover': {
                            textDecoration: 'underline',
                            color: 'primary.main',
                          },
                        }}
                        onClick={() => handleBreadcrumbClick(item.path)}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </Breadcrumbs>
              )}

              {/* Page Title */}
              {title && (
                <Typography
                  variant={isMobile ? 'h4' : 'h3'}
                  component="h1"
                  sx={{
                    fontWeight: 'bold',
                    color: 'text.primary',
                    mb: subtitle ? 1 : 0,
                    lineHeight: 1.2,
                  }}
                >
                  {title}
                </Typography>
              )}

              {/* Page Subtitle */}
              {subtitle && (
                <Typography
                  variant={isMobile ? 'body1' : 'h6'}
                  color="text.secondary"
                  sx={{
                    fontWeight: 400,
                    lineHeight: 1.4,
                  }}
                >
                  {subtitle}
                </Typography>
              )}
            </Box>
          </Fade>
        )}

        {/* Page Content */}
        <Fade in timeout={800}>
          <Box>
            {children}
          </Box>
        </Fade>
      </Container>
    </Box>
  );
};

export default PageContainer;
