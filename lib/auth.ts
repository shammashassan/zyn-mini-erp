// lib/auth.ts
import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { nextCookies } from "better-auth/next-js";
import { admin as adminPlugin, username, jwt } from "better-auth/plugins"; 
import { ac, user, manager, admin, owner } from "@/lib/permissions";
import { getMongoDb, getMongoClient } from "./mongoClient";
import { ObjectId } from "mongodb";

const db = await getMongoDb();
const client = await getMongoClient();

console.log('✅ Better Auth using mongoClient connection (Standard)');

export const auth = betterAuth({
  database: mongodbAdapter(db, {
    client: client
  }),

  emailAndPassword: {
    enabled: true,
    autoSignIn: true, 
    requireEmailVerification: false,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },

  session: {
    expiresIn: 60 * 60 * 24, // 24 hours
    updateAge: 60 * 60 * 4,  // Update session in DB every 4 hours
    cookieCache: {           // CRITICAL FIX: Extended cache time to prevent frequent DB hits
      enabled: true,
      maxAge: 60 * 60 * 2,   // Cache lasts 2 hours (was 15 mins)
      strategy: "compact",   // Compact strategy for performance
      refreshCache: true
    }
  },

  user: {
    changeEmail: {
      enabled: true,
      updateEmailWithoutVerification: true,
    },
    deleteUser: {
      enabled: true,
    },
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "user",
        required: false,
      },
      lastLoginAt: {
        type: "date",
        required: false,
      },
    },
  },

  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: [],
    },
  },

  advanced: {
    cookiePrefix: "better-auth",
  },

  databaseHooks: {
    session: {
      create: {
        async before(session) {
          // No-op
        },
        async after(session) {
          try {
            let result = await db.collection('user').updateOne(
              { id: session.userId },
              { $set: { lastLoginAt: new Date(), updatedAt: new Date() } }
            );
            
            if (result.matchedCount === 0 && ObjectId.isValid(session.userId)) {
              await db.collection('user').updateOne(
                { _id: new ObjectId(session.userId) },
                { $set: { lastLoginAt: new Date(), updatedAt: new Date() } }
              );
            }
          } catch (error) {
            console.error('❌ Failed to update lastLoginAt:', error);
          }
        },
      },
    },
  },

  plugins: [
    username(),

    jwt({
        jwt: {
            expirationTime: "24h", 
            definePayload: ({ user }) => {
                return {
                    id: user.id,
                    email: user.email,
                    role: user.role, 
                }
            }
        }
    }),

    adminPlugin({
      ac,
      roles: { user, manager, admin, owner },
      defaultRole: "user",
      adminUserIds: [], 
      impersonationSessionDuration: 60 * 60,
      defaultBanReason: "Banned by administrator",
      bannedUserMessage: "Your account has been banned. Please contact support.",
    }),

    nextCookies(),
  ],
});

export type Auth = typeof auth;