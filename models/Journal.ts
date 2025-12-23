// models/Journal.ts - UPDATED: Added Payee and Vendor party types

import mongoose, { Document, Schema, models, model, Query } from 'mongoose';

export interface IJournalEntry {
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
}

export interface IAuditEntry {
  action: string;
  userId: string | null;
  username: string | null;
  timestamp: Date;
  changes?: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
}

export interface IJournal extends Document {
  _id: string;
  journalNumber: string;
  entryDate: Date;
  referenceType: 'Invoice' | 'Receipt' | 'Payment' | 'Purchase' | 'Expense' | 'Refund' | 'Manual';
  referenceId?: string;
  referenceNumber?: string;
  
  // ✅ UPDATED: Added Payee and Vendor to party types
  partyType?: 'Customer' | 'Supplier' | 'Payee' | 'Vendor';
  partyId?: string;
  partyName?: string;
  itemType?: 'Material' | 'Product';
  itemId?: string;
  itemName?: string;
  
  narration: string;
  entries: IJournalEntry[];
  totalDebit: number;
  totalCredit: number;
  status: 'draft' | 'posted' | 'void';
  
  isDeleted: boolean;
  deletedAt: Date | null;
  deletedBy: string | null;
  
  createdBy: string | null;
  updatedBy: string | null;
  postedBy: string | null;
  postedAt: Date | null;
  actionHistory: IAuditEntry[];
  
  createdAt: Date;
  updatedAt: Date;
  
  addAuditEntry(
    action: string,
    userId?: string | null,
    username?: string | null,
    changes?: IAuditEntry['changes']
  ): void;
}

const JournalEntrySchema: Schema = new Schema({
  accountCode: { type: String, required: true, uppercase: true },
  accountName: { type: String, required: true },
  debit: { type: Number, default: 0, min: 0 },
  credit: { type: Number, default: 0, min: 0 },
}, { _id: false });

const AuditEntrySchema: Schema = new Schema({
  action: { type: String, required: true },
  userId: { type: String, default: null },
  username: { type: String, default: null },
  timestamp: { type: Date, default: Date.now },
  changes: [{
    field: { type: String },
    oldValue: { type: Schema.Types.Mixed },
    newValue: { type: Schema.Types.Mixed },
  }],
});

const JournalSchema: Schema<IJournal> = new Schema({
  journalNumber: { 
    type: String, 
    required: true, 
    unique: true,
    index: true 
  },
  entryDate: { 
    type: Date, 
    required: true,
    index: true 
  },
  referenceType: { 
    type: String, 
    enum: ['Invoice', 'Receipt', 'Payment', 'Purchase', 'Expense', 'Refund', 'Manual'],
    required: true,
    index: true 
  },
  referenceId: { 
    type: String,
    index: true 
  },
  referenceNumber: { type: String },
  
  // ✅ UPDATED: Party type enum includes Payee and Vendor
  partyType: {
    type: String,
    enum: ['Customer', 'Supplier', 'Payee', 'Vendor'],
    index: true
  },
  partyId: {
    type: String,
    index: true
  },
  partyName: {
    type: String,
    trim: true
  },
  
  itemType: {
    type: String,
    enum: ['Material', 'Product'],
    index: true
  },
  itemId: {
    type: String,
    index: true
  },
  itemName: {
    type: String,
    trim: true
  },
  
  narration: { 
    type: String, 
    required: true,
    maxlength: [500, 'Narration cannot exceed 500 characters']
  },
  entries: {
    type: [JournalEntrySchema],
    validate: {
      validator: function(entries: IJournalEntry[]) {
        return entries.length >= 2;
      },
      message: 'At least 2 journal entries are required for double-entry'
    }
  },
  totalDebit: { 
    type: Number, 
    required: true, 
    min: 0 
  },
  totalCredit: { 
    type: Number, 
    required: true, 
    min: 0 
  },
  status: { 
    type: String, 
    enum: ['draft', 'posted', 'void'],
    default: 'draft',
    index: true 
  },
  
  isDeleted: { type: Boolean, default: false, index: true },
  deletedAt: { type: Date, default: null },
  deletedBy: { type: String, default: null },
  
  createdBy: { type: String, default: null },
  updatedBy: { type: String, default: null },
  postedBy: { type: String, default: null },
  postedAt: { type: Date, default: null },
  actionHistory: [AuditEntrySchema],
}, { 
  timestamps: true 
});

// Composite indexes
JournalSchema.index({ entryDate: -1, createdAt: -1 });
JournalSchema.index({ referenceType: 1, referenceId: 1 });
JournalSchema.index({ status: 1, isDeleted: 1 });
JournalSchema.index({ 'entries.accountCode': 1 });
JournalSchema.index({ partyType: 1, partyId: 1 });
JournalSchema.index({ itemType: 1, itemId: 1 });

// Text index for search
JournalSchema.index({ 
  narration: 'text', 
  referenceNumber: 'text',
  journalNumber: 'text',
  partyName: 'text',
  itemName: 'text'
});

// Pre-save validation: Ensure balanced entry
JournalSchema.pre('save', function(next) {
  this.totalDebit = this.entries.reduce((sum, entry) => sum + entry.debit, 0);
  this.totalCredit = this.entries.reduce((sum, entry) => sum + entry.credit, 0);
  
  const difference = Math.abs(this.totalDebit - this.totalCredit);
  if (difference > 0.01) {
    next(new Error(`Journal entry is not balanced. Debit: ${this.totalDebit}, Credit: ${this.totalCredit}`));
    return;
  }
  
  next();
});

// Pre-find hook: Exclude soft-deleted by default
JournalSchema.pre(/^find/, function(this: Query<any, any>, next) {
  const options = this.getOptions();
  
  if (!options.includeDeleted) {
    this.find({ isDeleted: false });
  }
  
  next();
});

// Instance method: Add audit entry
JournalSchema.methods.addAuditEntry = function(
  action: string, 
  userId: string | null = null,
  username: string | null = null,
  changes?: IAuditEntry['changes']
) {
  this.actionHistory.push({
    action,
    userId,
    username,
    timestamp: new Date(),
    changes,
  });
};

const Journal = models.Journal || model<IJournal>('Journal', JournalSchema);

export default Journal;