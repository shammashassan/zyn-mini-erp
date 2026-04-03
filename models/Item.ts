// models/Item.ts - Unified Item model (replaces Product + Material)

import mongoose, { Document, Schema, models, model, Query } from 'mongoose';

export interface IBOMComponent {
    itemId: mongoose.Types.ObjectId;
    quantity: number;
    unit: string;
}

export interface IItem extends Document<string> {
    name: string;

    /**
     * An item can be a "product" (sellable), "material" (purchasable/consumable), or both.
     * This replaces the separate Product and Material models.
     */
    types: ('product' | 'material')[];

    /** Replaces Product.type and Material.type */
    category: string;

    // ── Pricing ──────────────────────────────────────────────────────────────
    /** Used when selling (invoices). Replaces Product.price */
    sellingPrice: number;
    /** Used when purchasing (purchases). Replaces Material.unitCost */
    costPrice: number;

    // ── Tax ──────────────────────────────────────────────────────────────────
    taxRate: number;               // default 5 (UAE VAT)
    taxType: 'standard' | 'zero' | 'exempt';

    // ── Stock / Unit  (relevant when types includes "material") ───────────────
    unit: string;
    stock: number;
    minStockLevel: number;
    baseUnitLocked: boolean;

    // ── BOM  (relevant when types includes "product") ────────────────────────
    bom: IBOMComponent[];

    // ── Optional metadata ────────────────────────────────────────────────────
    sku?: string;
    barcode?: string;
    notes?: string;

    // ── Soft delete ──────────────────────────────────────────────────────────
    isDeleted: boolean;
    deletedAt: Date | null;
    deletedBy: string | null;

    createdAt: Date;
    updatedAt: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-schemas
// ─────────────────────────────────────────────────────────────────────────────

const BOMComponentSchema: Schema = new Schema(
    {
        itemId: { type: Schema.Types.ObjectId, ref: 'Item', required: true },
        quantity: { type: Number, required: true, min: 0 },
        unit: { type: String, required: true },
    },
    { _id: false }
);

// ─────────────────────────────────────────────────────────────────────────────
// Main schema
// ─────────────────────────────────────────────────────────────────────────────

const ItemSchema: Schema<IItem> = new Schema(
    {
        name: { type: String, required: true, trim: true },

        types: {
            type: [{ type: String, enum: ['product', 'material'] }],
            required: true,
            validate: {
                validator: (v: string[]) => Array.isArray(v) && v.length > 0,
                message: 'An item must have at least one type (product or material)',
            },
        },

        category: { type: String, required: true, trim: true },

        // Pricing
        sellingPrice: { type: Number, default: 0, min: 0 },
        costPrice: { type: Number, default: 0, min: 0 },

        // Tax
        taxRate: { type: Number, default: 5, min: 0 },
        taxType: {
            type: String,
            enum: ['standard', 'zero', 'exempt'],
            default: 'standard',
        },

        // Stock / Unit
        unit: { type: String, default: 'piece', trim: true },
        stock: { type: Number, default: 0, min: 0 },
        minStockLevel: { type: Number, default: 0, min: 0 },
        baseUnitLocked: { type: Boolean, default: false },

        // BOM
        bom: { type: [BOMComponentSchema], default: [] },

        // Optional metadata
        sku: { type: String, trim: true, sparse: true },
        barcode: { type: String, trim: true, sparse: true },
        notes: { type: String },

        // Soft delete
        isDeleted: { type: Boolean, default: false, index: true },
        deletedAt: { type: Date, default: null },
        deletedBy: { type: String, default: null },
    },
    { timestamps: true }
);

// ─────────────────────────────────────────────────────────────────────────────
// Indexes
// ─────────────────────────────────────────────────────────────────────────────

ItemSchema.index({ isDeleted: 1, createdAt: -1 });
ItemSchema.index({ types: 1 });
ItemSchema.index({ category: 1 });
ItemSchema.index({ sku: 1 }, { sparse: true });
ItemSchema.index({ name: 'text', category: 'text', notes: 'text' });

// ─────────────────────────────────────────────────────────────────────────────
// Pre-find hook: exclude soft-deleted by default
// ─────────────────────────────────────────────────────────────────────────────

ItemSchema.pre(/^find/, function (this: Query<any, any>, next) {
    const options = this.getOptions();
    if (!options.includeDeleted) {
        this.find({ isDeleted: false });
    }
    next();
});

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Returns the primary price for the given usage context */
ItemSchema.methods.priceForContext = function (
    context: 'sale' | 'purchase'
): number {
    return context === 'sale' ? this.sellingPrice : this.costPrice;
};

const Item = models.Item || model<IItem>('Item', ItemSchema);

export default Item;