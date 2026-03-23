// models/ChartOfAccount.ts

import mongoose, { Document, Schema, models, model, Query } from 'mongoose';

export interface IChartOfAccount extends Document<string> {
  accountCode: string;
  accountName: string;
  groupName: 'Assets' | 'Liabilities' | 'Equity' | 'Income' | 'Expenses';
  subGroup: string;
  nature: 'debit' | 'credit';
  description?: string;
  isActive: boolean;
  
  // Soft delete fields
  isDeleted: boolean;
  deletedAt: Date | null;
  deletedBy: string | null;
  
  // Audit fields
  createdBy: string | null;
  updatedBy: string | null;
  
  createdAt: Date;
  updatedAt: Date;
}

const ChartOfAccountSchema: Schema<IChartOfAccount> = new Schema({
  accountCode: { 
    type: String, 
    required: true, 
    // unique: true, 
    trim: true,
    uppercase: true,
    validate: {
      validator: function(v: string) {
        return /^[A-Z0-9]{3,10}$/.test(v);
      },
      message: 'Account code must be 3-10 alphanumeric characters'
    }
  },
  accountName: { 
    type: String, 
    required: true, 
    trim: true,
    maxlength: [100, 'Account name cannot exceed 100 characters']
  },
  groupName: { 
    type: String, 
    required: true,
    enum: ['Assets', 'Liabilities', 'Equity', 'Income', 'Expenses']
  },
  subGroup: { 
    type: String, 
    required: true, 
    trim: true,
    maxlength: [100, 'Subgroup name cannot exceed 100 characters']
  },
  nature: { 
    type: String, 
    required: true,
    enum: ['debit', 'credit']
  },
  description: { 
    type: String, 
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  isActive: { 
    type: Boolean, 
    default: true,
    index: true
  },
  
  // Soft delete fields
  isDeleted: { type: Boolean, default: false, index: true },
  deletedAt: { type: Date, default: null },
  deletedBy: { type: String, default: null },
  
  // Audit fields
  createdBy: { type: String, default: null },
  updatedBy: { type: String, default: null },
}, { 
  timestamps: true 
});

// Indexes for efficient querying
ChartOfAccountSchema.index({ accountCode: 1 }, { unique: true });
ChartOfAccountSchema.index({ groupName: 1, subGroup: 1 });
ChartOfAccountSchema.index({ isActive: 1, isDeleted: 1 });
ChartOfAccountSchema.index({ createdAt: -1 });

// Text index for search
ChartOfAccountSchema.index({ 
  accountCode: 'text', 
  accountName: 'text', 
  subGroup: 'text',
  description: 'text'
});

// Pre-find hook to exclude soft-deleted records by default
ChartOfAccountSchema.pre(/^find/, function(this: Query<any, any>, next) {
  const options = this.getOptions();
  
  if (!options.includeDeleted) {
    this.find({ isDeleted: false });
  }
  
  next();
});

// Virtual for formatted display
ChartOfAccountSchema.virtual('displayName').get(function() {
  return `${this.accountCode} - ${this.accountName}`;
});

// Static methods
ChartOfAccountSchema.statics.getActiveAccounts = function() {
  return this.find({ isActive: true, isDeleted: false }).sort({ accountCode: 1 });
};

ChartOfAccountSchema.statics.getAccountsByGroup = function(groupName: string) {
  return this.find({ 
    groupName, 
    isActive: true, 
    isDeleted: false 
  }).sort({ accountCode: 1 });
};

ChartOfAccountSchema.statics.getAccountsBySubGroup = function(subGroup: string) {
  return this.find({ 
    subGroup, 
    isActive: true, 
    isDeleted: false 
  }).sort({ accountCode: 1 });
};

const ChartOfAccount = models.ChartOfAccount || model<IChartOfAccount>('ChartOfAccount', ChartOfAccountSchema);

export default ChartOfAccount;

// Types for API responses and forms
export interface ChartOfAccountFormData {
  accountCode: string;
  accountName: string;
  groupName: 'Assets' | 'Liabilities' | 'Equity' | 'Income' | 'Expenses';
  subGroup: string;
  nature: 'debit' | 'credit';
  description?: string;
  isActive: boolean;
}

export interface AccountGroupData {
  groupName: string;
  subGroups: string[];
  accountCount: number;
}

export interface SubGroupData {
  subGroup: string;
  groupName: string;
  accounts: IChartOfAccount[];
  totalAccounts: number;
}