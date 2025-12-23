// models/Invoice.ts - FIXED: Added "Partially Refunded" status

import mongoose, { Document, Schema, models, model, Query } from 'mongoose';

export interface IItem extends Document {
  description: string;
  quantity: number;
  rate: number;
  total: number;
}

export interface IReceiptAllocation {
  voucherId: mongoose.Types.ObjectId;
  allocatedAmount: number;
  allocationDate: Date;
}

export interface IRefundAllocation {
  voucherId: mongoose.Types.ObjectId;
  refundedAmount: number;
  refundDate: Date;
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

export interface IInvoice extends Document {
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
  status: 'paid' | 'pending' | 'partial' | 'overdue' | 'approved' | 'cancelled';
  
  receiptAllocations: IReceiptAllocation[];
  refundAllocations: IRefundAllocation[];
  paidAmount: number;
  receivedAmount: number;
  refundedAmount: number;
  remainingAmount: number;
  paymentStatus: 'Paid' | 'Pending' | 'Partially Paid' | 'Refunded' | 'Partially Refunded'; // ✅ ADDED: Partially Refunded
  
  connectedDocuments: {
    receiptIds?: mongoose.Types.ObjectId[];
    refundIds?: mongoose.Types.ObjectId[];
    deliveryId?: mongoose.Types.ObjectId;
    quotationId?: mongoose.Types.ObjectId;
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
  allocateRefund(voucherId: mongoose.Types.ObjectId, amount: number): void;
  deallocateRefund(voucherId: mongoose.Types.ObjectId): number;
  getTotalAllocated(): number;
  getTotalRefunded(): number;
  canAllocate(amount: number): boolean;
  canRefund(amount: number): boolean;
  
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

const ReceiptAllocationSchema: Schema = new Schema({
  voucherId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Voucher',
    required: true 
  },
  allocatedAmount: { type: Number, required: true, min: 0 },
  allocationDate: { type: Date, default: Date.now },
});

const RefundAllocationSchema: Schema = new Schema({
  voucherId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Voucher',
    required: true 
  },
  refundedAmount: { type: Number, required: true, min: 0 },
  refundDate: { type: Date, default: Date.now },
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

const InvoiceSchema: Schema<IInvoice> = new Schema({
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
    enum: ['paid', 'pending', 'partial', 'overdue', 'approved', 'cancelled'],
    default: 'pending'
  },
  
  receiptAllocations: [ReceiptAllocationSchema],
  refundAllocations: [RefundAllocationSchema],
  
  paidAmount: { type: Number, default: 0, min: 0 },
  receivedAmount: { type: Number, default: 0, min: 0 },
  refundedAmount: { type: Number, default: 0, min: 0 },
  remainingAmount: { type: Number, default: 0, min: 0 },
  paymentStatus: {
    type: String,
    enum: ['Paid', 'Pending', 'Partially Paid', 'Refunded', 'Partially Refunded'], // ✅ ADDED: Partially Refunded
    default: 'Pending'
  },
  
  connectedDocuments: {
    type: {
      receiptIds: [{ type: Schema.Types.ObjectId, ref: 'Voucher' }],
      refundIds: [{ type: Schema.Types.ObjectId, ref: 'Voucher' }],
      deliveryId: { type: Schema.Types.ObjectId, ref: 'DeliveryNote' },
      quotationId: { type: Schema.Types.ObjectId, ref: 'Quotation' }
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
InvoiceSchema.index({ isDeleted: 1, createdAt: -1 });
InvoiceSchema.index({ status: 1 });
InvoiceSchema.index({ customerName: 1 });
InvoiceSchema.index({ paymentStatus: 1 });
InvoiceSchema.index({ 'connectedDocuments.receiptIds': 1 });
InvoiceSchema.index({ 'connectedDocuments.refundIds': 1 });
InvoiceSchema.index({ 'connectedDocuments.quotationId': 1 });
InvoiceSchema.index({ 'receiptAllocations.voucherId': 1 });
InvoiceSchema.index({ 'refundAllocations.voucherId': 1 });

// ✅ FIXED: Pre-save middleware with partial refund status
InvoiceSchema.pre('save', function(next) {
  // Calculate paid amount from receipt allocations
  if (this.receiptAllocations && this.receiptAllocations.length > 0) {
    this.paidAmount = this.receiptAllocations.reduce(
      (sum: number, alloc: IReceiptAllocation) => sum + alloc.allocatedAmount, 
      0
    );
  } else if (!this.isModified('paidAmount')) {
    this.paidAmount = 0;
  }
  
  // Calculate refunded amount from refund allocations
  if (this.refundAllocations && this.refundAllocations.length > 0) {
    this.refundedAmount = this.refundAllocations.reduce(
      (sum: number, alloc: IRefundAllocation) => sum + alloc.refundedAmount, 
      0
    );
  } else if (!this.isModified('refundedAmount')) {
    this.refundedAmount = 0;
  }
  
  // Use whichever is greater between paidAmount and receivedAmount
  const effectiveAmount = Math.max(this.paidAmount, this.receivedAmount || 0);
  
  // Recalculate remainingAmount
  this.remainingAmount = Math.max(0, this.grandTotal - effectiveAmount);
  
  // ✅ IMPROVED: Auto-calculate payment status with partial refund support
  // Use epsilon for floating-point comparison (0.01 = 1 fils tolerance)
  const EPSILON = 0.01;
  
  if (this.refundedAmount > 0) {
    // Has refunds - determine if full or partial
    const refundDifference = this.paidAmount - this.refundedAmount;
    
    if (refundDifference <= EPSILON) {
      // Fully refunded (within 1 fils tolerance)
      this.paymentStatus = 'Refunded';
    } else {
      // Partially refunded
      this.paymentStatus = 'Partially Refunded';
    }
  } else if (effectiveAmount >= this.grandTotal - EPSILON) {
    // Fully paid (no refunds, within 1 fils tolerance)
    this.paymentStatus = 'Paid';
  } else if (effectiveAmount > 0) {
    // Partially paid (no refunds)
    this.paymentStatus = 'Partially Paid';
  } else {
    // Nothing paid yet
    this.paymentStatus = 'Pending';
  }
  
  next();
});

// Pre-find hook
InvoiceSchema.pre(/^find/, function(this: Query<any, any>, next) {
  const options = this.getOptions();
  
  if (options.includeDeleted !== true) {
    this.find({ isDeleted: false });
  }
  
  next();
});

// Existing methods
InvoiceSchema.methods.allocateReceipt = function(
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

InvoiceSchema.methods.deallocateReceipt = function(
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

InvoiceSchema.methods.getTotalAllocated = function(): number {
  if (!this.receiptAllocations || this.receiptAllocations.length === 0) {
    return 0;
  }
  
  return this.receiptAllocations.reduce((sum: number, alloc: IReceiptAllocation) => sum + alloc.allocatedAmount, 0);
};

InvoiceSchema.methods.canAllocate = function(amount: number): boolean {
  const currentAllocated = this.getTotalAllocated();
  return (currentAllocated + amount) <= this.grandTotal;
};

// Refund allocation methods
InvoiceSchema.methods.allocateRefund = function(
  voucherId: mongoose.Types.ObjectId, 
  amount: number
): void {
  if (amount <= 0) {
    throw new Error('Refund amount must be positive');
  }
  
  const currentRefunded = this.getTotalRefunded();
  const maxRefundable = this.paidAmount;
  
  if (currentRefunded + amount > maxRefundable) {
    throw new Error(
      `Cannot refund ${amount}. Would exceed paid amount. ` +
      `Current Refunded: ${currentRefunded}, Paid Amount: ${maxRefundable}`
    );
  }
  
  const existingIndex = this.refundAllocations.findIndex(
    (alloc: any) => alloc.voucherId.toString() === voucherId.toString()
  );
  
  if (existingIndex !== -1) {
    throw new Error('This refund voucher is already allocated to this invoice');
  }
  
  this.refundAllocations.push({
    voucherId,
    refundedAmount: amount,
    refundDate: new Date(),
  });
};

InvoiceSchema.methods.deallocateRefund = function(
  voucherId: mongoose.Types.ObjectId
): number {
  const index = this.refundAllocations.findIndex(
    (alloc: any) => alloc.voucherId.toString() === voucherId.toString()
  );
  
  if (index === -1) {
    return 0;
  }
  
  const amount = this.refundAllocations[index].refundedAmount;
  this.refundAllocations.splice(index, 1);
  
  return amount;
};

InvoiceSchema.methods.getTotalRefunded = function(): number {
  if (!this.refundAllocations || this.refundAllocations.length === 0) {
    return 0;
  }
  
  return this.refundAllocations.reduce((sum: number, alloc: IRefundAllocation) => sum + alloc.refundedAmount, 0);
};

InvoiceSchema.methods.canRefund = function(amount: number): boolean {
  const currentRefunded = this.getTotalRefunded();
  const maxRefundable = this.paidAmount;
  return (currentRefunded + amount) <= maxRefundable;
};

// Audit entry method
InvoiceSchema.methods.addAuditEntry = function(
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