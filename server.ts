import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { connectDatabase } from './config/database';
import { logger } from './utils/logger';
import searchRoutes from './routes/search';

const app = express();
const DEFAULT_PORT = Number(process.env.PORT) || 3001;

// Dynamic CORS configuration
const getDynamicCorsOptions = () => {
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001'
  ];

  // Add environment-specific origins
  if (process.env.CLIENT_URL) {
    allowedOrigins.push(process.env.CLIENT_URL);
  }

  if (process.env.VERCEL_URL) {
    allowedOrigins.push(`https://${process.env.VERCEL_URL}`);
  }

  if (process.env.NETLIFY_URL) {
    allowedOrigins.push(process.env.NETLIFY_URL);
  }

  // Add any custom domains from environment
  if (process.env.ALLOWED_ORIGINS) {
    const customOrigins = process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim());
    allowedOrigins.push(...customOrigins);
  }

  return {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);

      // Check if origin is in allowed list
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // In development, be more permissive
      if (process.env.NODE_ENV === 'development') {
        logger.warn(`🔓 CORS: Allowing origin in development: ${origin}`);
        return callback(null, true);
      }

      // In production, log and reject
      logger.error(`🚫 CORS: Blocked origin: ${origin}`);
      callback(new Error(`CORS policy violation: Origin ${origin} not allowed`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    optionsSuccessStatus: 200 // For legacy browser support
  };
};

// Middleware
app.use(cors(getDynamicCorsOptions()));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Basic routes
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'AI Arriendo Pro Server is running! (Railway Fixed)',
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

// Serve static files from React build
const staticPath = path.join(__dirname, '../client/build');
logger.info(`🔧 Static files path: ${staticPath}`);
logger.info(`🔧 __dirname: ${__dirname}`);

// Check if build directory exists
if (fs.existsSync(staticPath)) {
  logger.info(`✅ Static build directory exists`);
  const files = fs.readdirSync(staticPath);
  logger.info(`📁 Build directory contains: ${files.join(', ')}`);
} else {
  logger.error(`❌ Static build directory NOT found: ${staticPath}`);
}

app.use(express.static(staticPath));

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

// Catch-all handler: send back React's index.html file for non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build/index.html'));
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
      const server = app.listen(port, '0.0.0.0', () => {
        logger.info(`🚀 AI Arriendo Pro Server running on port ${port}`);
        logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
        logger.info(`🔗 Health check: http://localhost:${port}/api/health`);
        logger.info(`📊 Dashboard: http://localhost:${port}/api/dashboard/stats`);
        logger.info(`🔍 Search API: http://localhost:${port}/api/search`);
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

    // Railway provides PORT environment variable, fallback to common Railway ports
    const railwayPort = process.env.PORT;
    let initialPort = 3001;

    if (railwayPort) {
      initialPort = Number(railwayPort);
    } else {
      // Try common Railway ports if PORT is not set
      const commonPorts = [8080, 3000, 5000, 8000];
      initialPort = commonPorts[0]; // Default to 8080 for Railway
    }

    logger.info(`🔧 Environment PORT: ${process.env.PORT || 'NOT_SET'}`);
    logger.info(`🔧 Environment NODE_ENV: ${process.env.NODE_ENV || 'NOT_SET'}`);
    logger.info(`🔧 Using port: ${initialPort}`);

    // Force production environment for Railway
    process.env.NODE_ENV = 'production';
    logger.info(`🔧 Forced NODE_ENV to production for Railway`);

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
