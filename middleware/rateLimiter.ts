import { Request, Response, NextFunction } from 'express';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import { getRedisClient } from '../config/redis';
import { logger } from '../utils/logger';
import { CustomError } from './errorHandler';

let rateLimiter: RateLimiterRedis;

// Initialize rate limiter
export function initRateLimiter(): void {
  try {
    const redisClient = getRedisClient();
    
    rateLimiter = new RateLimiterRedis({
      storeClient: redisClient,
      keyPrefix: 'rl_api',
      points: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
      duration: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900'), // 15 minutes in seconds
      blockDuration: 60, // Block for 1 minute
    });
    
    logger.info('Rate limiter initialized');
  } catch (error) {
    logger.warn('Rate limiter initialization failed, using memory fallback');
    
    // Fallback to memory-based rate limiter
    const { RateLimiterMemory } = require('rate-limiter-flexible');
    rateLimiter = new RateLimiterMemory({
      keyPrefix: 'rl_api',
      points: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
      duration: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900'),
      blockDuration: 60,
    });
  }
}

export const rateLimiterMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!rateLimiter) {
      initRateLimiter();
    }

    const key = req.ip || 'unknown';
    await rateLimiter.consume(key);
    next();
  } catch (rejRes: any) {
    const secs = Math.round(rejRes.msBeforeNext / 1000) || 1;
    
    res.set('Retry-After', String(secs));
    res.status(429).json({
      success: false,
      error: 'Too many requests',
      message: `Rate limit exceeded. Try again in ${secs} seconds.`,
      retryAfter: secs
    });
  }
};

// Specific rate limiter for scraping endpoints
export const scrapingRateLimiter = new RateLimiterRedis({
  storeClient: getRedisClient(),
  keyPrefix: 'rl_scraping',
  points: 5, // 5 requests
  duration: 300, // per 5 minutes
  blockDuration: 300, // block for 5 minutes
});

export const scrapingRateLimiterMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const key = req.ip || 'unknown';
    await scrapingRateLimiter.consume(key);
    next();
  } catch (rejRes: any) {
    const secs = Math.round(rejRes.msBeforeNext / 1000) || 1;
    
    res.set('Retry-After', String(secs));
    res.status(429).json({
      success: false,
      error: 'Scraping rate limit exceeded',
      message: `Too many scraping requests. Try again in ${secs} seconds.`,
      retryAfter: secs
    });
  }
};

// Export the main rate limiter
export { rateLimiterMiddleware as rateLimiter };
