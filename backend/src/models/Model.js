/**
 * AI Model schema
 */

const mongoose = require('mongoose');

const ModelSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a model name'],
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Please add a description'],
    },
    version: {
      type: String,
      required: [true, 'Please add a version'],
      default: '1.0.0',
    },
    type: {
      type: String,
      enum: ['text', 'image', 'code', 'audio', 'vision', 'multimodal'],
      required: true,
    },
    capabilities: [String],
    parameters: {
      type: Object,
      default: {},
    },
    pricing: {
      type: Object,
      default: {
        input: 0,
        output: 0,
        unit: 'per 1000 tokens',
      },
    },
    trainingData: {
      type: String,
      required: false,
    },
    maxTokens: {
      type: Number,
      default: 2048,
    },
    releaseDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['alpha', 'beta', 'general availability', 'deprecated'],
      default: 'general availability',
    },
    isPublic: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Create index for search
ModelSchema.index({ name: 'text', description: 'text' });

// Create Model model
const Model = mongoose.model('Model', ModelSchema);

module.exports = Model;
