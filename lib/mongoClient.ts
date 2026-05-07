// lib/mongoClient.ts - WORKING VERSION
import { MongoClient, Db } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('Please define MONGODB_URI environment variable');
}

interface CachedMongo {
  client: MongoClient | null;
  db: Db | null;
  promise: Promise<{ client: MongoClient; db: Db }> | null;
}

// Use type assertion with 'any' to bypass strict checks
const globalStore = globalThis as unknown as {
  mongoClientAuth?: CachedMongo;
};

const cached: CachedMongo = globalStore.mongoClientAuth ?? {
  client: null,
  db: null,
  promise: null,
};

// Store back to global
if (!globalStore.mongoClientAuth) {
  globalStore.mongoClientAuth = cached;
}

export async function connectToMongo(): Promise<{ client: MongoClient; db: Db }> {
  if (cached.client && cached.db) {
    return { client: cached.client, db: cached.db };
  }

  if (cached.promise) {
    return cached.promise;
  }

  cached.promise = (async () => {
    const client = await MongoClient.connect(MONGODB_URI!, {
      maxPoolSize: 5,
      minPoolSize: 1,
      maxIdleTimeMS: 60000,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    const db = client.db();

    client.on('close', () => {
      globalStore.mongoClientAuth = undefined;
      cached.promise = null;
      cached.client = null;
      cached.db = null;
    });

    cached.client = client;
    cached.db = db;

    console.log('✅ Better Auth: MongoDB connected');
    return { client, db };
  })();

  try {
    return await cached.promise;
  } catch (error) {
    cached.promise = null;
    throw error;
  }
}

export async function getMongoDb(): Promise<Db> {
  const { db } = await connectToMongo();
  return db;
}

export async function getMongoClient(): Promise<MongoClient> {
  const { client } = await connectToMongo();
  return client;
}

export async function closeMongoConnection(): Promise<void> {
  if (cached.client) {
    await cached.client.close();
    globalStore.mongoClientAuth = undefined;
  }
}