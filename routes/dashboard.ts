import express from 'express';
import { DashboardController } from '../controllers/DashboardController';

const router = express.Router();
const dashboardController = new DashboardController();

// Get dashboard statistics
router.get('/stats', dashboardController.getStats);

// Get price trends
router.get('/price-trends', dashboardController.getPriceTrends);

// Get neighborhood statistics
router.get('/neighborhoods', dashboardController.getNeighborhoodStats);

// Get property overview
router.get('/overview', dashboardController.getPropertyOverview);

export default router;
