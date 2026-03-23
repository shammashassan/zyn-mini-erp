// models/ReturnNote.ts - UPDATED: Only Sales & Purchase Return Types

import mongoose, { Document, Schema, models, model, Query } from 'mongoose';

export interface IReturnItem {
  materialId?: string;
  materialName?: string;
  productId?: string;
  productName?: string;
  orderedQuantity?: number;
  receivedQuantity?: number;
  returnedQuantity?: number;
  returnQuantity: number;
  rate?: number;
  total?: number;
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

export interface IReturnNote extends Document<string> {
  returnNumber: string;
  returnType: 'salesReturn' | 'purchaseReturn';

  // Party & Contact References
  partyId: mongoose.Types.ObjectId;
  contactId?: mongoose.Types.ObjectId;

  // Immutable snapshots for historical accuracy (PDFs, reports)
  partySnapshot: {
    displayName: string;
    address?: {
      street?: string;
      city?: string;
      district?: string;
      state?: string;
      country?: string;
      postalCode?: string;
    };
    taxIdentifiers?: {
      vatNumber?: string;
    };
  };
  contactSnapshot?: {
    name: string;
    phone?: string;
    email?: string;
    designation?: string;
  };

  items: IReturnItem[];
  returnDate: Date;
  reason: string;
  notes?: string;
  status: 'pending' | 'approved' | 'cancelled';

  // Financial fields for sales returns
  totalAmount?: number;
  discount?: number;
  vatAmount?: number;
  grandTotal?: number;

  connectedDocuments: {
    purchaseId?: mongoose.Types.ObjectId;
    invoiceId?: mongoose.Types.ObjectId;
    debitNoteId?: mongoose.Types.ObjectId;
    creditNoteId?: mongoose.Types.ObjectId;
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
  // Purchase return fields
  materialId: { type: String },
  materialName: { type: String },

  // Sales return fields
  productId: { type: String },
  productName: { type: String },
  rate: { type: Number },
  total: { type: Number },

  // Common fields
  orderedQuantity: { type: Number },
  receivedQuantity: { type: Number },
  returnedQuantity: { type: Number },
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
  returnType: {
    type: String,
    required: true,
    enum: ['salesReturn', 'purchaseReturn'],
    default: 'purchaseReturn'
  },

  // Party & Contact References
  partyId: { type: Schema.Types.ObjectId, ref: 'Party', required: true, index: true },
  contactId: { type: Schema.Types.ObjectId, ref: 'Contact', required: false },

  // Immutable snapshots
  partySnapshot: {
    type: {
      displayName: { type: String, required: true },
      address: {
        street: { type: String },
        city: { type: String },
        district: { type: String },
        state: { type: String },
        country: { type: String },
        postalCode: { type: String },
      },
      taxIdentifiers: {
        vatNumber: { type: String }
      },
    },
    required: true,
    _id: false
  },
  contactSnapshot: {
    type: {
      name: { type: String, required: true },
      phone: { type: String },
      email: { type: String },
      designation: { type: String },
    },
    required: false,
    _id: false
  },

  items: [ReturnItemSchema],
  returnDate: { type: Date, required: true },
  reason: { type: String, required: true },
  notes: { type: String },
  status: {
    type: String,
    enum: ['pending', 'approved', 'cancelled'],
    default: 'pending'
  },

  // Financial fields (for sales returns)
  totalAmount: { type: Number },
  discount: { type: Number },
  vatAmount: { type: Number },
  grandTotal: { type: Number },

  connectedDocuments: {
    type: {
      purchaseId: { type: Schema.Types.ObjectId, ref: 'Purchase' },
      invoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice' },
      debitNoteId: { type: Schema.Types.ObjectId, ref: 'DebitNote' },
      creditNoteId: { type: Schema.Types.ObjectId, ref: 'CreditNote' },
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
ReturnNoteSchema.index({ isDeleted: 1, returnDate: -1 });
ReturnNoteSchema.index({ returnType: 1 });
ReturnNoteSchema.index({ status: 1 });
ReturnNoteSchema.index({ 'connectedDocuments.purchaseId': 1 });
ReturnNoteSchema.index({ 'connectedDocuments.invoiceId': 1 });

// Pre-find hook to exclude deleted records by default
ReturnNoteSchema.pre(/^find/, function (this: Query<any, any>, next) {
  const options = this.getOptions();

  if (options.includeDeleted !== true) {
    this.find({ isDeleted: false });
  }

  if (!this.getOptions().sort) {
    this.sort({ returnDate: -1 });
  }

  next();
});

// Add audit entry method
ReturnNoteSchema.methods.addAuditEntry = function (
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