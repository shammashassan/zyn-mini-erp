import mongoose, { Document, Schema, models, model } from 'mongoose';

export interface ICompanyDetails extends Document {
  companyName: string;
  logoUrl?: string;
  website?: string;
  email?: string;
  contactNumber?: string;
  telephone?: string;
  address?: string;
  bankDetails?: string;
}

const CompanyDetailsSchema: Schema<ICompanyDetails> = new Schema({
  companyName: { type: String, required: true },
  logoUrl: { type: String },
  website: { type: String },
  email: { type: String },
  contactNumber: { type: String },
  telephone: { type: String },
  address: { type: String },
  bankDetails: { type: String },
});

const CompanyDetails = models.CompanyDetails || model<ICompanyDetails>('CompanyDetails', CompanyDetailsSchema);

export default CompanyDetails;