// models/Customer.ts

import mongoose, { Document, Schema, models, model, Query } from 'mongoose';

export interface ICustomer extends Document {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  
  // Soft delete fields
  isDeleted: boolean;
  deletedAt: Date | null;
  deletedBy: string | null;
  
  createdAt: Date;
  updatedAt: Date;
}

const CustomerSchema: Schema<ICustomer> = new Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, trim: true },
  phone: { type: String, trim: true },
  address: { type: String, trim: true },
  
  // Soft delete fields
  isDeleted: { type: Boolean, default: false, index: true },
  deletedAt: { type: Date, default: null },
  deletedBy: { type: String, default: null },
}, {
  timestamps: true,
});

// Index for efficient querying of active records
CustomerSchema.index({ isDeleted: 1, createdAt: -1 });

// Add a pre-find hook to exclude soft-deleted records by default
// This can be overridden with .setOptions({ includeDeleted: true })
CustomerSchema.pre(/^find/, function(this: Query<any, any>, next) {
  const options = this.getOptions();
  
  // Only filter out deleted items if includeDeleted is not explicitly set to true
  if (!options.includeDeleted) {
    this.find({ isDeleted: false });
  }
  
  next();
});

const Customer = models.Customer || model<ICustomer>('Customer', CustomerSchema);

export default Customer;