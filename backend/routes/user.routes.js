// routes/user.routes.js
const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/user.model');
const Task = require('../models/task.model');
const { requireSignIn, hasRole } = require('../middleware/auth.middleware');

const router = express.Router();

// Get all users (admin and manager only)
router.get('/', requireSignIn, async (req, res) => {
  try {
    const { search, role, page = 1, limit = 10 } = req.query;
    let query = {};
    
    // Apply filters
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (role) query.role = role;
    
    // Managers can only see regular users, not other managers or admins
    if (req.user.role === 'manager') {
      query.role = 'user';
    }
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Execute query with pagination
    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    // Get total count for pagination
    const totalUsers = await User.countDocuments(query);
    
    return res.json({
      users,
      pagination: {
        total: totalUsers,
        page: parseInt(page),
        pages: Math.ceil(totalUsers / parseInt(limit))
      }
    });
  } catch (error) {
    return res.status(500).json({
      error: true,
      message: error.message
    });
  }
});

// Get user by ID
router.get('/:id', requireSignIn, hasRole('admin', 'manager'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        error: true,
        message: 'User not found'
      });
    }
    
    // Managers can only view regular users
    if (req.user.role === 'manager' && user.role !== 'user') {
      return res.status(403).json({
        error: true,
        message: 'Access denied'
      });
    }
    
    return res.json({ user });
  } catch (error) {
    return res.status(500).json({
      error: true,
      message: error.message
    });
  }
});

// Update user role (admin only)
router.put(
  '/:id/role',
  requireSignIn,
  hasRole('admin'),
  [body('role').isIn(['admin', 'manager', 'user']).withMessage('Invalid role')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: true,
          errors: errors.array()
        });
      }

      const { role } = req.body;
      const user = await User.findById(req.params.id);

      if (!user) {
        return res.status(404).json({
          error: true,
          message: 'User not found'
        });
      }

      // Prevent users from changing their own role
      if (user._id.toString() === req.user._id.toString()) {
        return res.status(400).json({
          error: true,
          message: 'You cannot change your own role'
        });
      }

      user.role = role;
      await user.save();

      return res.json({
        message: `User role updated to ${role} successfully`,
        user: user.toPublicJSON()
      });
    } catch (error) {
      return res.status(500).json({
        error: true,
        message: error.message
      });
    }
  }
);

// Get user statistics (admin and manager)
router.get('/:id/stats', requireSignIn, hasRole('admin', 'manager'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        error: true,
        message: 'User not found'
      });
    }
    
    // Managers can only view regular users' stats
    if (req.user.role === 'manager' && user.role !== 'user') {
      return res.status(403).json({
        error: true,
        message: 'Access denied'
      });
    }
    
    // Get task statistics
    const totalTasksCreated = await Task.countDocuments({ createdBy: user._id });
    const totalTasksAssigned = await Task.countDocuments({ assignedTo: user._id });
    const tasksCompleted = await Task.countDocuments({ 
      assignedTo: user._id,
      status: 'completed'
    });
    const tasksInProgress = await Task.countDocuments({ 
      assignedTo: user._id,
      status: 'in-progress'
    });
    const tasksPending = await Task.countDocuments({ 
      assignedTo: user._id,
      status: 'todo'
    });
    const tasksOverdue = await Task.countDocuments({
      assignedTo: user._id,
      dueDate: { $lt: new Date() },
      status: { $ne: 'completed' }
    });
    
    // Get high priority tasks
    const highPriorityTasks = await Task.countDocuments({
      assignedTo: user._id,
      priority: { $in: ['high', 'urgent'] },
      status: { $ne: 'completed' }
    });
    
    return res.json({
      user: user.toPublicJSON(),
      stats: {
        totalTasksCreated,
        totalTasksAssigned,
        tasksCompleted,
        tasksInProgress,
        tasksPending,
        tasksOverdue,
        highPriorityTasks,
        completionRate: totalTasksAssigned > 0 
          ? (tasksCompleted / totalTasksAssigned * 100).toFixed(2) 
          : 0
      }
    });
  } catch (error) {
    return res.status(500).json({
      error: true,
      message: error.message
    });
  }
});

// Disable/enable user account (admin only)
router.put('/:id/status', requireSignIn, hasRole('admin'), async (req, res) => {
  try {
    const { active } = req.body;
    
    if (typeof active !== 'boolean') {
      return res.status(400).json({
        error: true,
        message: 'Active status must be a boolean'
      });
    }
    
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        error: true,
        message: 'User not found'
      });
    }
    
    // Prevent users from deactivating themselves
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        error: true,
        message: 'You cannot change your own account status'
      });
    }
    
    user.active = active;
    await user.save();
    
    return res.json({
      message: `User ${active ? 'activated' : 'deactivated'} successfully`,
      user: user.toPublicJSON()
    });
  } catch (error) {
    return res.status(500).json({
      error: true,
      message: error.message
    });
  }
});

// Get users for task assignment (lightweight endpoint)
router.get('/options/assignment', requireSignIn, async (req, res) => {
  try {
    // Return only active users with minimal fields
    const users = await User.find({ active: true })
      .select('_id name email role')
      .sort({ name: 1 });
    
    return res.json({ users });
  } catch (error) {
    return res.status(500).json({
      error: true,
      message: error.message
    });
  }
});



module.exports = router;  