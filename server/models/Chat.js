// In server/models/Chat.js
const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    default: 'New Chat',
    maxlength: 100
  },
  messages: [{
    role: {
      type: String,
      enum: ['user', 'assistant', 'system'],
      required: true
    },
    content: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    tokenCount: {
      type: Number,
      default: 0
    }
  }],
  contextWindow: {
    type: Number,
    default: 4000 // Token limit for context
  },
  model: {
    type: String,
    default: 'llama3-8b-8192'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for efficient queries
chatSchema.index({ userId: 1, createdAt: -1 });
chatSchema.index({ userId: 1, isActive: 1 });

module.exports = mongoose.model('Chat', chatSchema);