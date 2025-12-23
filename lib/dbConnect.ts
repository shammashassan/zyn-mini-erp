import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error(
    'Please define the MONGODB_URI environment variable inside .env.local'
  );
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections from growing exponentially
 * during API Route usage.
 */
interface CachedMongoose {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

let cached: CachedMongoose = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  // Return existing connection
  if (cached.conn) {
    return cached.conn;
  }

  // If connection is in progress, wait for it
  if (cached.promise) {
    cached.conn = await cached.promise;
    return cached.conn;
  }

  // Create new connection
  const opts = {
    bufferCommands: false, // Disable buffering for faster failure
    maxPoolSize: 10, // Maximum connection pool size
    minPoolSize: 2, // Minimum connections to maintain
    serverSelectionTimeoutMS: 5000, // Fail fast if can't connect
    socketTimeoutMS: 45000,
    family: 4, // Use IPv4, skip trying IPv6
  };

  console.log('🔵 Connecting to MongoDB with Mongoose...');
  
  cached.promise = mongoose.connect(MONGODB_URI!, opts).then((mongoose) => {
    console.log('✅ Mongoose connected successfully');
    return mongoose;
  });

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (e) {
    // Clear cache on error so next attempt tries again
    cached.promise = null;
    cached.conn = null;
    console.error('❌ Mongoose connection failed:', e);
    throw e;
  }
}

export default dbConnect;