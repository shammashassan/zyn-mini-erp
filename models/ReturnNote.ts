// models/ReturnNote.ts - Return Note Model (Quantity-Only)

import mongoose, { Document, Schema, models, model, Query } from 'mongoose';

export interface IReturnItem {
  materialId: string;
  materialName: string;
  orderedQuantity: number;
  receivedQuantity: number;
  returnedQuantity: number;
  returnQuantity: number; // Current return amount
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

export interface IReturnNote extends Document {
  _id: string;
  returnNumber: string;
  purchaseId: mongoose.Types.ObjectId;
  purchaseReference: string;
  supplierName: string;
  items: IReturnItem[];
  returnDate: Date;
  reason: string;
  notes?: string;
  status: 'pending' | 'approved' | 'cancelled';
  
  connectedDocuments: {
    debitNoteId?: mongoose.Types.ObjectId;
  };
  
  isDeleted: boolean;
  deletedAt: Date | null;
  deletedBy: string | null;
  
  createdBy: string | null;
  updatedBy: string | null;
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

const ReturnItemSchema: Schema = new Schema({
  materialId: { type: String, required: true },
  materialName: { type: String, required: true },
  orderedQuantity: { type: Number, required: true },
  receivedQuantity: { type: Number, required: true },
  returnedQuantity: { type: Number, default: 0 },
  returnQuantity: { type: Number, required: true },
});

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

const ReturnNoteSchema: Schema<IReturnNote> = new Schema({
  returnNumber: { type: String, required: true, unique: true },
  purchaseId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Purchase', 
    required: true 
  },
  purchaseReference: { type: String, required: true },
  supplierName: { type: String, required: true },
  items: [ReturnItemSchema],
  returnDate: { type: Date, required: true },
  reason: { type: String, required: true },
  notes: { type: String },
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'cancelled'],
    default: 'pending'
  },
  
  connectedDocuments: {
    type: {
      debitNoteId: { type: Schema.Types.ObjectId, ref: 'DebitNote' }
    },
    default: {}
  },
  
  isDeleted: { type: Boolean, default: false, index: true },
  deletedAt: { type: Date, default: null },
  deletedBy: { type: String, default: null },
  
  createdBy: { type: String, default: null },
  updatedBy: { type: String, default: null },
  actionHistory: [AuditEntrySchema],
}, { timestamps: true });

// Indexes
ReturnNoteSchema.index({ isDeleted: 1, createdAt: -1 });
ReturnNoteSchema.index({ status: 1 });
ReturnNoteSchema.index({ purchaseId: 1 });
ReturnNoteSchema.index({ supplierName: 1 });
ReturnNoteSchema.index({ 'connectedDocuments.debitNoteId': 1 });

// Pre-find hook
ReturnNoteSchema.pre(/^find/, function(this: Query<any, any>, next) {
  const options = this.getOptions();
  
  if (!options.includeDeleted) {
    this.find({ isDeleted: false });
  }
  
  next();
});

// Audit entry method
ReturnNoteSchema.methods.addAuditEntry = function(
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

const ReturnNote = models.ReturnNote || model<IReturnNote>('ReturnNote', ReturnNoteSchema);

export default ReturnNote;