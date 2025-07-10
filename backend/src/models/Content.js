/**
 * Content schema for website content management
 */

const mongoose = require('mongoose');

const ContentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please add a title'],
      trim: true,
      maxlength: [200, 'Title cannot be more than 200 characters'],
    },
    slug: {
      type: String,
      required: [true, 'Please add a slug'],
      unique: true,
      trim: true,
      lowercase: true,
    },
    content: {
      type: String,
      required: [true, 'Please add content'],
    },
    contentType: {
      type: String,
      enum: ['page', 'blog', 'documentation', 'news', 'feature'],
      default: 'page',
    },
    metaDescription: {
      type: String,
      maxlength: [160, 'Meta description cannot be more than 160 characters'],
    },
    metaKeywords: [String],
    featuredImage: {
      type: String,
      default: null,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
    },
    publishDate: {
      type: Date,
      default: null,
    },
    isHomepage: {
      type: Boolean,
      default: false,
    },
    order: {
      type: Number,
      default: 0,
    },
    sections: [
      {
        title: String,
        content: String,
        image: String,
        order: Number,
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Create slug from title
ContentSchema.pre('save', function (next) {
  if (this.isModified('title') && !this.isModified('slug')) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^\w ]+/g, '')
      .replace(/ +/g, '-');
  }
  next();
});

// Set publishDate when status changes to published
ContentSchema.pre('save', function (next) {
  if (this.isModified('status') && this.status === 'published' && !this.publishDate) {
    this.publishDate = Date.now();
  }
  next();
});

// Create Content model
const Content = mongoose.model('Content', ContentSchema);

module.exports = Content;
