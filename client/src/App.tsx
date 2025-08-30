import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box } from '@mui/material';

import Navbar from './components/Layout/Navbar';
import SearchPage from './pages/SearchPage';
import ResultsPage from './pages/ResultsPage';
import ModernResultsPage from './pages/ModernResultsPage';
import PropertyDetailPage from './pages/PropertyDetailPage';
import { SearchProvider } from './contexts/SearchContext';
import theme from './theme/theme';



function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <SearchProvider>
        <Router>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              minHeight: '100vh',
              backgroundColor: 'background.default',
            }}
          >
            <Navbar />
            <Box
              component="main"
              sx={{
                flexGrow: 1,
                pt: { xs: 2, sm: 3 },
                pb: { xs: 2, sm: 3 },
                minHeight: 'calc(100vh - 80px)',
              }}
            >
              <Routes>
                <Route path="/" element={<SearchPage />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/results" element={<ResultsPage />} />
                <Route path="/results-modern" element={<ModernResultsPage />} />
                <Route path="/property/:id" element={<PropertyDetailPage />} />
              </Routes>
            </Box>
          </Box>
        </Router>
      </SearchProvider>
    </ThemeProvider>
  );
}

export default App;
