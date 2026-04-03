// models/StockAdjustment.ts 

import mongoose, { Document, Schema, models, model, Query } from 'mongoose';

export interface IStockAdjustment extends Document<string> {
  /** References unified Item model */
  itemId: mongoose.Types.ObjectId;
  itemName: string;

  adjustmentType: 'increment' | 'decrement';
  value: number;
  oldStock: number;
  newStock: number;
  oldCostPrice?: number;
  newCostPrice?: number;
  adjustmentReason?: string;

  referenceId?: mongoose.Types.ObjectId;
  referenceModel?: 'Invoice' | 'Purchase' | 'ReturnNote';

  // Soft delete
  isDeleted: boolean;
  deletedAt: Date | null;
  deletedBy: string | null;

  createdAt: Date;
}

const stockAdjustmentSchema: Schema<IStockAdjustment> = new Schema({
  itemId: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: 'Item',
    index: true,
  },
  itemName: { type: String, required: true, trim: true },

  adjustmentType: {
    type: String,
    required: true,
    enum: ['increment', 'decrement'],
  },
  value: { type: Number, required: true, min: 0 },
  oldStock: { type: Number, required: true },
  newStock: { type: Number, required: true },
  oldCostPrice: { type: Number },
  newCostPrice: { type: Number },
  adjustmentReason: { type: String, trim: true },

  referenceId: { type: Schema.Types.ObjectId, required: false },
  referenceModel: {
    type: String,
    required: false,
    enum: ['Invoice', 'Purchase', 'ReturnNote'],
  },

  // Soft delete
  isDeleted: { type: Boolean, default: false, index: true },
  deletedAt: { type: Date, default: null },
  deletedBy: { type: String, default: null },

  createdAt: { type: Date, required: true, default: Date.now },
});

stockAdjustmentSchema.index({ isDeleted: 1, createdAt: -1 });

stockAdjustmentSchema.pre(/^find/, function (this: Query<any, any>, next) {
  const options = this.getOptions();
  if (!options.includeDeleted) {
    this.find({ isDeleted: false });
  }
  next();
});

const StockAdjustment =
  models.StockAdjustment ||
  model<IStockAdjustment>('StockAdjustment', stockAdjustmentSchema);

export default StockAdjustment;