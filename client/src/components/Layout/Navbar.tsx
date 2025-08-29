import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  IconButton,

  useMediaQuery,
  useTheme,
  Drawer,
  List,
  Divider,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Close as CloseIcon,
  Business as BusinessIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  // const location = useLocation(); // No necesario sin navegación
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileDrawerOpen(!mobileDrawerOpen);
  };

  const handleDrawerClose = () => {
    setMobileDrawerOpen(false);
  };

  // Navegación simplificada - botones removidos

  return (
    <>
      <AppBar 
        position="sticky" 
        elevation={0}
        sx={{
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
        }}
      >
        <Toolbar sx={{ py: 1, px: { xs: 2, sm: 3, md: 4 } }}>
          {/* Mobile Menu Button */}
          {isMobile && (
            <IconButton
              color="primary"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ 
                mr: 2,
                backgroundColor: 'rgba(26, 54, 93, 0.1)',
                '&:hover': {
                  backgroundColor: 'rgba(26, 54, 93, 0.2)',
                }
              }}
            >
              <MenuIcon />
            </IconButton>
          )}

          {/* Logo and Title */}
          <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 40,
                height: 40,
                borderRadius: 2,
                background: 'linear-gradient(135deg, #1A365D 0%, #2D5A87 100%)',
                mr: 2,
                boxShadow: '0 4px 12px rgba(26, 54, 93, 0.3)',
              }}
            >
              <BusinessIcon sx={{ color: 'white', fontSize: 24 }} />
            </Box>
            <Typography
              variant="h6"
              component="div"
              sx={{ 
                fontWeight: 700,
                cursor: 'pointer',
                color: 'primary.main',
                '&:hover': { 
                  color: 'primary.dark',
                  transform: 'scale(1.02)',
                },
                fontSize: { xs: '1.2rem', md: '1.4rem' },
                transition: 'all 0.2s ease-in-out',
              }}
              onClick={() => navigate('/')}
            >
              AIArriendo
            </Typography>


          </Box>

          {/* Desktop Navigation - Simplificado */}


        </Toolbar>
      </AppBar>

      {/* Mobile Drawer */}
      <Drawer
        variant="temporary"
        anchor="left"
        open={mobileDrawerOpen}
        onClose={handleDrawerClose}
        ModalProps={{
          keepMounted: true,
        }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: 280,
            backgroundColor: 'background.paper',
          },
        }}
      >
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 36,
                  height: 36,
                  borderRadius: 2,
                  background: 'linear-gradient(135deg, #1A365D 0%, #2D5A87 100%)',
                  mr: 2,
                  boxShadow: '0 4px 12px rgba(26, 54, 93, 0.3)',
                }}
              >
                <BusinessIcon sx={{ color: 'white', fontSize: 20 }} />
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>
                AIArriendo
              </Typography>
            </Box>
            <IconButton 
              onClick={handleDrawerClose}
              sx={{
                backgroundColor: 'rgba(26, 54, 93, 0.1)',
                '&:hover': {
                  backgroundColor: 'rgba(26, 54, 93, 0.2)',
                }
              }}
            >
              <CloseIcon sx={{ color: 'primary.main' }} />
            </IconButton>
          </Box>

          <Divider sx={{ mb: 2 }} />



          <Divider sx={{ mb: 2 }} />

          {/* Navigation simplificada */}
          <List>
            {/* Navegación removida para simplificar la interfaz */}
          </List>
        </Box>
      </Drawer>
    </>
  );
};

export default Navbar;
