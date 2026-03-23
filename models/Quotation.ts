// models/Quotation.ts - FINAL: Party/Contact snapshots only, no legacy fields

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

export interface IPartySnapshot {
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
}

export interface IContactSnapshot {
  name: string;
  phone?: string;
  email?: string;
  designation?: string;
}

export interface IQuotation extends Document<string> {
  invoiceNumber: string;

  // Party & Contact References (Dynamic - Current Truth)
  partyId: mongoose.Types.ObjectId;
  contactId?: mongoose.Types.ObjectId;

  // Immutable Snapshots (Frozen - Legal Truth)
  partySnapshot: IPartySnapshot;
  contactSnapshot?: IContactSnapshot;

  items: IItem[];
  totalAmount: number;
  discount: number;
  vatAmount: number;
  grandTotal: number;
  notes?: string;
  quotationDate: Date;
  status: 'sent' | 'pending' | 'approved' | 'cancelled' | 'converted';

  // Connected documents
  connectedDocuments: {
    invoiceIds?: mongoose.Types.ObjectId[];
    deliveryId?: mongoose.Types.ObjectId;
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

const PartySnapshotSchema: Schema = new Schema({
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
    vatNumber: { type: String },
  },
}, { _id: false });

const ContactSnapshotSchema: Schema = new Schema({
  name: { type: String, required: true },
  phone: { type: String },
  email: { type: String },
  designation: { type: String },
}, { _id: false });

const QuotationSchema: Schema<IQuotation> = new Schema({
  invoiceNumber: { type: String, required: true, unique: true },

  // Party & Contact References
  partyId: {
    type: Schema.Types.ObjectId,
    ref: 'Party',
    required: true,
    index: true
  },
  contactId: {
    type: Schema.Types.ObjectId,
    ref: 'Contact',
    required: false,
    index: true
  },

  // Immutable Snapshots
  partySnapshot: {
    type: PartySnapshotSchema,
    required: true
  },
  contactSnapshot: {
    type: ContactSnapshotSchema,
    required: false
  },

  items: [ItemSchema],
  totalAmount: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  vatAmount: { type: Number, default: 0 },
  grandTotal: { type: Number, required: true },
  notes: { type: String },
  quotationDate: { type: Date, required: true },
  status: {
    type: String,
    enum: ['sent', 'pending', 'approved', 'cancelled', 'converted'],
    default: 'pending'
  },

  // Connected documents
  connectedDocuments: {
    type: {
      invoiceIds: [{ type: Schema.Types.ObjectId, ref: 'Invoice' }],
      deliveryId: { type: Schema.Types.ObjectId, ref: 'DeliveryNote' }
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
QuotationSchema.index({ isDeleted: 1, quotationDate: -1 });
QuotationSchema.index({ status: 1 });
QuotationSchema.index({ 'connectedDocuments.invoiceIds': 1 });
QuotationSchema.index({ partyId: 1, quotationDate: -1 });
QuotationSchema.index({ 'partySnapshot.displayName': 'text' });

// Pre-find hook
QuotationSchema.pre(/^find/, function (this: Query<any, any>, next) {
  const options = this.getOptions();

  if (options.includeDeleted !== true) {
    this.find({ isDeleted: false });
  }

  if (!this.getOptions().sort) {
    this.sort({ quotationDate: -1 });
  }

  next();
});

// Instance method to add audit entry
QuotationSchema.methods.addAuditEntry = function (
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

const Quotation = models.Quotation || model<IQuotation>('Quotation', QuotationSchema);

export default Quotation;