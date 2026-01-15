// lib/types.ts

export interface Item {
  description: string;
  quantity: number | string;
  rate: number | string;
  total: number;
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

export interface BillPayload {
  customerName: string;
  supplierName?: string; // ✅ Added supplierName
  customerPhone: string;
  customerEmail: string;
  paymentMethod: string;
  notes: string;
  discount: number;
  documentType: 'quotation' | 'invoice' | 'receipt' | 'payment' | 'delivery';
  status: 'pending' | 'paid' | 'partial' | 'overdue' | 'approved' | 'cancelled' | 'dispatched' | 'delivered';
  items: Item[];
  connectedDocuments?: ConnectedDocuments;
  voucherAmount?: number;
  
  // Date fields for documents
  invoiceDate?: Date;
  quotationDate?: Date;
  voucherDate?: Date;
  
  // Audit fields (readonly - managed by backend)
  createdBy?: string | null;
  updatedBy?: string | null;
  actionHistory?: AuditEntry[];
}

export interface Bill extends BillPayload {
  _id: string;
  invoiceNumber: string;
  totalAmount: number;
  vatAmount: number;
  grandTotal: number;
  
  // Soft delete fields
  isDeleted: boolean;
  deletedAt: Date | null;
  deletedBy: string | null;
  
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
  // Parsed device info
  deviceName?: string;
  browser?: string;
  os?: string;
  deviceType?: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  isCurrent?: boolean;
}

// NEW: User activity log
export interface UserActivityLog {
  id: string;
  userId: string;
  action: string;
  description: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

// NEW: Admin activity log
export interface AdminActivityLog {
  id: string;
  adminId: string;
  adminName: string;
  action: string;
  targetUserId?: string;
  targetUserEmail?: string;
  description: string;
  ipAddress?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

// NEW: User preferences
export interface UserPreferences {
  userId: string;
  emailNotifications: {
    security: boolean;
    updates: boolean;
    marketing: boolean;
  };
  privacySettings: {
    profileVisibility: 'public' | 'private';
    showEmail: boolean;
  };
  updatedAt: Date;
}

// NEW: Email change request
export interface EmailChangeRequest {
  id: string;
  userId: string;
  newEmail: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
  status: 'pending' | 'completed' | 'expired';
}