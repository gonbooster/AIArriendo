import express from 'express';
import cors from 'cors';
import { connectDatabase } from './config/database';
import { logger } from './utils/logger';
import searchRoutes from './routes/search';

const app = express();
const DEFAULT_PORT = Number(process.env.PORT) || 3001;

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Basic routes
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'AI Arriendo Pro Server is running!',
    timestamp: new Date().toISOString(),
    version: '3.0.0'
  });
});

app.get('/api/dashboard/stats', (req, res) => {
  res.json({
    success: true,
    data: {
      totalProperties: 0,
      activeScrapingJobs: 0,
      averagePrice: 0,
      averagePricePerM2: 0,
      sourceStats: [],
      priceDistribution: [],
      areaDistribution: [],
      recentActivity: []
    }
  });
});

// Use search routes
app.use('/api/search', searchRoutes);

app.get('/api/search/sources', (req, res) => {
  res.json({
    success: true,
    data: [
      { id: 'fincaraiz', name: 'Fincaraiz', isActive: true, priority: 1 },
      { id: 'metrocuadrado', name: 'Metrocuadrado', isActive: true, priority: 2 },
      { id: 'trovit', name: 'Trovit', isActive: true, priority: 3 },
      { id: 'facebook', name: 'Facebook Marketplace', isActive: true, priority: 4 }
    ]
  });
});

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Server error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    message: `Route ${req.method} ${req.originalUrl} not found`
  });
});

async function startServer() {
  try {
    // Try to connect to database (optional for demo)
    try {
      await connectDatabase();
      logger.info('✅ Connected to MongoDB');
    } catch (dbError) {
      logger.warn('⚠️  MongoDB not available, running in demo mode');
    }

    // Start server with port from env or default 3001, fallback if in use
    const tryListen = (port: number, attempts = 0) => {
      const server = app.listen(port, () => {
        logger.info(`🚀 AI Arriendo Pro Server running on port ${port}`);
        logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
        logger.info(`🔗 Health check: http://localhost:${port}/api/health`);
        logger.info(`📊 Dashboard: http://localhost:${port}/api/dashboard/stats`);
        logger.info(`🔍 Search API: http://localhost:${port}/api/search`);
        logger.info(`🎯 Demo mode: Database connection optional`);
      });
      server.on('error', (err: any) => {
        if (err.code === 'EADDRINUSE' && attempts < 5) {
          const nextPort = port + 1;
          logger.warn(`Port ${port} in use, trying ${nextPort}...`);
          tryListen(nextPort, attempts + 1);
        } else {
          throw err;
        }
      });
    };

    const initialPort = Number(process.env.PORT) || 3001;
    tryListen(initialPort);

  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('👋 SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('👋 SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start the server
startServer();
