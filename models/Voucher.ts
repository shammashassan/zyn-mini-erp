// models/Voucher.ts - UPDATED: Fixed Duplicate Key Error

import mongoose, { Document, Schema, models, model, Query } from 'mongoose';

export interface IItem extends Document {
  description: string;
  quantity: number;
  rate: number;
  total: number;
}

export interface IAllocation {
  documentId: mongoose.Types.ObjectId;
  documentType: 'invoice' | 'purchase' | 'expense';
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
  voucherType: 'receipt' | 'payment' | 'refund';
  
  // Party References
  customerName?: string;
  customerId?: mongoose.Types.ObjectId;
  
  supplierName?: string;
  supplierId?: mongoose.Types.ObjectId;
  
  payeeName?: string;
  payeeId?: mongoose.Types.ObjectId;

  // ✅ ADDED: Manual Vendor Name
  vendorName?: string;
  
  customerPhone?: string;
  customerEmail?: string;
  items: IItem[];
  totalAmount: number;
  grandTotal: number;
  paymentMethod: string;
  notes?: string;
  
  allocations: IAllocation[];
  
  connectedDocuments: {
    invoiceIds?: mongoose.Types.ObjectId[];
    purchaseIds?: mongoose.Types.ObjectId[];
    expenseIds?: mongoose.Types.ObjectId[];
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
    enum: ['invoice', 'purchase', 'expense'], 
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
    enum: ['receipt', 'payment', 'refund'],
    required: true 
  },
  
  // Party Fields
  customerName: { type: String, required: false },
  customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: false },
  
  supplierName: { type: String, required: false },
  supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier', required: false },
  
  payeeName: { type: String, required: false },
  payeeId: { type: Schema.Types.ObjectId, ref: 'Payee', required: false },

  // ✅ ADDED: Vendor Name for manual entries
  vendorName: { type: String, required: false },
  
  customerPhone: { type: String },
  customerEmail: { type: String },
  items: [ItemSchema],
  totalAmount: { type: Number, required: true },
  grandTotal: { type: Number, required: true },
  paymentMethod: { type: String, required: true },
  notes: { type: String },
  
  allocations: [AllocationSchema],
  
  connectedDocuments: {
    type: {
      invoiceIds: [{ type: Schema.Types.ObjectId, ref: 'Invoice' }],
      purchaseIds: [{ type: Schema.Types.ObjectId, ref: 'Purchase' }],
      expenseIds: [{ type: Schema.Types.ObjectId, ref: 'Expense' }]
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
VoucherSchema.index({ isDeleted: 1, createdAt: -1 });
VoucherSchema.index({ voucherType: 1 });
VoucherSchema.index({ customerName: 1 });
VoucherSchema.index({ customerId: 1 });
VoucherSchema.index({ supplierName: 1 });
VoucherSchema.index({ supplierId: 1 });
VoucherSchema.index({ payeeName: 1 });
VoucherSchema.index({ payeeId: 1 });
VoucherSchema.index({ vendorName: 1 }); // ✅ ADDED
VoucherSchema.index({ 'connectedDocuments.invoiceIds': 1 });
VoucherSchema.index({ 'connectedDocuments.purchaseIds': 1 });
VoucherSchema.index({ 'connectedDocuments.expenseIds': 1 });
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