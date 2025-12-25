import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { AppLayout } from "@/components/app-layout";
import { NuqsAdapter } from "nuqs/adapters/next/app";

export const metadata: Metadata = {
  title: "Zyn Erp",
  description: "Visualize and manage your sales, stock, and performance",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <html lang="en" suppressHydrationWarning>
        <body
          className={`${GeistSans.variable} ${GeistMono.variable} antialiased font-sans`}
        >
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <NuqsAdapter>
              <AppLayout>{children}</AppLayout>
            </NuqsAdapter>
            <Toaster
              expand={false}
              richColors
              position="top-right"
            />
          </ThemeProvider>
        </body>
      </html>
    </>
  );
}
