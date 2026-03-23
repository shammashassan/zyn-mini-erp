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

    // Metadata
    isDeleted: boolean;
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

    isDeleted: { type: Boolean, default: false },
}, {
    timestamps: true,
});

// Indexes
ContactSchema.index({ partyId: 1, isPrimary: 1 });
ContactSchema.index({ partyId: 1, isActive: 1 });
ContactSchema.index({ name: 1 });
ContactSchema.index({ phone: 1 });
ContactSchema.index({ email: 1 });

// Ensure only one primary contact per party (optional but recommended uniqueness constraint)
// Note: This needs careful handling during updates if we want strict db-level constraint, 
// but often handled in logic to avoid race conditions. 
// For now, we'll index for performance but manage uniqueness in logic/API.

const Contact = models.Contact || model<IContact>('Contact', ContactSchema);

export default Contact;
