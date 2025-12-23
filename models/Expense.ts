// models/Expense.ts - UPDATED with Payee and Supplier References

import mongoose, { Document, Schema, models, model, Query } from 'mongoose';

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

export interface IExpense extends Document {
  _id: string;
  referenceNumber: string;
  description: string;
  amount: number;
  category: string;
  type: 'single' | 'period';
  date: Date;
  
  // ✅ UPDATED: Enhanced vendor tracking with references
  vendor?: string; // Kept for backward compatibility and manual entry
  payeeId?: mongoose.Types.ObjectId; // Reference to Payee
  supplierId?: mongoose.Types.ObjectId; // Reference to Supplier
  
  notes?: string;
  
  status: 'pending' | 'approved' | 'cancelled';
  paymentStatus: 'Pending' | 'Paid' | 'Partially Paid';
  paymentAllocations: IPaymentAllocation[];
  paidAmount: number;
  remainingAmount: number;
  
  connectedDocuments: {
    paymentIds: mongoose.Types.ObjectId[];
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

const ExpenseSchema: Schema<IExpense> = new Schema({
  referenceNumber: { 
    type: String, 
    required: true, 
    unique: true 
  },
  description: { 
    type: String, 
    required: true, 
    trim: true, 
    minlength: [3, 'Description must be at least 3 characters'], 
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  amount: { 
    type: Number, 
    required: true, 
    min: [0, 'Amount must be positive'], 
    max: [10000000, 'Amount cannot exceed 10M']
  },
  category: { 
    type: String, 
    required: true,
    enum: {
      values: ['Office Supplies', 'Travel', 'Marketing', 'Utilities', 'Software','Equipment', 'Meals', 'Professional Services', 'Rent', 'Salary','Insurance', 'Entertainment', 'Miscellaneous'],
      message: '{VALUE} is not a valid expense category'
    }
  },
  type: {
    type: String,
    enum: {
      values: ['single', 'period'],
      message: '{VALUE} is not a valid expense type'
    },
    required: true,
    default: 'single'
  },
  date: { 
    type: Date, 
    required: true
  },
  
  // ✅ UPDATED: Enhanced vendor tracking
  vendor: { 
    type: String, 
    trim: true, 
    maxlength: [200, 'Vendor name cannot exceed 200 characters'] 
  },
  payeeId: {
    type: Schema.Types.ObjectId,
    ref: 'Payee',
    required: false
  },
  supplierId: {
    type: Schema.Types.ObjectId,
    ref: 'Supplier',
    required: false
  },
  
  notes: { 
    type: String, 
    trim: true, 
    maxlength: [1000, 'Notes cannot exceed 1000 characters'] 
  },
  
  status: {
    type: String,
    enum: ['pending', 'approved', 'cancelled'],
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    enum: ['Pending', 'Paid', 'Partially Paid'],
    default: 'Pending'
  },
  paymentAllocations: [PaymentAllocationSchema],
  paidAmount: { type: Number, default: 0, min: 0 },
  remainingAmount: { type: Number, default: 0, min: 0 },
  
  connectedDocuments: {
    type: {
      paymentIds: [{ type: Schema.Types.ObjectId, ref: 'Voucher' }],
    },
    default: { paymentIds: [] }
  },
  
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
  deletedBy: { type: String, default: null },
  
  createdBy: { type: String, default: null },
  updatedBy: { type: String, default: null },
  actionHistory: [AuditEntrySchema],
}, { 
  timestamps: true,
  collection: 'expenses'
});

// Compound indexes
ExpenseSchema.index({ isDeleted: 1, date: -1 });
ExpenseSchema.index({ category: 1 });
ExpenseSchema.index({ type: 1, date: -1 });
ExpenseSchema.index({ status: 1, paymentStatus: 1 });
ExpenseSchema.index({ createdAt: -1 });
ExpenseSchema.index({ date: 1 });
ExpenseSchema.index({ 'connectedDocuments.paymentIds': 1 });
ExpenseSchema.index({ 'paymentAllocations.voucherId': 1 });

// ✅ NEW: Add indexes for payee and supplier references
ExpenseSchema.index({ payeeId: 1 });
ExpenseSchema.index({ supplierId: 1 });

// Pre-save middleware
ExpenseSchema.pre('save', function(next) {
  if (!this.referenceNumber) {
    return next(new Error('Reference number is required'));
  }
  
  if (this.amount < 0) {
    return next(new Error('Amount cannot be negative'));
  }
  
  // Calculate paid amount from allocations
  if (this.paymentAllocations && this.paymentAllocations.length > 0) {
    this.paidAmount = this.paymentAllocations.reduce(
      (sum: number, alloc: IPaymentAllocation) => sum + alloc.allocatedAmount, 
      0
    );
  } else if (!this.isModified('paidAmount')) {
    this.paidAmount = 0;
  }
  
  this.remainingAmount = Math.max(0, this.amount - this.paidAmount);
  
  // Auto-calculate payment status
  if (this.paidAmount >= this.amount) {
    this.paymentStatus = 'Paid';
  } else if (this.paidAmount > 0) {
    this.paymentStatus = 'Partially Paid';
  } else {
    this.paymentStatus = 'Pending';
  }
  
  next();
});

// Pre-find hook
ExpenseSchema.pre(/^find/, function(this: Query<any, any>, next) {
  const options = this.getOptions();
  
  if (!options.includeDeleted) {
    this.find({ isDeleted: false });
  }
  
  next();
});

// Payment allocation methods
ExpenseSchema.methods.allocatePayment = function(
  voucherId: mongoose.Types.ObjectId, 
  amount: number
): void {
  if (amount <= 0) {
    throw new Error('Allocation amount must be positive');
  }
  
  const currentAllocated = this.getTotalAllocated();
  
  if (currentAllocated + amount > this.amount) {
    throw new Error(
      `Cannot allocate ${amount}. Would exceed expense total. ` +
      `Current: ${currentAllocated}, Expense Total: ${this.amount}`
    );
  }
  
  const existingIndex = this.paymentAllocations.findIndex(
    (alloc: any) => alloc.voucherId.toString() === voucherId.toString()
  );
  
  if (existingIndex !== -1) {
    throw new Error('This voucher is already allocated to this expense');
  }
  
  this.paymentAllocations.push({
    voucherId,
    allocatedAmount: amount,
    allocationDate: new Date(),
  });
};

ExpenseSchema.methods.deallocatePayment = function(
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

ExpenseSchema.methods.getTotalAllocated = function(): number {
  if (!this.paymentAllocations || this.paymentAllocations.length === 0) {
    return 0;
  }
  
  return this.paymentAllocations.reduce(
    (sum: number, alloc: IPaymentAllocation) => sum + alloc.allocatedAmount, 
    0
  );
};

ExpenseSchema.methods.canAllocate = function(amount: number): boolean {
  const currentAllocated = this.getTotalAllocated();
  return (currentAllocated + amount) <= this.amount;
};

ExpenseSchema.methods.addAuditEntry = function(
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

ExpenseSchema.set('toJSON', { virtuals: true });
ExpenseSchema.set('toObject', { virtuals: true });

const Expense = models.Expense || model<IExpense>('Expense', ExpenseSchema);

export default Expense;