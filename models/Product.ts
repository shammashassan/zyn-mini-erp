// models/Product.ts

import mongoose, { Document, Schema, models, model, Query } from 'mongoose';

export interface IProduct extends Document {
  _id: string;
  name: string;
  type: string;
  price: number;
  
  // Soft delete fields
  isDeleted: boolean;
  deletedAt: Date | null;
  deletedBy: string | null;
  
  createdAt: Date;
  updatedAt: Date;
}

const productSchema: Schema<IProduct> = new Schema({
  name: { type: String, required: true, trim: true },
  type: { type: String, required: true, trim: true },
  price: { type: Number, required: true, min: 0 },
  
  // Soft delete fields
  isDeleted: { type: Boolean, default: false, index: true },
  deletedAt: { type: Date, default: null },
  deletedBy: { type: String, default: null },
}, {
  timestamps: true,
});

// Index for efficient querying of active records
productSchema.index({ isDeleted: 1, createdAt: -1 });

// Add a pre-find hook to exclude soft-deleted records by default
// This can be overridden with .setOptions({ includeDeleted: true })
productSchema.pre(/^find/, function(this: Query<any, any>, next) {
  const options = this.getOptions();
  
  // Only filter out deleted items if includeDeleted is not explicitly set to true
  if (!options.includeDeleted) {
    // Use find() method instead of where()
    this.find({ isDeleted: false });
  }
  
  next();
});

const Product = models.Product || model<IProduct>('Product', productSchema);

export default Product;