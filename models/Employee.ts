// models/Employee.ts  — UPDATED: added salaryFrequency + payeeId

import mongoose, { Document, Schema, models, model, Query } from 'mongoose';

export interface IEmployee extends Document<string> {
  firstName: string;
  lastName: string;
  role: string;
  email?: string;
  address1?: string;
  address2?: string;
  mobiles: string[];
  passport?: string;
  dob?: Date;
  civilStatus?: 'Single' | 'Married' | 'Divorced' | 'Widowed';
  salary?: number;
  /** The frequency that `salary` refers to */
  salaryFrequency?: 'daily' | 'weekly' | 'monthly';
  /** Linked Payee for salary disbursements */
  payeeId?: mongoose.Types.ObjectId;
  joinedDate?: Date;
  description?: string;
  avatar?: string;

  // Soft delete fields
  isDeleted: boolean;
  deletedAt: Date | null;
  deletedBy: string | null;

  createdAt: Date;
  updatedAt: Date;
}

const employeeSchema: Schema<IEmployee> = new Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    role: { type: String, required: true, trim: true },
    email: { type: String, trim: true },
    address1: { type: String, trim: true },
    address2: { type: String, trim: true },
    mobiles: [{ type: String, trim: true }],
    passport: { type: String, trim: true },
    dob: { type: Date },
    civilStatus: {
      type: String,
      enum: ['Single', 'Married', 'Divorced', 'Widowed'],
    },
    salary: { type: Number, min: 0 },
    // ✅ NEW
    salaryFrequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
      default: 'monthly',
    },
    // ✅ NEW — auto-created Payee for disbursements
    payeeId: {
      type: Schema.Types.ObjectId,
      ref: 'Payee',
      default: null,
    },
    joinedDate: { type: Date },
    description: { type: String, trim: true },
    avatar: { type: String },

    // Soft delete fields
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: String, default: null },
  },
  {
    timestamps: true,
  }
);

employeeSchema.index({ isDeleted: 1, createdAt: -1 });

employeeSchema.pre(/^find/, function (this: Query<any, any>, next) {
  const options = this.getOptions();
  if (!options.includeDeleted) {
    this.find({ isDeleted: false });
  }
  next();
});

const Employee =
  models.Employee || model<IEmployee>('Employee', employeeSchema);

export default Employee;