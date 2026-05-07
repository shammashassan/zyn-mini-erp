// models/POSSale.ts

import mongoose, { Document, Schema, models, model, Query } from 'mongoose';

export interface IPOSSaleItem {
    itemId?: mongoose.Types.ObjectId;
    description: string;
    quantity: number;
    rate: number;
    total: number;
    taxRate?: number;
    taxAmount?: number;
    returnedQuantity?: number;
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

export interface IPOSSale extends Document<string> {
    saleNumber: string;

    // Customer
    customerType: 'walk-in' | 'party';
    customerName: string;
    partyId?: mongoose.Types.ObjectId;
    partySnapshot?: {
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
    };

    // Items
    items: IPOSSaleItem[];

    // Financials
    discount: number;
    totalAmount: number;  // gross (before discount)
    vatAmount: number;
    grandTotal: number;
    paymentMethod: string;

    // Auto-created references — needed to reverse on soft-delete
    journalId?: mongoose.Types.ObjectId;
    stockAdjustmentIds: mongoose.Types.ObjectId[];
    
    // Connections
    connectedDocuments?: {
        returnNoteIds?: mongoose.Types.ObjectId[];
    };

    // Soft delete
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
}

const POSSaleItemSchema = new Schema({
    itemId: { type: Schema.Types.ObjectId, ref: 'Item', required: false },
    description: { type: String, required: true },
    quantity: { type: Number, required: true },
    rate: { type: Number, required: true },
    total: { type: Number, required: true },
    taxRate: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    returnedQuantity: { type: Number, default: 0 },
});

const PartySnapshotSchema = new Schema({
    displayName: { type: String, required: true },
    address: {
        street: String, city: String, district: String,
        state: String, country: String, postalCode: String,
    },
    taxIdentifiers: { vatNumber: String },
}, { _id: false });

const AuditEntrySchema = new Schema({
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

const POSSaleSchema = new Schema<IPOSSale>({
    saleNumber: { type: String, required: true, unique: true, index: true },

    customerType: { type: String, enum: ['walk-in', 'party'], default: 'walk-in' },
    customerName: { type: String, required: true, default: 'Walk-in Customer' },
    partyId: { type: Schema.Types.ObjectId, ref: 'Party', required: false, index: true },
    partySnapshot: { type: PartySnapshotSchema, required: false },

    items: { type: [POSSaleItemSchema], required: true },

    discount: { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, required: true },
    vatAmount: { type: Number, default: 0 },
    grandTotal: { type: Number, required: true },
    paymentMethod: { type: String, required: true, default: 'Cash' },

    journalId: { type: Schema.Types.ObjectId, ref: 'Journal', required: false },
    stockAdjustmentIds: [{ type: Schema.Types.ObjectId, ref: 'StockAdjustment' }],

    connectedDocuments: {
        returnNoteIds: [{ type: Schema.Types.ObjectId, ref: 'ReturnNote' }]
    },

    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: String, default: null },

    createdBy: { type: String, default: null },
    updatedBy: { type: String, default: null },
    actionHistory: [AuditEntrySchema],
}, { timestamps: true });

POSSaleSchema.index({ isDeleted: 1, createdAt: -1 });
POSSaleSchema.index({ customerName: 'text', saleNumber: 'text' });

POSSaleSchema.pre(/^find/, function (this: Query<any, any>, next) {
    const options = this.getOptions();
    if (!options.includeDeleted) {
        this.find({ isDeleted: false });
    }
    next();
});

POSSaleSchema.methods.addAuditEntry = function (
    action: string,
    userId: string | null = null,
    username: string | null = null,
    changes?: IAuditEntry['changes']
) {
    if (!this.actionHistory) {
        this.actionHistory = [];
    }
    this.actionHistory.push({
        action,
        userId,
        username,
        timestamp: new Date(),
        changes,
    });
};

const POSSale = models.POSSale || model<IPOSSale>('POSSale', POSSaleSchema);
export default POSSale;