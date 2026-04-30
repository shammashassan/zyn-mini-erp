import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { ThemeProvider } from "@/components/layout/theme-provider";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: "Zyn Erp",
  description: "Visualize and manage your sales, stock, and performance",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <html lang="en" suppressHydrationWarning className={cn("font-sans", geist.variable)}>
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
              {children}
            </NuqsAdapter>
            <Toaster
              expand={false}
              position="top-right"
            />
          </ThemeProvider>
        </body>
      </html>
    </>
  );
}
