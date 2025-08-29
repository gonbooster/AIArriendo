import express, { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { Property } from '../models/Property';
import { ApiResponse } from '../core/types';
import { logger } from '../utils/logger';

const router = express.Router();

// Get property by ID
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const property = await Property.findOne({
    $or: [
      { _id: id },
      { id: id }
    ],
    isActive: true
  }).lean();

  if (!property) {
    return res.status(404).json({
      success: false,
      error: 'Property not found'
    });
  }

  const response: ApiResponse = {
    success: true,
    data: property
  };

  res.json(response);
}));

// Get similar properties
router.get('/:id/similar', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const limit = parseInt(req.query.limit as string) || 5;

  // First, get the reference property
  const referenceProperty = await Property.findOne({
    $or: [
      { _id: id },
      { id: id }
    ],
    isActive: true
  }).lean();

  if (!referenceProperty) {
    return res.status(404).json({
      success: false,
      error: 'Reference property not found'
    });
  }

  // Find similar properties based on:
  // 1. Same number of rooms or ±1
  // 2. Similar area (±20%)
  // 3. Similar price range (±30%)
  // 4. Same neighborhood if available
  const areaRange = referenceProperty.area * 0.2;
  const priceRange = referenceProperty.totalPrice * 0.3;

  const query: any = {
    isActive: true,
    id: { $ne: referenceProperty.id }, // Exclude the reference property
    rooms: {
      $gte: Math.max(1, referenceProperty.rooms - 1),
      $lte: referenceProperty.rooms + 1
    },
    area: {
      $gte: referenceProperty.area - areaRange,
      $lte: referenceProperty.area + areaRange
    },
    totalPrice: {
      $gte: referenceProperty.totalPrice - priceRange,
      $lte: referenceProperty.totalPrice + priceRange
    }
  };

  // Prefer same neighborhood
  if (referenceProperty.location.neighborhood) {
    query['location.neighborhood'] = referenceProperty.location.neighborhood;
  }

  let similarProperties = await Property.find(query)
    .sort({ score: -1 })
    .limit(limit)
    .lean();

  // If not enough results, expand search without neighborhood filter
  if (similarProperties.length < limit && referenceProperty.location.neighborhood) {
    const additionalQuery = { ...query };
    delete additionalQuery['location.neighborhood'];
    
    const additionalProperties = await Property.find(additionalQuery)
      .sort({ score: -1 })
      .limit(limit - similarProperties.length)
      .lean();

    similarProperties = [...similarProperties, ...additionalProperties];
  }

  const response: ApiResponse = {
    success: true,
    data: similarProperties
  };

  res.json(response);
}));

// Get properties by source
router.get('/source/:source', asyncHandler(async (req: Request, res: Response) => {
  const { source } = req.params;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;

  const query = {
    source,
    isActive: true
  };

  const total = await Property.countDocuments(query);
  const properties = await Property.find(query)
    .sort({ scrapedDate: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  const response: ApiResponse = {
    success: true,
    data: {
      properties,
      total,
      page,
      limit
    },
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };

  res.json(response);
}));

// Get property statistics
router.get('/stats/overview', asyncHandler(async (req: Request, res: Response) => {
  const stats = await Property.aggregate([
    { $match: { isActive: true } },
    {
      $group: {
        _id: null,
        totalProperties: { $sum: 1 },
        averagePrice: { $avg: '$price' },
        averagePricePerM2: { $avg: '$pricePerM2' },
        averageArea: { $avg: '$area' },
        minPrice: { $min: '$totalPrice' },
        maxPrice: { $max: '$totalPrice' },
        minArea: { $min: '$area' },
        maxArea: { $max: '$area' }
      }
    }
  ]);

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

  const response: ApiResponse = {
    success: true,
    data: {
      overview: stats[0] || {
        totalProperties: 0,
        averagePrice: 0,
        averagePricePerM2: 0,
        averageArea: 0,
        minPrice: 0,
        maxPrice: 0,
        minArea: 0,
        maxArea: 0
      },
      sourceStats: sourceStats.map(stat => ({
        source: stat._id,
        count: stat.count,
        averagePrice: stat.averagePrice,
        lastUpdate: stat.lastUpdate
      }))
    }
  };

  res.json(response);
}));

// Get neighborhoods
router.get('/meta/neighborhoods', asyncHandler(async (req: Request, res: Response) => {
  const neighborhoods = await Property.distinct('location.neighborhood', {
    'location.neighborhood': { $exists: true, $ne: null },
    isActive: true
  });

  const response: ApiResponse<string[]> = {
    success: true,
    data: neighborhoods.sort()
  };

  res.json(response);
}));

// Get amenities
router.get('/meta/amenities', asyncHandler(async (req: Request, res: Response) => {
  const amenities = await Property.distinct('amenities', {
    amenities: { $exists: true, $not: { $size: 0 } },
    isActive: true
  });

  const response: ApiResponse<string[]> = {
    success: true,
    data: amenities.sort()
  };

  res.json(response);
}));

export default router;
