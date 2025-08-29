import mongoose, { Schema, Document } from 'mongoose';
import { Property as IProperty } from '../core/types';

export interface PropertyDocument extends Omit<IProperty, 'id'>, Document {}

const LocationSchema = new Schema({
  address: { type: String, required: true },
  neighborhood: { type: String },
  street: { type: Number },
  carrera: { type: Number },
  coordinates: {
    lat: { type: Number },
    lng: { type: Number }
  },
  zone: { type: String }
}, { _id: false });

const ContactInfoSchema = new Schema({
  phone: { type: String },
  email: { type: String },
  agent: { type: String }
}, { _id: false });

const PriceHistorySchema = new Schema({
  price: { type: Number, required: true },
  adminFee: { type: Number, required: true },
  date: { type: Date, default: Date.now }
}, { _id: false });

const PropertySchema = new Schema({
  id: { 
    type: String, 
    required: true, 
    unique: true,
    index: true 
  },
  source: { 
    type: String, 
    required: true,
    index: true 
  },
  title: { 
    type: String, 
    required: true,
    text: true // Enable text search
  },
  price: { 
    type: Number, 
    required: true,
    index: true 
  },
  adminFee: { 
    type: Number, 
    required: true 
  },
  totalPrice: { 
    type: Number, 
    required: true,
    index: true 
  },
  area: { 
    type: Number, 
    required: true,
    index: true 
  },
  rooms: { 
    type: Number, 
    required: true,
    index: true 
  },
  bathrooms: { type: Number },
  location: { 
    type: LocationSchema, 
    required: true 
  },
  amenities: [{ 
    type: String,
    index: true 
  }],
  description: { 
    type: String,
    text: true // Enable text search
  },
  images: [{ type: String }],
  url: { 
    type: String, 
    required: true,
    unique: true 
  },
  contactInfo: ContactInfoSchema,
  publishedDate: { type: Date },
  scrapedDate: { 
    type: Date, 
    default: Date.now,
    index: true 
  },
  pricePerM2: { 
    type: Number, 
    required: true,
    index: true 
  },
  score: { type: Number },
  preferenceMatches: [{ type: String }],
  isActive: { 
    type: Boolean, 
    default: true,
    index: true 
  },
  priceHistory: [PriceHistorySchema]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
PropertySchema.index({ source: 1, isActive: 1 });
PropertySchema.index({ totalPrice: 1, area: 1, rooms: 1 });
PropertySchema.index({ 'location.neighborhood': 1 });
PropertySchema.index({ 'location.street': 1, 'location.carrera': 1 });
PropertySchema.index({ scrapedDate: -1 });
PropertySchema.index({ score: -1 });

// Text index for search
PropertySchema.index({ 
  title: 'text', 
  description: 'text',
  'location.address': 'text',
  'location.neighborhood': 'text'
});

// Virtual for age in days
PropertySchema.virtual('ageInDays').get(function(this: PropertyDocument) {
  if (!this.publishedDate) return null;
  const now = new Date();
  const published = new Date(this.publishedDate);
  return Math.floor((now.getTime() - published.getTime()) / (1000 * 60 * 60 * 24));
});

// Pre-save middleware to update totalPrice and pricePerM2
PropertySchema.pre('save', function(this: PropertyDocument, next) {
  this.totalPrice = this.price + this.adminFee;
  this.pricePerM2 = Math.round(this.price / this.area);
  next();
});

// Static methods
PropertySchema.statics.findBySource = function(source: string) {
  return this.find({ source, isActive: true });
};

PropertySchema.statics.findInPriceRange = function(minPrice: number, maxPrice: number) {
  return this.find({ 
    totalPrice: { $gte: minPrice, $lte: maxPrice },
    isActive: true 
  });
};

PropertySchema.statics.findByLocation = function(criteria: any) {
  const query: any = { isActive: true };
  
  if (criteria.neighborhoods && criteria.neighborhoods.length > 0) {
    query['location.neighborhood'] = { $in: criteria.neighborhoods };
  }
  
  if (criteria.minStreet && criteria.maxStreet) {
    query['location.street'] = { 
      $gte: criteria.minStreet, 
      $lte: criteria.maxStreet 
    };
  }
  
  if (criteria.minCarrera && criteria.maxCarrera) {
    query['location.carrera'] = { 
      $gte: criteria.minCarrera, 
      $lte: criteria.maxCarrera 
    };
  }
  
  return this.find(query);
};

export const Property = mongoose.model<PropertyDocument>('Property', PropertySchema);
