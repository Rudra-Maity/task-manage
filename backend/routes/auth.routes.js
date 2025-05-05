// routes/auth.routes.js
const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const { body, validationResult } = require('express-validator');
const { requireSignIn } = require('../middleware/auth.middleware');
console.log(process.env.JWT_SECRET );

const router = express.Router();

// Helper function to generate JWT token
const generateToken = (user) => {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || 'abc', {
    expiresIn: '7d' // Token expires in 7 days
  });
};

// Register a new user
router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long')
  ],
  async (req, res) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: true,
          errors: errors.array()
        });
      }

      const { name, email, password, role } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          error: true,
          message: 'Email is already registered'
        });
      }

      // Create new user
      const user = new User({
        name,
        email,
        password,
        // Only assign role if user is admin or if it's the first user (who becomes admin)
        role: (req.user?.role === 'admin' && role) ? role : undefined
      });

      await user.save();

      // Generate token
      const token = generateToken(user);

      // Set token as HTTP-only cookie
      res.cookie('token', token, {
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
      });

      // Return user without password
      return res.status(201).json({
        message: 'Registration successful',
        user: user.toPublicJSON(),
        token
      });
    } catch (error) {
      return res.status(500).json({
        error: true,
        message: error.message
      });
    }
  }
);

// Login route
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password').notEmpty().withMessage('Password is required')
  ],
  async (req, res) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: true,
          errors: errors.array()
        });
      }

      const { email, password } = req.body;

      // Find user by email
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(400).json({
          error: true,
          message: 'Invalid credentials'
        });
      }

      // Compare passwords
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(400).json({
          error: true,
          message: 'Invalid credentials'
        });
      }

      // Generate token
      const token = generateToken(user);

      // Set token as HTTP-only cookie
      res.cookie('token', token, {
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
      });

      // Return user without password
      return res.json({
        message: 'Login successful',
        user: user.toPublicJSON(),
        token
      });
    } catch (error) {
      return res.status(500).json({
        error: true,
        message: error.message
      });
    }
  }
);

// Logout route
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  return res.json({
    message: 'Logout successful'
  });
});

// Get current user
router.get('/me', requireSignIn, async (req, res) => {
  try {
    return res.json({
      user: req.user
    });
  } catch (error) {
    return res.status(500).json({
      error: true,
      message: error.message
    });
  }
});

// Update user profile
router.put('/profile', requireSignIn, async (req, res) => {
  try {
    const { name, profilePicture } = req.body;
    const user = await User.findById(req.user._id);

    if (name) user.name = name;
    if (profilePicture) user.profilePicture = profilePicture;

    await user.save();

    return res.json({
      message: 'Profile updated successfully',
      user: user.toPublicJSON()
    });
  } catch (error) {
    return res.status(500).json({
      error: true,
      message: error.message
    });
  }
});

// Change password
router.put(
  '/change-password',
  requireSignIn,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 6 })
      .withMessage('New password must be at least 6 characters long')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: true,
          errors: errors.array()
        });
      }

      const { currentPassword, newPassword } = req.body;
      const user = await User.findById(req.user._id);

      // Verify current password
      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        return res.status(400).json({
          error: true,
          message: 'Current password is incorrect'
        });
      }

      // Update password
      user.password = newPassword;
      await user.save();

      return res.json({
        message: 'Password updated successfully'
      });
    } catch (error) {
      return res.status(500).json({
        error: true,
        message: error.message
      });
    }
  }
);

module.exports = router;