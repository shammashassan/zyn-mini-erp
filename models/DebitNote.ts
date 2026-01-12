// models/DebitNote.ts - UPDATED: Added status field

import mongoose, { Document, Schema, models, model, Query } from 'mongoose';

export interface IDebitNoteItem {
  materialId?: string;
  materialName: string;
  quantity: number;
  unitCost: number;
  total: number;
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

export interface IDebitNote extends Document {
  _id: string;
  debitNoteNumber: string;
  returnNoteId?: mongoose.Types.ObjectId;
  returnNumber?: string;
  supplierName?: string;
  supplierId?: mongoose.Types.ObjectId;
  customerName?: string;
  customerId?: mongoose.Types.ObjectId;
  payeeName?: string;
  payeeId?: mongoose.Types.ObjectId;
  vendorName?: string;
  items: IDebitNoteItem[];
  totalAmount: number;
  discount: number;
  isTaxPayable: boolean;
  vatAmount: number;
  grandTotal: number;
  debitDate: Date;
  notes?: string;
  reason?: string;
  
  status: 'pending' | 'approved' | 'cancelled';
  
  receiptAllocations: IReceiptAllocation[];
  receivedAmount: number;
  remainingAmount: number;
  paymentStatus: 'pending' | 'paid' | 'partially paid';
  
  debitType: 'return' | 'adjustment' | 'standalone';
  
  connectedDocuments: {
    receiptIds?: mongoose.Types.ObjectId[];
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

const DebitNoteItemSchema: Schema = new Schema({
  materialId: { type: String, required: false },
  materialName: { type: String, required: true },
  quantity: { type: Number, required: true, min: 0 },
  unitCost: { type: Number, required: true, min: 0 },
  total: { type: Number, required: true, min: 0 },
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

const DebitNoteSchema: Schema<IDebitNote> = new Schema({
  debitNoteNumber: { type: String, required: true, unique: true },
  returnNoteId: { 
    type: Schema.Types.ObjectId, 
    ref: 'ReturnNote',
  },
  returnNumber: { type: String },
  supplierName: { type: String, required: false },
  supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier', required: false },
  customerName: { type: String, required: false },
  customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: false },
  payeeName: { type: String, required: false },
  payeeId: { type: Schema.Types.ObjectId, ref: 'Payee', required: false },
  vendorName: { type: String, required: false },
  items: [DebitNoteItemSchema],
  totalAmount: { type: Number, required: true, min: 0 },
  discount: { type: Number, default: 0, min: 0 },
  isTaxPayable: { type: Boolean, default: false },
  vatAmount: { type: Number, default: 0, min: 0 },
  grandTotal: { type: Number, required: true, min: 0 },
  debitDate: { type: Date, required: true },
  notes: { type: String },
  reason: { type: String },
  
  status: {
    type: String,
    enum: ['pending', 'approved', 'cancelled'],
    default: 'pending'
  },
  
  receiptAllocations: [ReceiptAllocationSchema],
  receivedAmount: { type: Number, default: 0, min: 0 },
  remainingAmount: { type: Number, default: 0, min: 0 },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'partially paid'],
    default: 'pending'
  },
  
  debitType: {
    type: String,
    enum: ['return', 'adjustment', 'standalone'],
    default: 'standalone'
  },
  
  connectedDocuments: {
    type: {
      receiptIds: [{ type: Schema.Types.ObjectId, ref: 'Voucher' }]
    },
    default: { receiptIds: [] }
  },
  
  isDeleted: { type: Boolean, default: false, index: true },
  deletedAt: { type: Date, default: null },
  deletedBy: { type: String, default: null },
  
  createdBy: { type: String, default: null },
  updatedBy: { type: String, default: null },
  actionHistory: [AuditEntrySchema],
}, { timestamps: true });

// Indexes
DebitNoteSchema.index({ isDeleted: 1, debitDate: -1 });
DebitNoteSchema.index({ status: 1 });
DebitNoteSchema.index({ paymentStatus: 1 });
DebitNoteSchema.index({ returnNoteId: 1 });
DebitNoteSchema.index({ supplierName: 1 });
DebitNoteSchema.index({ supplierId: 1 });
DebitNoteSchema.index({ customerName: 1 });
DebitNoteSchema.index({ customerId: 1 });
DebitNoteSchema.index({ payeeName: 1 });
DebitNoteSchema.index({ payeeId: 1 });
DebitNoteSchema.index({ vendorName: 1 });
DebitNoteSchema.index({ 'connectedDocuments.receiptIds': 1 });
DebitNoteSchema.index({ 'receiptAllocations.voucherId': 1 });

// Pre-save middleware
DebitNoteSchema.pre('save', function(next) {
  // Calculate amounts
  const grossTotal = this.totalAmount;
  const discount = this.discount || 0;
  const subtotal = grossTotal - discount;
  const vatAmount = this.isTaxPayable ? (subtotal * 0.05) : 0;
  
  this.vatAmount = vatAmount;
  this.grandTotal = subtotal + vatAmount;
  
  // Calculate receipt allocations
  if (this.receiptAllocations && this.receiptAllocations.length > 0) {
    this.receivedAmount = this.receiptAllocations.reduce(
      (sum: number, alloc: IReceiptAllocation) => sum + alloc.allocatedAmount, 
      0
    );
  } else if (!this.isModified('receivedAmount')) {
    this.receivedAmount = 0;
  }
  
  this.remainingAmount = Math.max(0, this.grandTotal - this.receivedAmount);
  
  // Auto-calculate payment status
  if (this.receivedAmount >= this.grandTotal) {
    this.paymentStatus = 'paid';
  } else if (this.receivedAmount > 0) {
    this.paymentStatus = 'partially paid';
  } else {
    this.paymentStatus = 'pending';
  }
  
  next();
});

// Pre-find hook
DebitNoteSchema.pre(/^find/, function(this: Query<any, any>, next) {
  const options = this.getOptions();
  
  if (!options.includeDeleted) {
    this.find({ isDeleted: false });
  }
  
  if (!this.getOptions().sort) {
    this.sort({ debitDate: -1 });
  }
  
  next();
});

// Receipt allocation methods
DebitNoteSchema.methods.allocateReceipt = function(
  voucherId: mongoose.Types.ObjectId, 
  amount: number
): void {
  if (amount <= 0) {
    throw new Error('Allocation amount must be positive');
  }
  
  const currentAllocated = this.getTotalAllocated();
  
  if (currentAllocated + amount > this.grandTotal) {
    throw new Error(
      `Cannot allocate ${amount}. Would exceed debit note total. ` +
      `Current: ${currentAllocated}, Total: ${this.grandTotal}`
    );
  }
  
  const existingIndex = this.receiptAllocations.findIndex(
    (alloc: any) => alloc.voucherId.toString() === voucherId.toString()
  );
  
  if (existingIndex !== -1) {
    throw new Error('This voucher is already allocated to this debit note');
  }
  
  this.receiptAllocations.push({
    voucherId,
    allocatedAmount: amount,
    allocationDate: new Date(),
  });
};

DebitNoteSchema.methods.deallocateReceipt = function(
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

DebitNoteSchema.methods.getTotalAllocated = function(): number {
  if (!this.receiptAllocations || this.receiptAllocations.length === 0) {
    return 0;
  }
  
  return this.receiptAllocations.reduce(
    (sum: number, alloc: IReceiptAllocation) => sum + alloc.allocatedAmount, 
    0
  );
};

DebitNoteSchema.methods.canAllocate = function(amount: number): boolean {
  const currentAllocated = this.getTotalAllocated();
  return (currentAllocated + amount) <= this.grandTotal;
};

// Audit entry method
DebitNoteSchema.methods.addAuditEntry = function(
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

const DebitNote = models.DebitNote || model<IDebitNote>('DebitNote', DebitNoteSchema);

export default DebitNote;