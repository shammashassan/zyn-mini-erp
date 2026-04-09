// models/Invoice.ts - FINAL: Party/Contact snapshots only, no legacy fields

import mongoose, { Document, Schema, models, model, Query } from 'mongoose';

export interface IItem extends Document {
  /** References the unified Item model */
  itemId?: mongoose.Types.ObjectId;
  description: string;
  quantity: number;
  rate: number;
  total: number;
  /** Snapshot of item tax rate at time of invoicing */
  taxRate?: number;
  /** Pre-computed tax amount per line (rate applied to total) — VATtotal = sum(taxAmount) */
  taxAmount?: number;
  returnedQuantity?: number;
}

export interface IReceiptAllocation {
  voucherId: mongoose.Types.ObjectId;
  allocatedAmount: number;
  allocationDate: Date;
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

export interface IInvoice extends Document<string> {
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
  invoiceDate: Date;
  status: 'paid' | 'pending' | 'partial' | 'overdue' | 'approved' | 'cancelled';

  receiptAllocations: IReceiptAllocation[];

  paidAmount: number;
  receivedAmount: number;
  remainingAmount: number;
  paymentStatus: 'Paid' | 'Pending' | 'Partially Paid';

  connectedDocuments: {
    receiptIds?: mongoose.Types.ObjectId[];
    deliveryId?: mongoose.Types.ObjectId;
    returnNoteIds?: mongoose.Types.ObjectId[];
  };

  isDeleted: boolean;
  deletedAt: Date | null;
  deletedBy: string | null;

  createdBy: string | null;
  updatedBy: string | null;
  actionHistory: IAuditEntry[];

  createdAt: Date;
  updatedAt: Date;

  allocateReceipt(voucherId: mongoose.Types.ObjectId, amount: number): void;
  deallocateReceipt(voucherId: mongoose.Types.ObjectId): number;
  getTotalAllocated(): number;
  canAllocate(amount: number): boolean;

  addAuditEntry(
    action: string,
    userId?: string | null,
    username?: string | null,
    changes?: IAuditEntry['changes']
  ): void;
}

const ItemSchema: Schema = new Schema({
  /** References unified Item model */
  itemId: { type: Schema.Types.ObjectId, ref: 'Item', required: false },
  description: { type: String, required: true },
  quantity: { type: Number, required: true },
  rate: { type: Number, required: true },
  total: { type: Number, required: true },
  /** Tax rate snapshot — avoids re-lookup on edit; preserves rate at time of sale */
  taxRate: { type: Number, default: 0 },
  /** Pre-computed tax amount per line — VATtotal = sum(taxAmount) */
  taxAmount: { type: Number, default: 0 },
  returnedQuantity: { type: Number, default: 0 },
});

const ReceiptAllocationSchema: Schema = new Schema({
  voucherId: {
    type: Schema.Types.ObjectId,
    ref: 'Voucher',
    required: true
  },
  allocatedAmount: { type: Number, required: true, min: 0 },
  allocationDate: { type: Date, default: Date.now },
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

const InvoiceSchema: Schema<IInvoice> = new Schema({
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
  invoiceDate: { type: Date, required: true },
  status: {
    type: String,
    enum: ['paid', 'pending', 'partial', 'overdue', 'approved', 'cancelled'],
    default: 'pending'
  },

  receiptAllocations: [ReceiptAllocationSchema],

  paidAmount: { type: Number, default: 0, min: 0 },
  receivedAmount: { type: Number, default: 0, min: 0 },
  remainingAmount: { type: Number, default: 0, min: 0 },
  paymentStatus: {
    type: String,
    enum: ['Paid', 'Pending', 'Partially Paid'],
    default: 'Pending'
  },

  connectedDocuments: {
    type: {
      receiptIds: [{ type: Schema.Types.ObjectId, ref: 'Voucher' }],
      deliveryId: { type: Schema.Types.ObjectId, ref: 'DeliveryNote' },
      returnNoteIds: [{ type: Schema.Types.ObjectId, ref: 'ReturnNote' }],
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
InvoiceSchema.index({ isDeleted: 1, invoiceDate: -1 });
InvoiceSchema.index({ status: 1 });
InvoiceSchema.index({ paymentStatus: 1 });
InvoiceSchema.index({ 'connectedDocuments.receiptIds': 1 });
InvoiceSchema.index({ 'receiptAllocations.voucherId': 1 });
InvoiceSchema.index({ 'connectedDocuments.returnNoteIds': 1 });
InvoiceSchema.index({ partyId: 1, invoiceDate: -1 });
InvoiceSchema.index({ 'partySnapshot.displayName': 'text' });
InvoiceSchema.index({ 'items.itemId': 1 });

// Pre-save hook
InvoiceSchema.pre('save', function (next) {
  // Calculate paid amount from receipt allocations
  if (this.receiptAllocations && this.receiptAllocations.length > 0) {
    this.paidAmount = this.receiptAllocations.reduce(
      (sum: number, alloc: IReceiptAllocation) => sum + alloc.allocatedAmount,
      0
    );
  } else if (!this.isModified('paidAmount')) {
    this.paidAmount = 0;
  }

  // Use whichever is greater between paidAmount and receivedAmount
  const effectiveAmount = Math.max(this.paidAmount, this.receivedAmount || 0);

  // Recalculate remainingAmount
  this.remainingAmount = Math.max(0, this.grandTotal - effectiveAmount);

  // Auto-calculate payment status
  const EPSILON = 0.01;

  if (effectiveAmount >= this.grandTotal - EPSILON) {
    this.paymentStatus = 'Paid';
  } else if (effectiveAmount > 0) {
    this.paymentStatus = 'Partially Paid';
  } else {
    this.paymentStatus = 'Pending';
  }

  next();
});

// Pre-find hook
InvoiceSchema.pre(/^find/, function (this: Query<any, any>, next) {
  const options = this.getOptions();

  if (options.includeDeleted !== true) {
    this.find({ isDeleted: false });
  }

  if (!this.getOptions().sort) {
    this.sort({ invoiceDate: -1 });
  }

  next();
});

// Instance methods
InvoiceSchema.methods.allocateReceipt = function (
  voucherId: mongoose.Types.ObjectId,
  amount: number
): void {
  if (amount <= 0) {
    throw new Error('Allocation amount must be positive');
  }

  const currentAllocated = this.getTotalAllocated();

  if (currentAllocated + amount > this.grandTotal) {
    throw new Error(
      `Cannot allocate ${amount}. Would exceed invoice total. ` +
      `Current: ${currentAllocated}, Invoice Total: ${this.grandTotal}`
    );
  }

  const existingIndex = this.receiptAllocations.findIndex(
    (alloc: any) => alloc.voucherId.toString() === voucherId.toString()
  );

  if (existingIndex !== -1) {
    throw new Error('This voucher is already allocated to this invoice');
  }

  this.receiptAllocations.push({
    voucherId,
    allocatedAmount: amount,
    allocationDate: new Date(),
  });
};

InvoiceSchema.methods.deallocateReceipt = function (
  voucherId: mongoose.Types.ObjectId
): number {
  const index = this.receiptAllocations.findIndex(
    (alloc: any) => alloc.voucherId.toString() === voucherId.toString()
  );

  if (index === -1) {
    return 0;
  }

  const amount = this.receiptAllocations[index].allocatedAmount;
  this.receiptAllocations.splice(index, 1);

  return amount;
};

InvoiceSchema.methods.getTotalAllocated = function (): number {
  if (!this.receiptAllocations || this.receiptAllocations.length === 0) {
    return 0;
  }

  return this.receiptAllocations.reduce((sum: number, alloc: IReceiptAllocation) => sum + alloc.allocatedAmount, 0);
};

InvoiceSchema.methods.canAllocate = function (amount: number): boolean {
  const currentAllocated = this.getTotalAllocated();
  return (currentAllocated + amount) <= this.grandTotal;
};

InvoiceSchema.methods.addAuditEntry = function (
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

const Invoice = models.Invoice || model<IInvoice>('Invoice', InvoiceSchema);

export default Invoice;