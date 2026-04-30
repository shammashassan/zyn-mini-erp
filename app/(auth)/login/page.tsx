"use client";

import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="min-h-screen w-full relative flex items-center justify-center p-6 md:p-10 overflow-hidden text-zinc-100">
      {/* Dark Horizon Glow */}
      <div
        className="absolute inset-0 z-0"
        style={{
          background: "radial-gradient(125% 125% at 50% 10%, #000000 40%, #0d1a36 100%)",
        }}
      />
      
      {/* Content wrapper with z-index to sit above background */}
      <div className="relative z-10 w-full max-w-sm md:max-w-3xl">
        <LoginForm />
      </div>
    </div>
  );
}