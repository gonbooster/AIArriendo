import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { connectDatabase } from './config/database';
import { logger } from './utils/logger';
import searchRoutes from './routes/search';
import { SERVER, FRONTEND } from './config/constants';

const app = express();
const DEFAULT_PORT = Number(process.env.PORT) || SERVER.DEFAULT_PORT;

// Dynamic CORS configuration
const getDynamicCorsOptions = (serverPort?: number) => {
  const allowedOrigins = [
    `http://${SERVER.LOCALHOST_HOSTNAMES[0]}:${FRONTEND.DEVELOPMENT_PORTS[0]}`,
    `http://${SERVER.LOCALHOST_HOSTNAMES[0]}:${FRONTEND.DEVELOPMENT_PORTS[1]}`,
    `http://${SERVER.LOCALHOST_HOSTNAMES[1]}:${FRONTEND.DEVELOPMENT_PORTS[0]}`,
    `http://${SERVER.LOCALHOST_HOSTNAMES[1]}:${FRONTEND.DEVELOPMENT_PORTS[1]}`,
    // Add server port for self-hosting (dynamic)
    `http://${SERVER.LOCALHOST_HOSTNAMES[0]}:${SERVER.DEFAULT_PORT}`,
    `http://${SERVER.LOCALHOST_HOSTNAMES[1]}:${SERVER.DEFAULT_PORT}`
  ];

  // Add the actual server port if it's different from default
  if (serverPort && serverPort !== SERVER.DEFAULT_PORT) {
    allowedOrigins.push(`http://${SERVER.LOCALHOST_HOSTNAMES[0]}:${serverPort}`);
    allowedOrigins.push(`http://${SERVER.LOCALHOST_HOSTNAMES[1]}:${serverPort}`);
  }

  // Add common backup ports
  const commonPorts = [8081, 8082, 8083, 3000, 3001, 5000, 5001];
  commonPorts.forEach(port => {
    allowedOrigins.push(`http://${SERVER.LOCALHOST_HOSTNAMES[0]}:${port}`);
    allowedOrigins.push(`http://${SERVER.LOCALHOST_HOSTNAMES[1]}:${port}`);
  });

  // Add Railway domains automatically
  if (process.env.RAILWAY_ENVIRONMENT) {
    // Railway domains
    allowedOrigins.push('https://aiarriendo.up.railway.app');
    allowedOrigins.push('https://aiarriendo-production.up.railway.app');
    // Add any Railway-generated domains
    const railwayDomain = process.env.RAILWAY_PUBLIC_DOMAIN;
    if (railwayDomain) {
      allowedOrigins.push(`https://${railwayDomain}`);
    }
  }

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

  logger.info('🔧 CORS allowed origins:', allowedOrigins);

  return {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) {
        logger.info('✅ CORS: Allowing request with no origin');
        return callback(null, true);
      }

      // Check if origin is in allowed list
      if (allowedOrigins.includes(origin)) {
        logger.info(`✅ CORS: Allowing origin: ${origin}`);
        return callback(null, true);
      }

      // In development or localhost, be more permissive
      if (process.env.NODE_ENV === 'development' ||
          origin.includes('localhost') ||
          origin.includes('127.0.0.1')) {
        logger.warn(`🔓 CORS: Allowing localhost origin: ${origin}`);
        return callback(null, true);
      }

      // In production, log and reject
      logger.error(`🚫 CORS: Blocked origin: ${origin}`);
      logger.error(`🔧 CORS: Allowed origins are:`, allowedOrigins);
      callback(new Error(`CORS policy violation: Origin ${origin} not allowed`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    optionsSuccessStatus: 200 // For legacy browser support
  };
};

// Middleware - Dynamic CORS configuration
app.use(cors(getDynamicCorsOptions()));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Basic routes
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'AI Arriendo Pro Server is running! (Railway Fixed)',
    timestamp: new Date().toISOString(),
    version: '3.0.0',
    port: process.env.PORT || 3001,
    environment: process.env.NODE_ENV || 'development'
  });
});

// Root health check for Railway (only for API requests)
app.get('/api', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'AI Arriendo Pro - Railway Deployment',
    timestamp: new Date().toISOString(),
    health: '/api/health',
    api: '/api/search'
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

// Property routes (direct access)
const searchController = new (require('./controllers/SearchController').SearchController)();
app.get('/api/properties/:id', searchController.getProperty);
app.get('/api/properties/:id/similar', searchController.getSimilarProperties);

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

// 🚀 DATOS ESTÁTICOS ELIMINADOS - SOLO SCRAPERS REALES

app.get('/api/search/sources', (req, res) => {
  res.json({
    success: true,
    data: [
      { id: 'fincaraiz', name: 'Fincaraiz', isActive: true, priority: 1 },
      { id: 'metrocuadrado', name: 'Metrocuadrado', isActive: true, priority: 2 },
      { id: 'trovit', name: 'Trovit', isActive: true, priority: 3 },
      { id: 'arriendo', name: 'Arriendo', isActive: true, priority: 4 },
      { id: 'ciencuadras', name: 'Ciencuadras', isActive: true, priority: 5 },
      { id: 'rentola', name: 'Rentola', isActive: true, priority: 6 },
      { id: 'properati', name: 'Properati', isActive: true, priority: 7 },
      { id: 'pads', name: 'PADS', isActive: true, priority: 8 }
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
        logger.info(`🚀 AI Arriendo Pro Server running on 0.0.0.0:${port}`);
        logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
        logger.info(`🔗 Health check: http://0.0.0.0:${port}/api/health`);
        logger.info(`📊 Dashboard: http://0.0.0.0:${port}/api/dashboard/stats`);
        logger.info(`🔍 Search API: http://0.0.0.0:${port}/api/search`);
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

    // Railway provides PORT environment variable
    const railwayPort = process.env.PORT || process.env.RAILWAY_PORT;
    let initialPort = 3001;

    if (railwayPort) {
      initialPort = Number(railwayPort);
      logger.info(`🚂 Using Railway assigned port: ${initialPort}`);
    } else {
      // For Railway, try common ports
      initialPort = 8080; // Railway default
      logger.warn(`⚠️ No PORT env var, defaulting to ${initialPort}`);
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
