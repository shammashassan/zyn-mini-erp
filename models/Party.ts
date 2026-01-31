import mongoose, { Document, Schema, models, model, Query } from 'mongoose';

export interface IParty extends Document {
    _id: string;

    // Identity
    company?: string;          // Legal business name (for companies)
    name?: string;             // Individual name OR human reference

    // Roles (NOT entities - a party can be both)
    roles: {
        customer: boolean;
        supplier: boolean;
    };

    // Address & Tax Identity (Added in Phase 1)
    address?: string;
    city?: string;
    district?: string;
    state?: string;
    country?: string;
    postalCode?: string;
    vatNumber?: string;

    // TEMPORARY - migration support and contact info
    phone?: string;
    email?: string;

    // Soft delete & audit
    isDeleted: boolean;
    deletedAt: Date | null;
    deletedBy: string | null;
    createdBy: string | null;
    updatedBy: string | null;
    createdAt: Date;
    updatedAt: Date;
}

const PartySchema: Schema<IParty> = new Schema({
    company: { type: String, trim: true },
    name: { type: String, trim: true },

    roles: {
        customer: { type: Boolean, default: false },
        supplier: { type: Boolean, default: false }
    },

    // Address fields
    address: { type: String, trim: true },
    city: { type: String, trim: true },
    district: { type: String, trim: true },
    state: { type: String, trim: true },
    country: { type: String, trim: true },
    postalCode: { type: String, trim: true },
    vatNumber: { type: String, trim: true },

    // Temporary contact fields
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },

    // Metadata
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: String, default: null },
    createdBy: { type: String, default: null },
    updatedBy: { type: String, default: null },
}, {
    timestamps: true,
});

// Indexes
PartySchema.index({ isDeleted: 1, createdAt: -1 });
PartySchema.index({ 'roles.customer': 1 });
PartySchema.index({ 'roles.supplier': 1 });
PartySchema.index({ company: 1 });
PartySchema.index({ name: 1 });
PartySchema.index({ vatNumber: 1 }); // Useful for identifying businesses

// Pre-find hook to exclude soft-deleted records by default
PartySchema.pre(/^find/, function (this: Query<any, any>, next) {
    const options = this.getOptions();
    if (!options.includeDeleted) {
        this.find({ isDeleted: false });
    }
    next();
});

const Party = models.Party || model<IParty>('Party', PartySchema);

export default Party;
