// lib/mongoClient.ts - OPTIMIZED for Better Auth only
import { MongoClient, Db } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error(
    'Please define the MONGODB_URI environment variable inside .env.local'
  );
}

/**
 * This connection is used ONLY by Better Auth
 * All other app code should use dbConnect.ts (Mongoose)
 * 
 * We keep this separate due to MongoDB driver version mismatch:
 * - Better Auth requires mongodb v6.x
 * - Mongoose bundles mongodb v5.x
 */
interface CachedMongo {
  client: MongoClient | null;
  db: Db | null;
  promise: Promise<{ client: MongoClient; db: Db }> | null;
}

let cached: CachedMongo = (global as any).mongoClientAuth;

if (!cached) {
  cached = (global as any).mongoClientAuth = { 
    client: null, 
    db: null,
    promise: null 
  };
}

/**
 * Connect to MongoDB using native driver (for Better Auth)
 * Separate from Mongoose connection pool
 */
export async function connectToMongo(): Promise<{ client: MongoClient; db: Db }> {
  // Return cached connection if available
  if (cached.client && cached.db) {
    return { client: cached.client, db: cached.db };
  }

  // If connection is in progress, wait for it
  if (cached.promise) {
    return cached.promise;
  }

  // Create new connection promise
  cached.promise = (async () => {
    const opts = {
      // Smaller pool for auth-only operations
      maxPoolSize: 5,
      minPoolSize: 1,
      maxIdleTimeMS: 60000,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };

    console.log('🔵 Connecting to MongoDB (Better Auth)...');
    const client = await MongoClient.connect(MONGODB_URI!, opts);
    const db = client.db();
    console.log('✅ MongoDB connected (Better Auth)');

    // Cache the connection
    cached.client = client;
    cached.db = db;

    return { client, db };
  })();

  try {
    const result = await cached.promise;
    return result;
  } catch (error) {
    // Clear cache on error so next attempt tries again
    cached.promise = null;
    cached.client = null;
    cached.db = null;
    console.error('❌ MongoDB connection failed (Better Auth):', error);
    throw error;
  }
}

/**
 * Get MongoDB database instance (for Better Auth)
 */
export async function getMongoDb(): Promise<Db> {
  const { db } = await connectToMongo();
  return db;
}

/**
 * Get MongoDB client instance (for Better Auth)
 */
export async function getMongoClient(): Promise<MongoClient> {
  const { client } = await connectToMongo();
  return client;
}

/**
 * Close MongoDB connection (for cleanup)
 * Only use this in server shutdown scenarios
 */
export async function closeMongoConnection(): Promise<void> {
  if (cached.client) {
    await cached.client.close();
    cached.client = null;
    cached.db = null;
    cached.promise = null;
    console.log('🔴 MongoDB connection closed (Better Auth)');
  }
}