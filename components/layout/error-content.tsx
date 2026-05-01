'use client';

import { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import Link from "next/link";

interface ErrorContentProps {
  code: string;
  title?: string;
  description: string;
  showRetry?: boolean;
  onRetry?: () => void;
  showExplore?: boolean;
}

// Using local SVGs for icons to prevent lucide-react instantiation issues during crashes
const HomeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 size-4"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
);

const RefreshIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 size-4 animate-spin-slow"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
);

const CompassIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 size-4"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>
);

const SupportIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 size-4"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/></svg>
);

export function ErrorContent({
  code,
  description,
  showRetry,
  onRetry,
  showExplore
}: ErrorContentProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  return (
    <Empty className="border-none bg-transparent">
      <EmptyHeader>
        <EmptyTitle 
          className="font-extrabold text-9xl"
          style={{ 
            maskImage: 'linear-gradient(to bottom, transparent 20%, black 50%, transparent 80%)',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent 20%, black 50%, transparent 80%)'
          }}
        >
          {code}
        </EmptyTitle>
        <EmptyDescription className="-mt-8 text-nowrap text-foreground/80">
          {description.split('\n').map((line, i) => (
            <span key={i}>
              {line}
              <br />
            </span>
          ))}
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <div className="flex flex-wrap justify-center gap-2">
          {showRetry && (
            <Button onClick={onRetry}>
              <RefreshIcon />
              Try Again
            </Button>
          )}
          
          <Button asChild variant={showRetry ? "outline" : "default"}>
            <Link href="/">
              <HomeIcon />
              Go Home
            </Link>
          </Button>

          {showExplore && (
             <Button asChild variant="outline">
              <Link href="/dashboard">
                <CompassIcon />
                Explore
              </Link>
            </Button>
          )}

          {code === "403" && (
            <Button asChild variant="outline">
              <Link href="/support">
                <SupportIcon />
                Support
              </Link>
            </Button>
          )}
        </div>
      </EmptyContent>
    </Empty>
  );
}
