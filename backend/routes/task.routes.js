// routes/task.routes.js
const express = require('express');
const { body, validationResult } = require('express-validator');
const Task = require('../models/task.model');
const Notification = require('../models/notification.model');
const { requireSignIn, isTaskCreatorOrAdmin, hasRole } = require('../middleware/auth.middleware');

const router = express.Router();

// Create a new notification helper function
const createNotification = async (type, sender, recipient, message, taskId) => {
  try {
    const notification = new Notification({
      type,
      sender,
      recipient,
      message,
      relatedTask: taskId,
      isRead: false
    });
    
    await notification.save();
    return notification;
  } catch (error) {
    console.error('Notification creation error:', error);
    return null;
  }
};

// Helper function to handle recurring tasks
const createRecurringTask = async (task, recurringType) => {
  try {
    // Clone the original task
    const newTaskData = {
      title: task.title,
      description: task.description,
      priority: task.priority,
      createdBy: task.createdBy,
      assignedTo: task.assignedTo,
      tags: task.tags,
      isRecurring: task.isRecurring,
      recurringType: task.recurringType,
      recurringEndDate: task.recurringEndDate
    };
    
    // Calculate new due date based on recurring type
    const originalDueDate = new Date(task.dueDate);
    let newDueDate = new Date(originalDueDate);
    
    switch (recurringType) {
      case 'daily':
        newDueDate.setDate(newDueDate.getDate() + 1);
        break;
      case 'weekly':
        newDueDate.setDate(newDueDate.getDate() + 7);
        break;
      case 'monthly':
        newDueDate.setMonth(newDueDate.getMonth() + 1);
        break;
      default:
        return null;
    }
    
    // Check if the recurring end date has been reached
    if (task.recurringEndDate && newDueDate > new Date(task.recurringEndDate)) {
      return null;
    }
    
    newTaskData.dueDate = newDueDate;
    newTaskData.status = 'todo'; // Reset status for the new task
    
    const newTask = new Task(newTaskData);
    await newTask.save();
    
    return newTask;
  } catch (error) {
    console.error('Recurring task creation error:', error);
    return null;
  }
};

// Create a new task
router.post(
  '/',
  requireSignIn,
  [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('description').optional(),
    body('status').optional().isIn(['todo', 'in-progress', 'review', 'completed']),
    body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
    body('dueDate').optional().isISO8601().toDate(),
    body('assignedTo').optional(),
    body('tags').optional().isArray(),
    body('isRecurring').optional().isBoolean(),
    body('recurringType').optional().isIn(['daily', 'weekly', 'monthly', 'none']),
    body('recurringEndDate').optional().isISO8601().toDate()
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

      const taskData = {
        ...req.body,
        createdBy: req.user._id
      };

      // Create new task
      const task = new Task(taskData);
      await task.save();

      // If task is assigned to someone, create a notification
      
      if (task.assignedTo && !task.assignedTo.equals(req.user._id)) {
        await createNotification(
          'task-assigned',
          req.user._id,
          task.assignedTo,
          `${req.user.name} assigned you a new task: ${task.title}`,
          task._id
        );
      }

      return res.status(201).json({
        message: 'Task created successfully',
        task
      });
    } catch (error) {
      return res.status(500).json({
        error: true,
        message: error.message
      });
    }
  }
);

// Get all tasks with filtering and pagination
router.get('/', requireSignIn, async (req, res) => {
  try {
    let query = {};
    const {
      status,
      priority,
      dueDate,
      search,
      assignedTo,
      createdBy,
      overdue,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Apply filters if provided
    if (status) query.status = status;
    if (priority) query.priority = priority;
    
    // Search by title or description
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Filter by assigned user
    if (assignedTo === 'me') {
      query.assignedTo = req.user._id;
    } else if (assignedTo) {
      query.assignedTo = assignedTo;
    }
    
    // Filter by created user
    if (createdBy === 'me') {
      query.createdBy = req.user._id;
    } else if (createdBy) {
      query.createdBy = createdBy;
    }
    
    // Filter by due date
    if (dueDate) {
      const date = new Date(dueDate);
      const startOfDay = new Date(date.setHours(0, 0, 0, 0));
      const endOfDay = new Date(date.setHours(23, 59, 59, 999));
      query.dueDate = { $gte: startOfDay, $lte: endOfDay };
    }
    
    // Filter overdue tasks
    if (overdue === 'true') {
      query.dueDate = { $lt: new Date() };
      query.status = { $ne: 'completed' };
    }
    
    // Non-admin users can only see tasks they created or are assigned to
    if (req.user.role !== 'admin') {
      query.$or = [
        { createdBy: req.user._id },
        { assignedTo: req.user._id }
      ];
    }
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Define sort
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
    
    // Execute query with pagination
    const tasks = await Task.find(query)
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));
    
    // Get total count for pagination
    const totalTasks = await Task.countDocuments(query);
    
    return res.json({
      tasks,
      pagination: {
        total: totalTasks,
        page: parseInt(page),
        pages: Math.ceil(totalTasks / parseInt(limit))
      }
    });
  } catch (error) {
    return res.status(500).json({
      error: true,
      message: error.message
    });
  }
});

// Get task by ID
router.get('/:id', requireSignIn, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email');
    
    if (!task) {
      return res.status(404).json({
        error: true,
        message: 'Task not found'
      });
    }
    
    // Check if user has access to this task
    if (
      req.user.role !== 'admin' && 
      !task.createdBy._id.equals(req.user._id) && 
      !(task.assignedTo && task.assignedTo._id.equals(req.user._id))
    ) {
      return res.status(403).json({
        error: true,
        message: 'You do not have permission to view this task'
      });
    }
    
    return res.json({ task });
  } catch (error) {
    return res.status(500).json({
      error: true,
      message: error.message
    });
  }
});

// Update task
router.put(
  '/:id',
  requireSignIn,
  isTaskCreatorOrAdmin,
  [
    body('title').optional().trim().notEmpty().withMessage('Title cannot be empty'),
    body('status').optional().isIn(['todo', 'in-progress', 'review', 'completed']),
    body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
    body('dueDate').optional().isISO8601().toDate(),
    body('assignedTo').optional(),
    body('tags').optional().isArray(),
    body('isRecurring').optional().isBoolean(),
    body('recurringType').optional().isIn(['daily', 'weekly', 'monthly', 'none']),
    body('recurringEndDate').optional().isISO8601().toDate()
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

      const task = req.task; // From middleware
      const oldAssignedTo = task.assignedTo;
      
      // Update fields
      Object.keys(req.body).forEach(key => {
        if (req.body[key] !== undefined) {
          task[key] = req.body[key];
        }
      });
      
      // If status changed to completed and it's a recurring task
      const wasCompleted = req.body.status === 'completed' && 
                         task.status !== 'completed' && 
                         task.isRecurring && 
                         task.recurringType !== 'none';
      
      await task.save();
      
      // Create a notification if task was assigned to a new user
      if (
        req.body.assignedTo && 
        oldAssignedTo?.toString() !== req.body.assignedTo.toString() &&
        req.body.assignedTo.toString() !== req.user._id.toString()
      ) {
        await createNotification(
          'task-assigned',
          req.user._id,
          req.body.assignedTo,
          `${req.user.name} assigned you a task: ${task.title}`,
          task._id
        );
      }
      
      // Create a notification if task status was updated
      if (req.body.status && oldAssignedTo && !oldAssignedTo.equals(req.user._id)) {
        await createNotification(
          'task-updated',
          req.user._id,
          oldAssignedTo,
          `${req.user.name} updated the status of task "${task.title}" to ${req.body.status}`,
          task._id
        );
      }
      
      // Handle recurring task if completed
      if (wasCompleted) {
        const newTask = await createRecurringTask(task, task.recurringType);
        if (newTask && newTask.assignedTo) {
          await createNotification(
            'task-assigned',
            req.user._id,
            newTask.assignedTo,
            `A recurring task has been created: ${newTask.title}`,
            newTask._id
          );
        }
      }
      
      return res.json({
        message: 'Task updated successfully',
        task
      });
    } catch (error) {
      return res.status(500).json({
        error: true,
        message: error.message
      });
    }
  }
);

// Delete task
router.delete('/:id', requireSignIn, isTaskCreatorOrAdmin, async (req, res) => {
  try {
    const task = req.task; // From middleware
    
    // Create notification for assigned user if applicable
    if (task.assignedTo && !task.assignedTo.equals(req.user._id)) {
      await createNotification(
        'task-deleted',
        req.user._id,
        task.assignedTo,
        `${req.user.name} deleted a task that was assigned to you: ${task.title}`,
        null
      );
    }
    
    await Task.findByIdAndDelete(req.params.id);
    
    return res.json({
      message: 'Task deleted successfully'
    });
  } catch (error) {
    return res.status(500).json({
      error: true,
      message: error.message
    });
  }
});

// Batch update tasks (for admin and managers)
router.post('/batch-update', requireSignIn, hasRole('admin', 'manager'), async (req, res) => {
  try {
    const { taskIds, updates } = req.body;
    
    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
      return res.status(400).json({
        error: true,
        message: 'Task IDs array is required'
      });
    }
    
    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({
        error: true,
        message: 'Updates object is required'
      });
    }
    
    // Validate updates object
    const allowedUpdates = ['status', 'priority', 'assignedTo'];
    const updateKeys = Object.keys(updates);
    const isValidOperation = updateKeys.every(key => allowedUpdates.includes(key));
    
    if (!isValidOperation) {
      return res.status(400).json({
        error: true,
        message: 'Invalid updates. Only status, priority, and assignedTo can be batch updated.'
      });
    }
    
    // Update tasks
    const result = await Task.updateMany(
      { _id: { $in: taskIds } },
      { $set: updates }
    );
    
    // Create notifications if tasks were assigned
    if (updates.assignedTo) {
      const tasks = await Task.find({ _id: { $in: taskIds } }).select('title');
      
      for (const task of tasks) {
        await createNotification(
          'task-assigned',
          req.user._id,
          updates.assignedTo,
          `${req.user.name} assigned you a task: ${task.title}`,
          task._id
        );
      }
    }
    
    return res.json({
      message: 'Tasks updated successfully',
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    return res.status(500).json({
      error: true,
      message: error.message
    });
  }
});

module.exports = router;