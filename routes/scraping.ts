import express from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { scrapingRateLimiterMiddleware } from '../middleware/rateLimiter';
import { ApiResponse, ScrapingJob } from '../core/types';
import { logger } from '../utils/logger';

const router = express.Router();

// Mock scraping jobs storage (in production, use Redis or database)
let scrapingJobs: ScrapingJob[] = [];

// Get available sources
router.get('/sources', asyncHandler(async (req, res) => {
  const sources = [
    'fincaraiz.com',
    'metrocuadrado.com',
    'facebook.com/marketplace',
    'rentola.co',
    'arriendo.com',
    'ciencuadras.com',
    'mercadolibre.com'
  ];

  const response: ApiResponse<string[]> = {
    success: true,
    data: sources
  };

  res.json(response);
}));

// Get scraping status
router.get('/status', asyncHandler(async (req, res) => {
  const response: ApiResponse<ScrapingJob[]> = {
    success: true,
    data: scrapingJobs
  };

  res.json(response);
}));

// Start scraping
router.post('/start', scrapingRateLimiterMiddleware, asyncHandler(async (req, res) => {
  const { sources } = req.body;
  const sourcesToScrape = sources || [
    'fincaraiz.com',
    'metrocuadrado.com',
    'facebook.com/marketplace',
    'rentola.co',
    'arriendo.com',
    'ciencuadras.com',
    'mercadolibre.com'
  ];

  logger.info('Starting scraping for sources:', sourcesToScrape);

  const newJobs: ScrapingJob[] = sourcesToScrape.map((source: string) => ({
    id: `${source}_${Date.now()}`,
    source,
    status: 'pending' as const,
    startTime: new Date().toISOString(),
    propertiesFound: 0,
    progress: 0
  }));

  // Add jobs to storage
  scrapingJobs.push(...newJobs);

  // Simulate scraping process
  newJobs.forEach(job => {
    simulateScrapingJob(job);
  });

  const response: ApiResponse<ScrapingJob[]> = {
    success: true,
    data: newJobs,
    message: `Started scraping for ${sourcesToScrape.length} sources`
  };

  res.json(response);
}));

// Stop scraping
router.post('/stop/:jobId', asyncHandler(async (req, res) => {
  const { jobId } = req.params;

  const jobIndex = scrapingJobs.findIndex(job => job.id === jobId);
  if (jobIndex === -1) {
    return res.status(404).json({
      success: false,
      error: 'Scraping job not found'
    });
  }

  const job = scrapingJobs[jobIndex];
  if (job.status === 'running') {
    job.status = 'failed';
    job.endTime = new Date().toISOString();
    job.error = 'Stopped by user';
    
    logger.info(`Stopped scraping job: ${jobId}`);
  }

  const response: ApiResponse = {
    success: true,
    message: 'Scraping job stopped'
  };

  res.json(response);
}));

// Get scraping history
router.get('/history', asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;

  // In production, this would query from database
  const completedJobs = scrapingJobs.filter(job => 
    job.status === 'completed' || job.status === 'failed'
  );

  const startIndex = (page - 1) * limit;
  const paginatedJobs = completedJobs
    .sort((a, b) => new Date(b.startTime!).getTime() - new Date(a.startTime!).getTime())
    .slice(startIndex, startIndex + limit);

  const response: ApiResponse<ScrapingJob[]> = {
    success: true,
    data: paginatedJobs,
    pagination: {
      page,
      limit,
      total: completedJobs.length,
      pages: Math.ceil(completedJobs.length / limit)
    }
  };

  res.json(response);
}));

// Simulate scraping job (replace with real scraping logic)
function simulateScrapingJob(job: ScrapingJob) {
  // Update job status to running
  job.status = 'running';
  job.progress = 0;

  const totalSteps = 10;
  let currentStep = 0;

  const interval = setInterval(() => {
    currentStep++;
    job.progress = (currentStep / totalSteps) * 100;
    
    // Simulate finding properties
    if (currentStep % 3 === 0) {
      job.propertiesFound += Math.floor(Math.random() * 5) + 1;
    }

    logger.info(`Scraping progress for ${job.source}: ${job.progress}%`);

    if (currentStep >= totalSteps) {
      clearInterval(interval);
      
      // Randomly succeed or fail (90% success rate)
      if (Math.random() > 0.1) {
        job.status = 'completed';
        job.propertiesFound += Math.floor(Math.random() * 10) + 5;
        job.progress = 100;
        logger.info(`Scraping completed for ${job.source}: ${job.propertiesFound} properties found`);
      } else {
        job.status = 'failed';
        job.error = 'Simulated scraping error';
        logger.error(`Scraping failed for ${job.source}: ${job.error}`);
      }
      
      job.endTime = new Date().toISOString();
    }
  }, 2000); // Update every 2 seconds
}

export default router;
