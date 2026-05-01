'use client';

import { useEffect, useState } from 'react';
import { ErrorContent } from '@/components/layout/error-content';
import "./globals.css";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    console.error(error);
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
      setTheme('light');
    } else if (!savedTheme && window.matchMedia('(prefers-color-scheme: light)').matches) {
      setTheme('light');
    }
  }, [error]);

  return (
    <html lang="en" className={theme} style={{ colorScheme: theme }}>
      <body className="antialiased font-sans">
        <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-background p-6">
          <ErrorContent 
            code="500"
            description="A critical error occurred in the\napplication core."
            showRetry
            onRetry={() => reset()}
          />
        </div>
      </body>
    </html>
  );
}
