import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tailwind CSS v4's @import "tailwindcss" + @theme inline are not handled
  // correctly by Turbopack in production (Next.js 16.2+), causing CSS to
  // silently disappear on Vercel. This explicitly opts the production build
  // into webpack. Dev still uses --turbopack from the dev script.
  experimental: {
    authInterrupts: true,
  },
};

export default nextConfig;

