// lib/auth-client.ts
import { createAuthClient } from "better-auth/react"
import { adminClient, usernameClient, jwtClient } from "better-auth/client/plugins"
import { ac, admin, user, manager, owner } from "@/lib/permissions"

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000",
  plugins: [
    usernameClient(),
    jwtClient(),
    adminClient({
      ac,
      roles: { user, manager, admin, owner },
    })
  ]
})

// Core methods
export const signIn = authClient.signIn
export const signOut = authClient.signOut

// User methods
export const {
  signUp,
  useSession,
  updateUser,
  changePassword,
  changeEmail,
  deleteUser,
  getSession,
  isUsernameAvailable,
  token: getToken,
} = authClient

// Admin methods (namespaced)
export const adminAPI = authClient.admin

// ✅ Type exports - Session contains the user type
export type Session = typeof authClient.$Infer.Session
export type User = Session['user'] // Extract User from Session