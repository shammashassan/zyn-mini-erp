import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { nextCookies } from "better-auth/next-js";
import { admin as adminPlugin, username, jwt } from "better-auth/plugins";
import { ac, user, manager, admin, owner } from "@/lib/permissions";
import { getMongoDb, getMongoClient } from "./mongoClient";

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
    expiresIn: 60 * 60 * 24,
    updateAge: 60 * 60 * 4,
    cookieCache: {
      enabled: true,
      maxAge: 60 * 60 * 2,
      strategy: "compact",
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
      // Role is handled by admin plugin - removed from here
      lastLoginAt: {
        type: "date",
        required: false,
        input: false, // Prevent users from setting this manually
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
        after: async (session) => {
          const { ObjectId } = await import("mongodb");
          try {
            let result = await db.collection('user').updateOne({ id: session.userId }, { $set: { lastLoginAt: new Date(), updatedAt: new Date() } });

            if (result.matchedCount === 0) {
              await db.collection('user').updateOne({ _id: new ObjectId(session.userId) }, { $set: { lastLoginAt: new Date(), updatedAt: new Date() } });
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