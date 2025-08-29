import express, { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { ApiResponse } from '../core/types';

const router = express.Router();

// Mock alerts storage
let alerts: any[] = [];

// Get alerts
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const response: ApiResponse = {
    success: true,
    data: alerts
  };

  res.json(response);
}));

// Create alert
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const { name, searchCriteria, frequency = 'daily' } = req.body;

  if (!name || !searchCriteria) {
    return res.status(400).json({
      success: false,
      error: 'Name and search criteria are required'
    });
  }

  const alert = {
    _id: Date.now().toString(),
    name,
    searchCriteria,
    frequency,
    isActive: true,
    createdAt: new Date().toISOString()
  };

  alerts.push(alert);

  const response: ApiResponse = {
    success: true,
    data: alert,
    message: 'Alert created successfully'
  };

  res.json(response);
}));

// Update alert
router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = req.body;

  const alertIndex = alerts.findIndex(alert => alert._id === id);
  if (alertIndex === -1) {
    return res.status(404).json({
      success: false,
      error: 'Alert not found'
    });
  }

  alerts[alertIndex] = { ...alerts[alertIndex], ...updates };

  const response: ApiResponse = {
    success: true,
    data: alerts[alertIndex],
    message: 'Alert updated successfully'
  };

  res.json(response);
}));

// Delete alert
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const alertIndex = alerts.findIndex(alert => alert._id === id);
  if (alertIndex === -1) {
    return res.status(404).json({
      success: false,
      error: 'Alert not found'
    });
  }

  alerts.splice(alertIndex, 1);

  const response: ApiResponse = {
    success: true,
    message: 'Alert deleted successfully'
  };

  res.json(response);
}));

export default router;
