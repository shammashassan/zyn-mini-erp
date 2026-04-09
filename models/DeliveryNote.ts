// models/DeliveryNote.ts - FINAL: Party/Contact snapshots only, no legacy fields

import mongoose, { Document, Schema, models, model, Query } from 'mongoose';

export interface IItem extends Document {
  /** References the unified Item model*/
  itemId?: mongoose.Types.ObjectId;
  description: string;
  quantity: number;
  rate: number;
  total: number;
  /** Carried over from invoice line item — for audit/reference only */
  taxRate?: number;
  taxAmount?: number;
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

export interface IDeliveryNote extends Document<string> {
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
  deliveryDate: Date;
  status: 'pending' | 'dispatched' | 'delivered' | 'cancelled';

  // Connected documents
  connectedDocuments: {
    invoiceIds?: mongoose.Types.ObjectId[];
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
  itemId: { type: Schema.Types.ObjectId, ref: 'Item', required: false },
  description: { type: String, required: true },
  quantity: { type: Number, required: true },
  rate: { type: Number, required: true },
  total: { type: Number, required: true },
  /** Carried over from invoice line item — for audit/reference, no recalculation */
  taxRate: { type: Number, default: 0 },
  taxAmount: { type: Number, default: 0 },
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

const DeliveryNoteSchema: Schema<IDeliveryNote> = new Schema({
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
  deliveryDate: { type: Date, required: true },
  status: {
    type: String,
    enum: ['pending', 'dispatched', 'delivered', 'cancelled'],
    default: 'pending'
  },

  // Connected documents
  connectedDocuments: {
    type: {
      invoiceIds: [{ type: Schema.Types.ObjectId, ref: 'Invoice' }],
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
DeliveryNoteSchema.index({ isDeleted: 1, deliveryDate: -1 });
DeliveryNoteSchema.index({ status: 1 });
DeliveryNoteSchema.index({ 'connectedDocuments.invoiceIds': 1 });
DeliveryNoteSchema.index({ partyId: 1, deliveryDate: -1 });
DeliveryNoteSchema.index({ 'partySnapshot.displayName': 'text' });
DeliveryNoteSchema.index({ 'items.itemId': 1 });

// Pre-find hook
DeliveryNoteSchema.pre(/^find/, function (this: Query<any, any>, next) {
  const options = this.getOptions();

  if (options.includeDeleted !== true) {
    this.find({ isDeleted: false });
  }

  if (!this.getOptions().sort) {
    this.sort({ deliveryDate: -1 });
  }

  next();
});

// Instance method to add audit entry
DeliveryNoteSchema.methods.addAuditEntry = function (
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