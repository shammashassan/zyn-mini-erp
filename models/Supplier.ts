// models/Supplier.ts - UPDATED: Only name is required

import mongoose, { Document, Schema, models, model, Query } from 'mongoose';

export interface ISupplier extends Document {
  _id: string;
  name: string;
  email?: string;
  vatNumber?: string;
  district?: string;
  city?: string;
  street?: string;
  buildingNo?: string;
  postalCode?: string;
  contactNumbers: string[];
  isDeleted: boolean;
  deletedAt: Date | null;
  deletedBy: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const SupplierSchema: Schema<ISupplier> = new Schema({
  name: { 
    type: String, 
    required: true,
    trim: true,
    index: true
  },
  email: { 
    type: String, 
    required: false,
    trim: true,
    lowercase: true
  },
  vatNumber: { 
    type: String, 
    required: false,
    trim: true
  },
  district: { 
    type: String, 
    required: false,
    trim: true
  },
  city: { 
    type: String, 
    required: false,
    trim: true
  },
  street: { 
    type: String, 
    required: false,
    trim: true
  },
  buildingNo: { 
    type: String, 
    required: false,
    trim: true
  },
  postalCode: { 
    type: String, 
    required: false,
    trim: true
  },
  contactNumbers: { 
    type: [String], 
    default: [] 
  },
  isDeleted: { 
    type: Boolean, 
    default: false,
    index: true
  },
  deletedAt: { 
    type: Date, 
    default: null 
  },
  deletedBy: { 
    type: String, 
    default: null 
  },
  createdBy: { 
    type: String, 
    default: null 
  },
  updatedBy: { 
    type: String, 
    default: null 
  },
}, { 
  timestamps: true 
});

// Indexes for better query performance
SupplierSchema.index({ name: 1, isDeleted: 1 });
SupplierSchema.index({ isDeleted: 1, createdAt: -1 });

// Pre-find hook to exclude soft-deleted records by default
SupplierSchema.pre(/^find/, function(this: Query<any, any>, next) {
  const options = this.getOptions();
  
  // Only apply filter if includeDeleted is not explicitly set
  if (!options.includeDeleted) {
    this.find({ isDeleted: false });
  }
  
  next();
});

const Supplier = models.Supplier || model<ISupplier>('Supplier', SupplierSchema);

export default Supplier;