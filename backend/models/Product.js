const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  artisan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [100, 'Product name cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Product description is required'],
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  price: {
    type: Number,
    required: [true, 'Product price is required'],
    min: [0, 'Price cannot be negative']
  },
  currency: {
    type: String,
    default: 'INR',
    enum: ['INR', 'USD', 'EUR', 'GBP']
  },
  images: [{
    url: {
      type: String,
      required: true
    },
    publicId: String,
    isPrimary: {
      type: Boolean,
      default: false
    }
  }],
  category: {
    type: String,
    required: [true, 'Product category is required'],
    enum: [
      'fashion', 'jewelry', 'home', 'art', 'crafts', 
      'beauty', 'electronics', 'books', 'food', 'other'
    ]
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [30, 'Tag cannot exceed 30 characters']
  }],
  stock: {
    type: Number,
    default: 0,
    min: [0, 'Stock cannot be negative']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  dimensions: {
    length: Number,
    width: Number,
    height: Number,
    unit: {
      type: String,
      enum: ['cm', 'in', 'm'],
      default: 'cm'
    }
  },
  weight: {
    value: Number,
    unit: {
      type: String,
      enum: ['g', 'kg', 'lb', 'oz'],
      default: 'g'
    }
  },
  shipping: {
    free: {
      type: Boolean,
      default: false
    },
    cost: {
      type: Number,
      default: 0
    },
    estimatedDays: {
      type: Number,
      default: 7
    }
  },
  // Meme generation related
  memes: [{
    templateId: String,
    caption: String,
    imageUrl: String,
    publicId: String,
    status: {
      type: String,
      enum: ['generated', 'approved', 'rejected', 'posted'],
      default: 'generated'
    },
    generatedAt: {
      type: Date,
      default: Date.now
    },
    approvedAt: Date,
    postedAt: Date,
    instagramPostId: String,
    analytics: {
      likes: { type: Number, default: 0 },
      comments: { type: Number, default: 0 },
      shares: { type: Number, default: 0 },
      reach: { type: Number, default: 0 },
      impressions: { type: Number, default: 0 }
    }
  }],
  // SEO and marketing
  seoTitle: String,
  seoDescription: String,
  metaKeywords: [String],
  // Analytics
  views: {
    type: Number,
    default: 0
  },
  likes: {
    type: Number,
    default: 0
  },
  shares: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes for better query performance
productSchema.index({ artisan: 1 });
productSchema.index({ category: 1 });
productSchema.index({ isActive: 1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ price: 1 });
productSchema.index({ tags: 1 });
productSchema.index({ 'memes.status': 1 });

// Virtual for primary image
productSchema.virtual('primaryImage').get(function() {
  const primary = this.images.find(img => img.isPrimary);
  return primary || this.images[0] || null;
});

// Virtual for average rating (if we add reviews later)
productSchema.virtual('averageRating').get(function() {
  // This would be calculated from reviews if we add them
  return 0;
});

// Method to increment views
productSchema.methods.incrementViews = function() {
  this.views += 1;
  return this.save();
};

// Method to update meme analytics
productSchema.methods.updateMemeAnalytics = function(memeIndex, analytics) {
  if (this.memes[memeIndex]) {
    this.memes[memeIndex].analytics = {
      ...this.memes[memeIndex].analytics,
      ...analytics
    };
    return this.save();
  }
  throw new Error('Meme not found');
};

// Method to get active memes
productSchema.methods.getActiveMemes = function() {
  return this.memes.filter(meme => 
    meme.status === 'approved' || meme.status === 'posted'
  );
};

// Static method to get products by artisan
productSchema.statics.getByArtisan = function(artisanId, options = {}) {
  const query = { artisan: artisanId };
  if (options.isActive !== undefined) {
    query.isActive = options.isActive;
  }
  return this.find(query).sort({ createdAt: -1 });
};

// Static method to search products
productSchema.statics.search = function(searchTerm, filters = {}) {
  const query = { isActive: true };
  
  if (searchTerm) {
    query.$or = [
      { name: { $regex: searchTerm, $options: 'i' } },
      { description: { $regex: searchTerm, $options: 'i' } },
      { tags: { $in: [new RegExp(searchTerm, 'i')] } }
    ];
  }
  
  if (filters.category) {
    query.category = filters.category;
  }
  
  if (filters.minPrice || filters.maxPrice) {
    query.price = {};
    if (filters.minPrice) query.price.$gte = filters.minPrice;
    if (filters.maxPrice) query.price.$lte = filters.maxPrice;
  }
  
  return this.find(query).sort({ createdAt: -1 });
};

module.exports = mongoose.model('Product', productSchema);
