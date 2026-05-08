import mongoose, { Document, Schema, models, model, Query } from 'mongoose';

export interface IContact extends Document<string> {
    partyId: mongoose.Types.ObjectId;         // REQUIRED - parent Party

    // Human identity
    name: string;              // Person name
    designation?: string;      // Owner / Accounts / Sales Manager

    // Communication
    phone?: string;
    email?: string;

    // Behavior
    isPrimary: boolean;        // Default contact for documents
    isActive: boolean;

    // Metadata & Audit
    isDeleted: boolean;
    deletedAt: Date | null;
    deletedBy: string | null;
    createdBy: string | null;
    updatedBy: string | null;
    createdAt: Date;
    updatedAt: Date;
}

const ContactSchema: Schema<IContact> = new Schema({
    partyId: {
        type: Schema.Types.ObjectId,
        ref: 'Party',
        required: true,
        index: true
    },

    name: { type: String, required: true, trim: true },
    designation: { type: String, trim: true },

    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },

    isPrimary: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },

    // Soft delete & Metadata
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: String, default: null },
    createdBy: { type: String, default: null },
    updatedBy: { type: String, default: null },
}, {
    timestamps: true,
});

// Indexes
ContactSchema.index({ partyId: 1, isPrimary: 1 });
ContactSchema.index({ partyId: 1, isActive: 1 });
ContactSchema.index({ name: 1 });
ContactSchema.index({ phone: 1 });
ContactSchema.index({ email: 1 });
ContactSchema.index({ isDeleted: 1, createdAt: -1 });

// Pre-find hook to exclude soft-deleted records by default
ContactSchema.pre(/^find/, function (this: Query<any, any>, next) {
    const options = this.getOptions();
    if (!options.includeDeleted) {
        this.find({ isDeleted: false });
    }
    next();
});

const Contact = models.Contact || model<IContact>('Contact', ContactSchema);

export default Contact;
