// models/Payee.ts

import mongoose, { Document, Schema, models, model, Query } from 'mongoose';

export interface IPayee extends Document {
  _id: string;
  name: string;
  type: 'employee' | 'landlord' | 'consultant' | 'restaurant' | 'vendor' | 'contractor' | 'utility_company' | 'service_provider' | 'government' | 'miscellaneous' | 'individual';
  email?: string;
  phone?: string;
  address?: string;
  taxId?: string; // For tax purposes
  notes?: string;
  
  // Soft delete fields
  isDeleted: boolean;
  deletedAt: Date | null;
  deletedBy: string | null;
  
  createdAt: Date;
  updatedAt: Date;
}

const PayeeSchema: Schema<IPayee> = new Schema({
  name: { type: String, required: true, trim: true },
  type: { 
    type: String, 
    required: true,
    enum: [
      'employee',
      'landlord', 
      'consultant',
      'restaurant',
      'vendor',
      'contractor',
      'utility_company',
      'service_provider',
      'government',
      'miscellaneous',
      'individual'
    ]
  },
  email: { type: String, trim: true, lowercase: true },
  phone: { type: String, trim: true },
  address: { type: String, trim: true },
  taxId: { type: String, trim: true },
  notes: { type: String, trim: true },
  
  // Soft delete fields
  isDeleted: { type: Boolean, default: false, index: true },
  deletedAt: { type: Date, default: null },
  deletedBy: { type: String, default: null },
}, {
  timestamps: true,
});

// Index for efficient querying of active records
PayeeSchema.index({ isDeleted: 1, createdAt: -1 });
PayeeSchema.index({ type: 1 });
PayeeSchema.index({ name: 1 });

// Add a pre-find hook to exclude soft-deleted records by default
PayeeSchema.pre(/^find/, function(this: Query<any, any>, next) {
  const options = this.getOptions();
  
  if (!options.includeDeleted) {
    this.find({ isDeleted: false });
  }
  
  next();
});

const Payee = models.Payee || model<IPayee>('Payee', PayeeSchema);

export default Payee;