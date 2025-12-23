// models/StockAdjustment.ts

import mongoose, { Document, Schema, models, model, Query } from 'mongoose';

export interface IStockAdjustment extends Document {
  _id: string;
  materialId: mongoose.Types.ObjectId;
  materialName: string;
  adjustmentType: 'increment' | 'decrement';
  value: number;
  oldStock: number;
  newStock: number;
  oldUnitCost?: number;
  newUnitCost?: number;
  adjustmentReason?: string;
  
  // Soft delete fields
  isDeleted: boolean;
  deletedAt: Date | null;
  deletedBy: string | null;
  
  createdAt: Date;
}

const stockAdjustmentSchema: Schema<IStockAdjustment> = new Schema({
  materialId: { type: Schema.Types.ObjectId, required: true, ref: 'Material' },
  materialName: { type: String, required: true, trim: true },
  adjustmentType: { type: String, required: true, enum: ['increment', 'decrement'] },
  value: { type: Number, required: true, min: 0 },
  oldStock: { type: Number, required: true },
  newStock: { type: Number, required: true },
  oldUnitCost: { type: Number },
  newUnitCost: { type: Number },
  adjustmentReason: { type: String, trim: true },
  
  // Soft delete fields
  isDeleted: { type: Boolean, default: false, index: true },
  deletedAt: { type: Date, default: null },
  deletedBy: { type: String, default: null },
  
  createdAt: { type: Date, required: true, default: Date.now },
});

// Index for efficient querying of active records
stockAdjustmentSchema.index({ isDeleted: 1, createdAt: -1 });

// Add a pre-find hook to exclude soft-deleted records by default
stockAdjustmentSchema.pre(/^find/, function(this: Query<any, any>, next) {
  const options = this.getOptions();
  
  if (!options.includeDeleted) {
    this.find({ isDeleted: false });
  }
  
  next();
});

const StockAdjustment = models.StockAdjustment || model<IStockAdjustment>('StockAdjustment', stockAdjustmentSchema);

export default StockAdjustment;