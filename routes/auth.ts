import express, { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { ApiResponse } from '../core/types';

const router = express.Router();

// Mock authentication (implement real auth in production)
router.post('/login', asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  // Mock validation
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: 'Email and password are required'
    });
  }

  // Mock user
  const user = {
    id: '1',
    email,
    name: 'Demo User'
  };

  const response: ApiResponse = {
    success: true,
    data: {
      user,
      token: 'mock-jwt-token'
    },
    message: 'Login successful'
  };

  res.json(response);
}));

router.post('/register', asyncHandler(async (req: Request, res: Response) => {
  const { email, password, name } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({
      success: false,
      error: 'Email, password, and name are required'
    });
  }

  const user = {
    id: '1',
    email,
    name
  };

  const response: ApiResponse = {
    success: true,
    data: {
      user,
      token: 'mock-jwt-token'
    },
    message: 'Registration successful'
  };

  res.json(response);
}));

router.post('/logout', asyncHandler(async (req: Request, res: Response) => {
  const response: ApiResponse = {
    success: true,
    message: 'Logout successful'
  };

  res.json(response);
}));

export default router;
