// lib/types.ts - UPDATED: Removed BillPayload interface

export interface Item {
  description: string;
  quantity: number | string;
  rate: number | string;
  total: number;
  shouldCreateProduct?: boolean; // Flag to indicate if product should be created on submit
}

export interface ConnectedDocuments {
  invoiceId?: string;
  receiptId?: string;
  deliveryId?: string;
  // Arrays for new schema support
  invoiceIds?: string[];
  purchaseIds?: string[];
  receiptIds?: string[];
}

export interface AuditEntry {
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

export interface Bill {
  _id: string;
  invoiceNumber: string;

  // Party/Contact system
  partyId?: string;
  contactId?: string;

  // Payee (for vouchers)
  payeeName?: string;
  payeeId?: string;

  // Vendor (for vouchers - manual input)
  vendorName?: string;

  // Document details
  documentType: 'quotation' | 'invoice' | 'receipt' | 'payment' | 'delivery';
  paymentMethod?: string;
  notes: string;
  discount: number;
  status: 'pending' | 'paid' | 'partial' | 'overdue' | 'approved' | 'cancelled' | 'dispatched' | 'delivered';
  items: Item[];

  totalAmount: number;
  vatAmount: number;
  grandTotal: number;

  // Connected documents
  connectedDocuments?: ConnectedDocuments;

  // Voucher-specific
  voucherAmount?: number;

  // Date fields for documents
  invoiceDate?: Date;
  quotationDate?: Date;
  voucherDate?: Date;

  // Soft delete fields
  isDeleted: boolean;
  deletedAt: Date | null;
  deletedBy: string | null;

  // Audit fields
  createdBy?: string | null;
  updatedBy?: string | null;
  actionHistory?: AuditEntry[];

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// Better Auth User type with all plugin extensions
export interface BetterAuthUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string | null;
  createdAt: Date;
  updatedAt: Date;
  // Username plugin fields
  username?: string;
  displayUsername?: string;
  // Admin plugin fields
  role?: string;
  banned?: boolean;
  banReason?: string | null;
  banExpires?: Date | null;
  // NEW: Activity tracking
  lastLoginAt?: Date | null;
}

// Session user type (what's returned by useSession)
export interface SessionUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string | null;
  username?: string;
  displayUsername?: string;
  role?: string;
  banned?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

// Admin role types
export type AdminRole = "admin" | "user";

// User creation data for admin operations
export interface CreateUserData {
  name: string;
  email: string;
  password: string;
  username?: string;
  role?: AdminRole;
  data?: {
    image?: string;
    emailVerified?: boolean;
  };
}

// Auth session type
export interface AuthSession {
  user: SessionUser;
  session: {
    id: string;
    userId: string;
    expiresAt: Date;
    token: string;
    ipAddress?: string;
    userAgent?: string;
    createdAt?: Date;
    updatedAt?: Date;
  };
}

// NEW: Session with device info
export interface SessionWithDevice {
  id: string;
  userId: string;
  expiresAt: Date;
  token: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
  deviceName?: string;
  browser?: string;
  os?: string;
  deviceType?: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  isCurrent?: boolean;
}