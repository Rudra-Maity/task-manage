// routes/notification.routes.js
const express = require('express');
const Notification = require('../models/notification.model');
const { requireSignIn } = require('../middleware/auth.middleware');

const router = express.Router();

// Get user notifications with pagination
router.get('/', requireSignIn, async (req, res) => {
  try {
    const {
      read,
      page = 1,
      limit = 10
    } = req.query;
    
    // Build query
    const query = { recipient: req.user._id };
    
    // Filter by read status if specified
    if (read === 'true') {
      query.isRead = true;
    } else if (read === 'false') {
      query.isRead = false;
    }
    
    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get notifications
    const notifications = await Notification.find(query)
      .populate('sender', 'name email')
      .populate('relatedTask', 'title status')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    // Get total count
    const totalNotifications = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({
      recipient: req.user._id,
      isRead: false
    });
    
    return res.json({
      notifications,
      unreadCount,
      pagination: {
        total: totalNotifications,
        page: parseInt(page),
        pages: Math.ceil(totalNotifications / parseInt(limit))
      }
    });
  } catch (error) {
    return res.status(500).json({
      error: true,
      message: error.message
    });
  }
});

// Mark notification as read
router.put('/:id/read', requireSignIn, async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      recipient: req.user._id
    });
    
    if (!notification) {
      return res.status(404).json({
        error: true,
        message: 'Notification not found'
      });
    }
    
    notification.isRead = true;
    await notification.save();
    
    return res.json({
      message: 'Notification marked as read',
      notification
    });
  } catch (error) {
    return res.status(500).json({
      error: true,
      message: error.message
    });
  }
});

// Mark all notifications as read
router.put('/mark-all-read', requireSignIn, async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, isRead: false },
      { $set: { isRead: true } }
    );
    
    return res.json({
      message: 'All notifications marked as read'
    });
  } catch (error) {
    return res.status(500).json({
      error: true,
      message: error.message
    });
  }
});

// Delete notification
router.delete('/:id', requireSignIn, async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      recipient: req.user._id
    });
    
    if (!notification) {
      return res.status(404).json({
        error: true,
        message: 'Notification not found'
      });
    }
    
    await Notification.deleteOne({ _id: req.params.id });
    
    return res.json({
      message: 'Notification deleted'
    });
  } catch (error) {
    return res.status(500).json({
      error: true,
      message: error.message
    });
  }
});

// Get unread notification count
router.get('/unread-count', requireSignIn, async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      recipient: req.user._id,
      isRead: false
    });
    
    return res.json({ count });
  } catch (error) {
    return res.status(500).json({
      error: true,
      message: error.message
    });
  }
});

module.exports = router;