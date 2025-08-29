import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  IconButton,

  useMediaQuery,
  useTheme,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Divider,
} from '@mui/material';
import {
  Search as SearchIcon,
  Favorite as FavoriteIcon,
  Menu as MenuIcon,
  Close as CloseIcon,
  Business as BusinessIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileDrawerOpen(!mobileDrawerOpen);
  };

  const handleDrawerClose = () => {
    setMobileDrawerOpen(false);
  };

  const isActive = (path: string) => location.pathname === path;

  const navigationItems = [
    { label: 'Buscar', icon: <SearchIcon />, path: '/search' },
    { label: 'Favoritos', icon: <FavoriteIcon />, path: '/favorites' },
  ];

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
              PropiedadesPro
            </Typography>


          </Box>

          {/* Desktop Navigation Buttons */}
          {!isMobile && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 2 }}>
              {navigationItems.map((item) => {
                const isItemActive = isActive(item.path) || (item.path === '/search' && isActive('/'));
                return (
                  <Button
                    key={item.path}
                    startIcon={item.icon}
                    onClick={() => navigate(item.path)}
                    variant={isItemActive ? 'contained' : 'text'}
                    sx={{
                      color: isItemActive ? 'white' : 'primary.main',
                      backgroundColor: isItemActive ? 'primary.main' : 'transparent',
                      '&:hover': { 
                        backgroundColor: isItemActive ? 'primary.dark' : 'rgba(26, 54, 93, 0.1)',
                        transform: 'translateY(-1px)',
                      },
                      borderRadius: 3,
                      px: 3,
                      py: 1,
                      fontWeight: 600,
                      textTransform: 'none',
                      boxShadow: isItemActive ? '0 4px 12px rgba(26, 54, 93, 0.3)' : 'none',
                      transition: 'all 0.2s ease-in-out',
                    }}
                  >
                    {item.label}
                  </Button>
                );
              })}
            </Box>
          )}


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
                PropiedadesPro
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

          {/* Navigation Items */}
          <List>
            {navigationItems.map((item) => (
              <ListItem key={item.path} disablePadding>
                <ListItemButton
                  onClick={() => {
                    navigate(item.path);
                    handleDrawerClose();
                  }}
                  selected={isActive(item.path) || (item.path === '/search' && isActive('/'))}
                  sx={{
                    borderRadius: 3,
                    mb: 1,
                    mx: 1,
                    '&.Mui-selected': {
                      background: 'linear-gradient(135deg, #1A365D 0%, #2D5A87 100%)',
                      color: 'white',
                      boxShadow: '0 4px 12px rgba(26, 54, 93, 0.3)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #0F2A44 0%, #1A365D 100%)',
                      },
                      '& .MuiListItemIcon-root': {
                        color: 'white',
                      },
                    },
                    '&:hover': {
                      backgroundColor: 'rgba(26, 54, 93, 0.1)',
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText primary={item.label} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>
    </>
  );
};

export default Navbar;
