// models/Purchase.ts - FINAL: Using party snapshots, removed all legacy fields

import mongoose, { Document, Schema, models, model, Query } from 'mongoose';

export interface IPurchaseItem {
  materialId: string;
  materialName: string;
  quantity: number;
  unitCost: number;
  total: number;
  receivedQuantity?: number;
  returnedQuantity?: number;
}

export interface IPaymentAllocation {
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

export interface IPurchase extends Document<string> {
  referenceNumber: string;

  // ✅ Party & Contact References (Dynamic - Current Truth)
  partyId: mongoose.Types.ObjectId;
  contactId?: mongoose.Types.ObjectId;

  // ✅ Immutable Snapshots (Frozen - Legal Truth)
  partySnapshot: IPartySnapshot;
  contactSnapshot?: IContactSnapshot;

  items: IPurchaseItem[];
  totalAmount: number;
  discount: number;
  isTaxPayable: boolean;
  vatAmount: number;
  grandTotal: number;
  date: Date;
  purchaseDate: Date;

  purchaseStatus: 'pending' | 'approved' | 'cancelled';
  inventoryStatus: 'pending' | 'received' | 'partially received';
  paymentStatus: 'pending' | 'paid' | 'partially paid';

  paymentAllocations: IPaymentAllocation[];
  paidAmount: number;
  totalPaid: number;
  remainingAmount: number;

  connectedDocuments: {
    paymentIds: mongoose.Types.ObjectId[];
    returnNoteIds: mongoose.Types.ObjectId[];
  };

  isDeleted: boolean;
  deletedAt: Date | null;
  deletedBy: string | null;

  createdBy: string | null;
  updatedBy: string | null;
  actionHistory: IAuditEntry[];

  createdAt: Date;
  updatedAt: Date;

  allocatePayment(voucherId: mongoose.Types.ObjectId, amount: number): void;
  deallocatePayment(voucherId: mongoose.Types.ObjectId): number;
  getTotalAllocated(): number;
  canAllocate(amount: number): boolean;

  addAuditEntry(
    action: string,
    userId?: string | null,
    username?: string | null,
    changes?: IAuditEntry['changes']
  ): void;
}

const PurchaseItemSchema: Schema = new Schema({
  materialId: { type: String, required: true },
  materialName: { type: String, required: true, trim: true },
  quantity: { type: Number, required: true, min: 0.01 },
  unitCost: { type: Number, required: true, min: 0 },
  total: { type: Number, required: true, min: 0 },
  receivedQuantity: { type: Number, default: 0, min: 0 },
  returnedQuantity: { type: Number, default: 0, min: 0 },
});

const PaymentAllocationSchema: Schema = new Schema({
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

const PurchaseSchema: Schema<IPurchase> = new Schema({
  referenceNumber: {
    type: String,
    required: true,
    unique: true
  },

  // ✅ Party & Contact References
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

  // ✅ Immutable Snapshots
  partySnapshot: {
    type: PartySnapshotSchema,
    required: true
  },
  contactSnapshot: {
    type: ContactSnapshotSchema,
    required: false
  },

  items: [PurchaseItemSchema],
  totalAmount: { type: Number, required: true, min: 0 },
  discount: { type: Number, default: 0, min: 0 },
  isTaxPayable: { type: Boolean, default: true },
  vatAmount: { type: Number, default: 0, min: 0 },
  grandTotal: { type: Number, min: 0 },
  date: { type: Date, required: true },
  purchaseDate: { type: Date, required: true },

  purchaseStatus: {
    type: String,
    enum: ['pending', 'approved', 'cancelled'],
    default: 'pending'
  },
  inventoryStatus: {
    type: String,
    enum: ['pending', 'received', 'partially received'],
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'partially paid'],
    default: 'pending'
  },

  paymentAllocations: [PaymentAllocationSchema],

  connectedDocuments: {
    type: {
      paymentIds: [{ type: Schema.Types.ObjectId, ref: 'Voucher' }],
      returnNoteIds: [{ type: Schema.Types.ObjectId, ref: 'ReturnNote' }],
    },
    default: { paymentIds: [], returnNoteIds: [] }
  },

  paidAmount: { type: Number, default: 0, min: 0 },
  totalPaid: { type: Number, default: 0, min: 0 },
  remainingAmount: { type: Number, default: 0, min: 0 },

  isDeleted: { type: Boolean, default: false, index: true },
  deletedAt: { type: Date, default: null },
  deletedBy: { type: String, default: null },

  createdBy: { type: String, default: null },
  updatedBy: { type: String, default: null },
  actionHistory: [AuditEntrySchema],
}, {
  timestamps: true
});

// Indexes
PurchaseSchema.index({ isDeleted: 1, purchaseDate: -1 });
PurchaseSchema.index({ purchaseStatus: 1, inventoryStatus: 1, paymentStatus: 1 });
PurchaseSchema.index({ 'connectedDocuments.paymentIds': 1 });
PurchaseSchema.index({ 'connectedDocuments.returnNoteIds': 1 });
PurchaseSchema.index({ purchaseDate: 1 });
PurchaseSchema.index({ 'paymentAllocations.voucherId': 1 });
PurchaseSchema.index({ partyId: 1, purchaseDate: -1 });
PurchaseSchema.index({ 'partySnapshot.displayName': 'text' });

// Pre-save hook
PurchaseSchema.pre('save', function (next) {
  const grossTotal = this.totalAmount;
  const discount = this.discount || 0;
  const subtotal = grossTotal - discount;
  const vatAmount = this.isTaxPayable ? (subtotal * 0.05) : 0;

  this.vatAmount = vatAmount;
  this.grandTotal = subtotal + vatAmount;

  // Sync date with purchaseDate for backward compatibility
  if (this.isModified('purchaseDate') && !this.isModified('date')) {
    this.date = this.purchaseDate;
  } else if (this.isModified('date') && !this.isModified('purchaseDate')) {
    this.purchaseDate = this.date;
  }

  // Calculate paid amount from payment allocations
  if (this.paymentAllocations && this.paymentAllocations.length > 0) {
    this.paidAmount = this.paymentAllocations.reduce(
      (sum: number, alloc: IPaymentAllocation) => sum + alloc.allocatedAmount,
      0
    );
  } else if (!this.isModified('paidAmount')) {
    this.paidAmount = 0;
  }

  this.totalPaid = this.paidAmount;
  this.remainingAmount = Math.max(0, this.grandTotal - this.paidAmount);

  // Auto-calculate payment status
  let newPaymentStatus: 'pending' | 'paid' | 'partially paid';
  if (this.paidAmount >= this.grandTotal) {
    newPaymentStatus = 'paid';
  } else if (this.paidAmount > 0) {
    newPaymentStatus = 'partially paid';
  } else {
    newPaymentStatus = 'pending';
  }

  this.paymentStatus = newPaymentStatus;

  next();
});

// Pre-find hook
PurchaseSchema.pre(/^find/, function (this: Query<any, any>, next) {
  const options = this.getOptions();

  if (!options.includeDeleted) {
    this.find({ isDeleted: false });
  }

  if (!this.getOptions().sort) {
    this.sort({ purchaseDate: -1 });
  }

  next();
});

// Instance methods
PurchaseSchema.methods.allocatePayment = function (
  voucherId: mongoose.Types.ObjectId,
  amount: number
): void {
  if (amount <= 0) {
    throw new Error('Allocation amount must be positive');
  }

  const currentAllocated = this.getTotalAllocated();

  if (currentAllocated + amount > this.grandTotal) {
    throw new Error(
      `Cannot allocate ${amount}. Would exceed purchase total. ` +
      `Current: ${currentAllocated}, Purchase Total: ${this.grandTotal}`
    );
  }

  const existingIndex = this.paymentAllocations.findIndex(
    (alloc: any) => alloc.voucherId.toString() === voucherId.toString()
  );

  if (existingIndex !== -1) {
    throw new Error('This voucher is already allocated to this purchase');
  }

  this.paymentAllocations.push({
    voucherId,
    allocatedAmount: amount,
    allocationDate: new Date(),
  });
};

PurchaseSchema.methods.deallocatePayment = function (
  voucherId: mongoose.Types.ObjectId
): number {
  const index = this.paymentAllocations.findIndex(
    (alloc: any) => alloc.voucherId.toString() === voucherId.toString()
  );

  if (index === -1) {
    return 0;
  }

  const amount = this.paymentAllocations[index].allocatedAmount;
  this.paymentAllocations.splice(index, 1);

  return amount;
};

PurchaseSchema.methods.getTotalAllocated = function (): number {
  if (!this.paymentAllocations || this.paymentAllocations.length === 0) {
    return 0;
  }

  return this.paymentAllocations.reduce((sum: number, alloc: IPaymentAllocation) => sum + alloc.allocatedAmount, 0);
};

PurchaseSchema.methods.canAllocate = function (amount: number): boolean {
  const currentAllocated = this.getTotalAllocated();
  return (currentAllocated + amount) <= this.grandTotal;
};

PurchaseSchema.methods.addAuditEntry = function (
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

const Purchase = models.Purchase || model<IPurchase>('Purchase', PurchaseSchema);

export default Purchase;