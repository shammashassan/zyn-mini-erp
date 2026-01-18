// models/Voucher.ts - UPDATED: Added voucherDate field

import mongoose, { Document, Schema, models, model, Query } from 'mongoose';

export interface IItem extends Document {
  description: string;
  quantity: number;
  rate: number;
  total: number;
}

export interface IAllocation {
  documentId: mongoose.Types.ObjectId;
  documentType: 'invoice' | 'purchase' | 'expense' | 'debitNote' | 'creditNote';
  amount: number;
  createdAt: Date;
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

export interface IVoucher extends Document {
  _id: string;
  invoiceNumber: string;
  voucherType: 'receipt' | 'payment';
  
  // Party References
  customerName?: string;
  customerId?: mongoose.Types.ObjectId;
  
  supplierName?: string;
  supplierId?: mongoose.Types.ObjectId;
  
  payeeName?: string;
  payeeId?: mongoose.Types.ObjectId;

  vendorName?: string;
  
  customerPhone?: string;
  customerEmail?: string;
  items: IItem[];
  totalAmount: number;
  grandTotal: number;
  paymentMethod: string;
  notes?: string;
  
  voucherDate: Date; // ✅ NEW: Voucher date field
  
  allocations: IAllocation[];
  
  connectedDocuments: {
    invoiceIds?: mongoose.Types.ObjectId[];
    purchaseIds?: mongoose.Types.ObjectId[];
    expenseIds?: mongoose.Types.ObjectId[];
    debitNoteIds?: mongoose.Types.ObjectId[];
    creditNoteIds?: mongoose.Types.ObjectId[];
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
  
  validateAllocations(): boolean;
  getTotalAllocated(): number;
}

const ItemSchema: Schema = new Schema({
  description: { type: String, required: true },
  quantity: { type: Number, required: true },
  rate: { type: Number, required: true },
  total: { type: Number, required: true },
});

const AllocationSchema: Schema = new Schema({
  documentId: { type: Schema.Types.ObjectId, required: true },
  documentType: { 
    type: String, 
    enum: ['invoice', 'purchase', 'expense', 'debitNote' , 'creditNote'], 
    required: true 
  },
  amount: { type: Number, required: true, min: 0 },
  createdAt: { type: Date, default: Date.now },
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

const VoucherSchema: Schema<IVoucher> = new Schema({
  invoiceNumber: { type: String, required: true, unique: true },
  voucherType: { 
    type: String, 
    enum: ['receipt', 'payment'],
    required: true 
  },
  
  // Party Fields
  customerName: { type: String, required: false },
  customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: false },
  
  supplierName: { type: String, required: false },
  supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier', required: false },
  
  payeeName: { type: String, required: false },
  payeeId: { type: Schema.Types.ObjectId, ref: 'Payee', required: false },

  vendorName: { type: String, required: false },
  
  customerPhone: { type: String },
  customerEmail: { type: String },
  items: [ItemSchema],
  totalAmount: { type: Number, required: true },
  grandTotal: { type: Number, required: true },
  paymentMethod: { type: String, required: true },
  notes: { type: String },
  
  voucherDate: { type: Date, required: true }, // ✅ NEW: Voucher date field
  
  allocations: [AllocationSchema],
  
  connectedDocuments: {
    type: {
      invoiceIds: [{ type: Schema.Types.ObjectId, ref: 'Invoice' }],
      purchaseIds: [{ type: Schema.Types.ObjectId, ref: 'Purchase' }],
      expenseIds: [{ type: Schema.Types.ObjectId, ref: 'Expense' }],
      debitNoteIds: [{ type: Schema.Types.ObjectId, ref: 'DebitNote' }],
      creditNoteIds: [{ type: Schema.Types.ObjectId, ref: 'CreditNote' }]
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
VoucherSchema.index({ isDeleted: 1, voucherDate: -1 }); // ✅ UPDATED: Index on voucherDate
VoucherSchema.index({ voucherType: 1 });
VoucherSchema.index({ customerName: 1 });
VoucherSchema.index({ customerId: 1 });
VoucherSchema.index({ supplierName: 1 });
VoucherSchema.index({ supplierId: 1 });
VoucherSchema.index({ payeeName: 1 });
VoucherSchema.index({ payeeId: 1 });
VoucherSchema.index({ vendorName: 1 });
VoucherSchema.index({ 'connectedDocuments.invoiceIds': 1 });
VoucherSchema.index({ 'connectedDocuments.purchaseIds': 1 });
VoucherSchema.index({ 'connectedDocuments.expenseIds': 1 });
VoucherSchema.index({ 'connectedDocuments.debitNoteIds': 1 });
VoucherSchema.index({ 'connectedDocuments.creditNoteIds': 1 });
VoucherSchema.index({ 'allocations.documentId': 1 });

// Pre-save validation
VoucherSchema.pre('save', function(next) {
  if (!this.paymentMethod) {
    return next(new Error('Payment method is required for vouchers'));
  }
  
  if (this.allocations && this.allocations.length > 0) {
    const totalAllocated = this.allocations.reduce(
      (sum: number, alloc: IAllocation) => sum + alloc.amount, 
      0
    );
    
    if (Math.abs(totalAllocated - this.grandTotal) > 0.01) {
      return next(new Error(
        `Total allocated (${totalAllocated}) must equal voucher total (${this.grandTotal})`
      ));
    }
  }
  
  next();
});

// Pre-find hook
VoucherSchema.pre(/^find/, function(this: Query<any, any>, next) {
  const options = this.getOptions();
  
  if (!options.includeDeleted) {
    this.find({ isDeleted: false });
  }
  
  // ✅ UPDATED: Default sort by voucherDate instead of createdAt
  if (!this.getOptions().sort) {
    this.sort({ voucherDate: -1 });
  }
  
  next();
});

// Instance methods
VoucherSchema.methods.validateAllocations = function(): boolean {
  if (!this.allocations || this.allocations.length === 0) {
    return true;
  }
  
  const totalAllocated = this.getTotalAllocated();
  return Math.abs(totalAllocated - this.grandTotal) < 0.01;
};

VoucherSchema.methods.getTotalAllocated = function(): number {
  if (!this.allocations || this.allocations.length === 0) {
    return 0;
  }
  
  return this.allocations.reduce((sum: number, alloc: IAllocation) => sum + alloc.amount, 0);
};

VoucherSchema.methods.addAuditEntry = function(
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

const Voucher = models.Voucher || model<IVoucher>('Voucher', VoucherSchema);

export default Voucher;