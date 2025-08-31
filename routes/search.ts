import express from 'express';
import { SearchController } from '../controllers/SearchController';

const router = express.Router();
const searchController = new SearchController();

// Search properties
router.post('/', searchController.search);



// Get available sources
router.get('/sources', searchController.getSources);

// Get recommendations
router.post('/recommendations', searchController.getRecommendations);

// Get single property by ID
router.get('/property/:id', searchController.getProperty);

// Get similar properties
router.get('/similar/:propertyId', searchController.getSimilarProperties);

// 🚀 Smart location search
router.get('/location/search', searchController.smartLocationSearch);

// Get search suggestions (for autocomplete)
router.get('/suggestions', searchController.getSearchSuggestions);

// (Removed) test-mock endpoint - using real data only

export default router;
