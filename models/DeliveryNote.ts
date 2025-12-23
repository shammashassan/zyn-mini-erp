// models/DeliveryNote.ts

import mongoose, { Document, Schema, models, model, Query } from 'mongoose';

export interface IItem extends Document {
  description: string;
  quantity: number;
  rate: number;
  total: number;
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

export interface IDeliveryNote extends Document {
  _id: string;
  invoiceNumber: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  items: IItem[];
  totalAmount: number;
  discount: number;
  vatAmount: number;
  grandTotal: number;
  notes?: string;
  status: 'pending' | 'dispatched' | 'delivered' | 'cancelled';
  
  // Connected documents
  connectedDocuments: {
    invoiceIds?: mongoose.Types.ObjectId[];
    quotationId?: mongoose.Types.ObjectId;
  };
  
  // Soft delete fields
  isDeleted: boolean;
  deletedAt: Date | null;
  deletedBy: string | null;
  
  // Audit trail
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

const ItemSchema: Schema = new Schema({
  description: { type: String, required: true },
  quantity: { type: Number, required: true },
  rate: { type: Number, required: true },
  total: { type: Number, required: true },
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

const DeliveryNoteSchema: Schema<IDeliveryNote> = new Schema({
  invoiceNumber: { type: String, required: true, unique: true },
  customerName: { type: String, required: true },
  customerPhone: { type: String },
  customerEmail: { type: String },
  items: [ItemSchema],
  totalAmount: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  vatAmount: { type: Number, default: 0 },
  grandTotal: { type: Number, required: true },
  notes: { type: String },
  status: { 
    type: String, 
    enum: ['pending', 'dispatched', 'delivered', 'cancelled'],
    default: 'pending'
  },
  
  // Connected documents
  connectedDocuments: {
    type: {
      invoiceIds: [{ type: Schema.Types.ObjectId, ref: 'Invoice' }],
      quotationId: { type: Schema.Types.ObjectId, ref: 'Quotation' }
    },
    default: {}
  },
  
  // Soft delete fields
  isDeleted: { type: Boolean, default: false, index: true },
  deletedAt: { type: Date, default: null },
  deletedBy: { type: String, default: null },
  
  // Audit trail
  createdBy: { type: String, default: null },
  updatedBy: { type: String, default: null },
  actionHistory: [AuditEntrySchema],
}, { timestamps: true });

// Indexes
DeliveryNoteSchema.index({ isDeleted: 1, createdAt: -1 });
DeliveryNoteSchema.index({ status: 1 });
DeliveryNoteSchema.index({ customerName: 1 });
DeliveryNoteSchema.index({ 'connectedDocuments.invoiceIds': 1 });
DeliveryNoteSchema.index({ 'connectedDocuments.quotationId': 1 });

// Pre-find hook
DeliveryNoteSchema.pre(/^find/, function(this: Query<any, any>, next) {
  const options = this.getOptions();
  
  if (options.includeDeleted !== true) {
    this.find({ isDeleted: false });
  }
  
  next();
});

// Instance method to add audit entry
DeliveryNoteSchema.methods.addAuditEntry = function(
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

const DeliveryNote = models.DeliveryNote || model<IDeliveryNote>('DeliveryNote', DeliveryNoteSchema);

export default DeliveryNote;