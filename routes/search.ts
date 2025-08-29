import express from 'express';
import { SearchController } from '../controllers/SearchController';

const router = express.Router();
const searchController = new SearchController();

// Search properties
router.post('/', searchController.search);

// Start scraping
router.post('/scrape/start', searchController.startScraping);

// Get scraping status
router.get('/scrape/status', searchController.getScrapingStatus);

// Stop scraping job
router.post('/scrape/stop/:jobId', searchController.stopScraping);

// Get available sources
router.get('/sources', searchController.getSources);

// Get recommendations
router.post('/recommendations', searchController.getRecommendations);

// Get similar properties
router.get('/similar/:propertyId', searchController.getSimilarProperties);

// Get search suggestions (for autocomplete)
router.get('/suggestions', searchController.getSearchSuggestions);

// (Removed) test-mock endpoint - using real data only

export default router;
