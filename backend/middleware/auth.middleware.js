// middleware/auth.middleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

exports.requireSignIn = async (req, res, next) => {
  try {
    // Get token from cookies or Authorization header
    const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        error: true,
        message: 'Authentication required. Please sign in.'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Add user to request object
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({
        error: true,
        message: 'User not found. Please sign in again.'
      });
    }
    
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      error: true,
      message: 'Invalid or expired token. Please sign in again.'
    });
  }
};

// Role-based access control middleware
exports.hasRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: true,
        message: 'Authentication required'
      });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: true,
        message: 'Access denied. You do not have permission to perform this action.'
      });
    }
    
    next();
  };
};

// Check if user is task creator or admin
exports.isTaskCreatorOrAdmin = async (req, res, next) => {
  try {
    const taskId = req.params.id;
    const Task = require('../models/task.model');
    
    const task = await Task.findById(taskId);
    
    if (!task) {
      return res.status(404).json({
        error: true,
        message: 'Task not found'
      });
    }
    
    // Check if user is admin, task creator, or assigned to the task
    if (
      req.user.role === 'admin' || 
      task.createdBy.toString() === req.user._id.toString() ||
      (req.user.role === 'manager' && (task.assignedTo?.toString() === req.user._id.toString()))
    ) {
      req.task = task; // Attach task to request for easier access
      return next();
    }
    
    return res.status(403).json({
      error: true,
      message: 'Access denied. You are not authorized to modify this task.'
    });
  } catch (error) {
    return res.status(500).json({
      error: true,
      message: error.message
    });
  }
};