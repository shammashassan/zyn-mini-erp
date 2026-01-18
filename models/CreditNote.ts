// models/CreditNote.ts - UPDATED: Added returnNoteId field

import mongoose, { Document, Schema, models, model, Query } from 'mongoose';

export interface ICreditNoteItem {
  productId?: string;
  description: string;
  quantity: number;
  price: number;
  total: number;
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

export interface ICreditNote extends Document {
  _id: string;
  creditNoteNumber: string;
  customerName?: string;
  customerId?: mongoose.Types.ObjectId;
  supplierName?: string;
  supplierId?: mongoose.Types.ObjectId;
  payeeName?: string;
  payeeId?: mongoose.Types.ObjectId;
  vendorName?: string;
  items: ICreditNoteItem[];
  totalAmount: number;
  discount: number;
  isTaxPayable: boolean;
  vatAmount: number;
  grandTotal: number;
  creditDate: Date;
  notes?: string;
  reason?: string;
  
  status: 'pending' | 'approved' | 'cancelled';
  
  paymentAllocations: IPaymentAllocation[];
  paidAmount: number;
  remainingAmount: number;
  paymentStatus: 'pending' | 'paid' | 'partially paid';
  
  creditType: 'return' | 'adjustment' | 'standalone';
  
  connectedDocuments: {
    returnNoteId?: mongoose.Types.ObjectId;
    paymentIds?: mongoose.Types.ObjectId[];
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

const CreditNoteItemSchema: Schema = new Schema({
  productId: { type: String, required: false },
  description: { type: String, required: true },
  quantity: { type: Number, required: true, min: 0 },
  price: { type: Number, required: true, min: 0 },
  total: { type: Number, required: true, min: 0 },
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

const CreditNoteSchema: Schema<ICreditNote> = new Schema({
  creditNoteNumber: { type: String, required: true, unique: true },
  customerName: { type: String, required: false },
  customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: false },
  supplierName: { type: String, required: false },
  supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier', required: false },
  payeeName: { type: String, required: false },
  payeeId: { type: Schema.Types.ObjectId, ref: 'Payee', required: false },
  vendorName: { type: String, required: false },
  items: [CreditNoteItemSchema],
  totalAmount: { type: Number, required: true, min: 0 },
  discount: { type: Number, default: 0, min: 0 },
  isTaxPayable: { type: Boolean, default: false },
  vatAmount: { type: Number, default: 0, min: 0 },
  grandTotal: { type: Number, required: true, min: 0 },
  creditDate: { type: Date, required: true },
  notes: { type: String },
  reason: { type: String },
  
  status: {
    type: String,
    enum: ['pending', 'approved', 'cancelled'],
    default: 'pending'
  },
  
  paymentAllocations: [PaymentAllocationSchema],
  paidAmount: { type: Number, default: 0, min: 0 },
  remainingAmount: { type: Number, default: 0, min: 0 },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'partially paid'],
    default: 'pending'
  },
  
  creditType: {
    type: String,
    enum: ['return', 'adjustment', 'standalone'],
    default: 'standalone'
  },
  
  connectedDocuments: {
    type: {
      returnNoteId: { type: Schema.Types.ObjectId, ref: 'ReturnNote' },
      paymentIds: [{ type: Schema.Types.ObjectId, ref: 'Voucher' }]
    },
    default: { paymentIds: [] }
  },
  
  isDeleted: { type: Boolean, default: false, index: true },
  deletedAt: { type: Date, default: null },
  deletedBy: { type: String, default: null },
  
  createdBy: { type: String, default: null },
  updatedBy: { type: String, default: null },
  actionHistory: [AuditEntrySchema],
}, { timestamps: true });

// Indexes
CreditNoteSchema.index({ isDeleted: 1, creditDate: -1 });
CreditNoteSchema.index({ status: 1 });
CreditNoteSchema.index({ paymentStatus: 1 });
CreditNoteSchema.index({ 'connectedDocuments.returnNoteId': 1 });
CreditNoteSchema.index({ customerName: 1 });
CreditNoteSchema.index({ customerId: 1 });
CreditNoteSchema.index({ supplierName: 1 });
CreditNoteSchema.index({ supplierId: 1 });
CreditNoteSchema.index({ payeeName: 1 });
CreditNoteSchema.index({ payeeId: 1 });
CreditNoteSchema.index({ vendorName: 1 });
CreditNoteSchema.index({ 'connectedDocuments.paymentIds': 1 });
CreditNoteSchema.index({ 'paymentAllocations.voucherId': 1 });

// Pre-save middleware
CreditNoteSchema.pre('save', function(next) {
  const grossTotal = this.totalAmount;
  const discount = this.discount || 0;
  const subtotal = grossTotal - discount;
  const vatAmount = this.isTaxPayable ? (subtotal * 0.05) : 0;
  
  this.vatAmount = vatAmount;
  this.grandTotal = subtotal + vatAmount;
  
  if (this.paymentAllocations && this.paymentAllocations.length > 0) {
    this.paidAmount = this.paymentAllocations.reduce(
      (sum: number, alloc: IPaymentAllocation) => sum + alloc.allocatedAmount, 
      0
    );
  } else if (!this.isModified('paidAmount')) {
    this.paidAmount = 0;
  }
  
  this.remainingAmount = Math.max(0, this.grandTotal - this.paidAmount);
  
  if (this.paidAmount >= this.grandTotal) {
    this.paymentStatus = 'paid';
  } else if (this.paidAmount > 0) {
    this.paymentStatus = 'partially paid';
  } else {
    this.paymentStatus = 'pending';
  }
  
  next();
});

// Pre-find hook
CreditNoteSchema.pre(/^find/, function(this: Query<any, any>, next) {
  const options = this.getOptions();
  
  if (!options.includeDeleted) {
    this.find({ isDeleted: false });
  }
  
  if (!this.getOptions().sort) {
    this.sort({ creditDate: -1 });
  }
  
  next();
});

// Payment allocation methods
CreditNoteSchema.methods.allocatePayment = function(
  voucherId: mongoose.Types.ObjectId, 
  amount: number
): void {
  if (amount <= 0) {
    throw new Error('Allocation amount must be positive');
  }
  
  const currentAllocated = this.getTotalAllocated();
  
  if (currentAllocated + amount > this.grandTotal) {
    throw new Error(
      `Cannot allocate ${amount}. Would exceed credit note total. ` +
      `Current: ${currentAllocated}, Total: ${this.grandTotal}`
    );
  }
  
  const existingIndex = this.paymentAllocations.findIndex(
    (alloc: any) => alloc.voucherId.toString() === voucherId.toString()
  );
  
  if (existingIndex !== -1) {
    throw new Error('This voucher is already allocated to this credit note');
  }
  
  this.paymentAllocations.push({
    voucherId,
    allocatedAmount: amount,
    allocationDate: new Date(),
  });
};

CreditNoteSchema.methods.deallocatePayment = function(
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

CreditNoteSchema.methods.getTotalAllocated = function(): number {
  if (!this.paymentAllocations || this.paymentAllocations.length === 0) {
    return 0;
  }
  
  return this.paymentAllocations.reduce(
    (sum: number, alloc: IPaymentAllocation) => sum + alloc.allocatedAmount, 
    0
  );
};

CreditNoteSchema.methods.canAllocate = function(amount: number): boolean {
  const currentAllocated = this.getTotalAllocated();
  return (currentAllocated + amount) <= this.grandTotal;
};

// Audit entry method
CreditNoteSchema.methods.addAuditEntry = function(
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

const CreditNote = models.CreditNote || model<ICreditNote>('CreditNote', CreditNoteSchema);

export default CreditNote;