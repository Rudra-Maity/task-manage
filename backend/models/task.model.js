// models/task.model.js
const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: 100
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000
    },
    status: {
      type: String,
      enum: ['todo', 'in-progress', 'review', 'completed'],
      default: 'todo'
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium'
    },
    dueDate: {
      type: Date
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    tags: [{
      type: String,
      trim: true
    }],
    // For recurring tasks
    isRecurring: {
      type: Boolean,
      default: false
    },
    recurringType: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'none'],
      default: 'none'
    },
    recurringEndDate: {
      type: Date
    }
  },
  { timestamps: true }
);

// Indexes for faster queries
taskSchema.index({ title: 'text', description: 'text' });
taskSchema.index({ dueDate: 1 });
taskSchema.index({ status: 1 });
taskSchema.index({ priority: 1 });
taskSchema.index({ createdBy: 1 });
taskSchema.index({ assignedTo: 1 });

const Task = mongoose.model('Task', taskSchema);

module.exports = Task;