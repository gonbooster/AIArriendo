import express from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { ApiResponse } from '../core/types';

const router = express.Router();

// Mock saved searches storage
let savedSearches: any[] = [];
let favorites: string[] = [];

// Get saved searches
router.get('/saved-searches', asyncHandler(async (req, res) => {
  const response: ApiResponse = {
    success: true,
    data: savedSearches
  };

  res.json(response);
}));

// Save search
router.post('/saved-searches', asyncHandler(async (req, res) => {
  const { name, criteria } = req.body;

  if (!name || !criteria) {
    return res.status(400).json({
      success: false,
      error: 'Name and criteria are required'
    });
  }

  const savedSearch = {
    _id: Date.now().toString(),
    name,
    criteria,
    createdAt: new Date().toISOString()
  };

  savedSearches.push(savedSearch);

  const response: ApiResponse = {
    success: true,
    data: savedSearch,
    message: 'Search saved successfully'
  };

  res.json(response);
}));

// Delete saved search
router.delete('/saved-searches/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const index = savedSearches.findIndex(search => search._id === id);
  if (index === -1) {
    return res.status(404).json({
      success: false,
      error: 'Saved search not found'
    });
  }

  savedSearches.splice(index, 1);

  const response: ApiResponse = {
    success: true,
    message: 'Saved search deleted successfully'
  };

  res.json(response);
}));

// Get favorites
router.get('/favorites', asyncHandler(async (req, res) => {
  // In production, fetch actual properties from database
  const response: ApiResponse = {
    success: true,
    data: favorites
  };

  res.json(response);
}));

// Add to favorites
router.post('/favorites', asyncHandler(async (req, res) => {
  const { propertyId } = req.body;

  if (!propertyId) {
    return res.status(400).json({
      success: false,
      error: 'Property ID is required'
    });
  }

  if (!favorites.includes(propertyId)) {
    favorites.push(propertyId);
  }

  const response: ApiResponse = {
    success: true,
    message: 'Property added to favorites'
  };

  res.json(response);
}));

// Remove from favorites
router.delete('/favorites/:propertyId', asyncHandler(async (req, res) => {
  const { propertyId } = req.params;

  const index = favorites.indexOf(propertyId);
  if (index > -1) {
    favorites.splice(index, 1);
  }

  const response: ApiResponse = {
    success: true,
    message: 'Property removed from favorites'
  };

  res.json(response);
}));

export default router;
