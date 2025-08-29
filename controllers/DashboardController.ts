import { Request, Response } from 'express';
import { Property } from '../models/Property';
import { ApiResponse, DashboardStats } from '../core/types';
import { asyncHandler } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

export class DashboardController {
  /**
   * Get dashboard statistics
   */
  getStats = asyncHandler(async (req: Request, res: Response) => {
    try {
      logger.info('Fetching dashboard statistics');

      // Get basic counts
      const totalProperties = await Property.countDocuments({ isActive: true });
      
      // Get price statistics
      const priceStats = await Property.aggregate([
        { $match: { isActive: true } },
        {
          $group: {
            _id: null,
            averagePrice: { $avg: '$price' },
            averagePricePerM2: { $avg: '$pricePerM2' },
            averageArea: { $avg: '$area' },
            minPrice: { $min: '$totalPrice' },
            maxPrice: { $max: '$totalPrice' }
          }
        }
      ]);

      // Get source statistics
      const sourceStats = await Property.aggregate([
        { $match: { isActive: true } },
        {
          $group: {
            _id: '$source',
            count: { $sum: 1 },
            averagePrice: { $avg: '$price' },
            lastUpdate: { $max: '$scrapedDate' }
          }
        },
        { $sort: { count: -1 } }
      ]);

      // Get price distribution
      const priceDistribution = await this.getPriceDistribution();

      // Get area distribution
      const areaDistribution = await this.getAreaDistribution();

      // Get recent activity (mock for now)
      const recentActivity = await this.getRecentActivity();

      const stats: DashboardStats = {
        totalProperties,
        activeScrapingJobs: 0, // This would come from scraping engine
        averagePrice: priceStats[0]?.averagePrice || 0,
        averagePricePerM2: priceStats[0]?.averagePricePerM2 || 0,
        sourceStats: sourceStats.map(stat => ({
          source: stat._id,
          count: stat.count,
          lastUpdate: stat.lastUpdate.toISOString()
        })),
        priceDistribution,
        areaDistribution,
        recentActivity
      };

      const response: ApiResponse<DashboardStats> = {
        success: true,
        data: stats
      };

      res.json(response);

    } catch (error) {
      logger.error('Failed to get dashboard stats:', error);
      throw error;
    }
  });

  /**
   * Get price trends over time
   */
  getPriceTrends = asyncHandler(async (req: Request, res: Response) => {
    const days = parseInt(req.query.days as string) || 30;

    try {
      const trends = await Property.aggregate([
        {
          $match: {
            isActive: true,
            scrapedDate: {
              $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000)
            }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$scrapedDate'
              }
            },
            averagePrice: { $avg: '$price' },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      const response: ApiResponse = {
        success: true,
        data: trends.map(trend => ({
          date: trend._id,
          averagePrice: Math.round(trend.averagePrice),
          count: trend.count
        }))
      };

      res.json(response);

    } catch (error) {
      logger.error('Failed to get price trends:', error);
      throw error;
    }
  });

  /**
   * Get neighborhood statistics
   */
  getNeighborhoodStats = asyncHandler(async (req: Request, res: Response) => {
    try {
      const stats = await Property.aggregate([
        { $match: { isActive: true, 'location.neighborhood': { $exists: true, $ne: null } } },
        {
          $group: {
            _id: '$location.neighborhood',
            count: { $sum: 1 },
            averagePrice: { $avg: '$price' },
            averagePricePerM2: { $avg: '$pricePerM2' },
            averageArea: { $avg: '$area' }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 20 }
      ]);

      const response: ApiResponse = {
        success: true,
        data: stats.map(stat => ({
          neighborhood: stat._id,
          count: stat.count,
          averagePrice: Math.round(stat.averagePrice),
          averagePricePerM2: Math.round(stat.averagePricePerM2),
          averageArea: Math.round(stat.averageArea)
        }))
      };

      res.json(response);

    } catch (error) {
      logger.error('Failed to get neighborhood stats:', error);
      throw error;
    }
  });

  /**
   * Get property overview
   */
  getPropertyOverview = asyncHandler(async (req: Request, res: Response) => {
    try {
      const overview = await Property.aggregate([
        { $match: { isActive: true } },
        {
          $facet: {
            roomsDistribution: [
              { $group: { _id: '$rooms', count: { $sum: 1 } } },
              { $sort: { _id: 1 } }
            ],
            priceRanges: [
              {
                $bucket: {
                  groupBy: '$totalPrice',
                  boundaries: [0, 2000000, 3000000, 4000000, 5000000, 10000000],
                  default: 'Other',
                  output: { count: { $sum: 1 } }
                }
              }
            ],
            areaRanges: [
              {
                $bucket: {
                  groupBy: '$area',
                  boundaries: [0, 50, 70, 100, 150, 1000],
                  default: 'Other',
                  output: { count: { $sum: 1 } }
                }
              }
            ]
          }
        }
      ]);

      const response: ApiResponse = {
        success: true,
        data: overview[0]
      };

      res.json(response);

    } catch (error) {
      logger.error('Failed to get property overview:', error);
      throw error;
    }
  });

  /**
   * Get price distribution
   */
  private async getPriceDistribution() {
    const distribution = await Property.aggregate([
      { $match: { isActive: true } },
      {
        $bucket: {
          groupBy: '$totalPrice',
          boundaries: [0, 2000000, 3000000, 4000000, 5000000, 10000000],
          default: 'Más de $10M',
          output: { count: { $sum: 1 } }
        }
      }
    ]);

    const labels = [
      'Menos de $2M',
      '$2M - $3M', 
      '$3M - $4M',
      '$4M - $5M',
      '$5M - $10M',
      'Más de $10M'
    ];

    return distribution.map((item, index) => ({
      range: labels[index] || item._id,
      count: item.count
    }));
  }

  /**
   * Get area distribution
   */
  private async getAreaDistribution() {
    const distribution = await Property.aggregate([
      { $match: { isActive: true } },
      {
        $bucket: {
          groupBy: '$area',
          boundaries: [0, 50, 70, 100, 150, 1000],
          default: 'Más de 1000m²',
          output: { count: { $sum: 1 } }
        }
      }
    ]);

    const labels = [
      'Menos de 50m²',
      '50-70m²',
      '70-100m²', 
      '100-150m²',
      '150-1000m²',
      'Más de 1000m²'
    ];

    return distribution.map((item, index) => ({
      range: labels[index] || item._id,
      count: item.count
    }));
  }

  /**
   * Get recent activity
   */
  private async getRecentActivity() {
    const recentProperties = await Property.find({ isActive: true })
      .sort({ scrapedDate: -1 })
      .limit(10)
      .select('source scrapedDate title');

    return recentProperties.map(prop => ({
      type: 'scraping' as const,
      message: `Nueva propiedad encontrada en ${prop.source}: ${prop.title.substring(0, 50)}...`,
      timestamp: prop.scrapedDate
    }));
  }
}
