"use client";

import * as React from "react";
import { useState } from "react";
import { CheckIcon, CopyIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Fix: Since ButtonProps is not exported, we extract the types directly from the Button component.
interface CopyButtonProps extends React.ComponentProps<typeof Button> {
  textToCopy: string;
}

export function CopyButton({ 
  textToCopy, 
  className, 
  variant = "ghost", 
  size = "icon", 
  ...props 
}: CopyButtonProps) {
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopy = async (e: React.MouseEvent) => {
    // Prevent event bubbling if this button is inside another clickable element
    e.stopPropagation();
    
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            aria-label={copied ? "Copied" : "Copy to clipboard"}
            className={cn("disabled:opacity-100 h-6 w-6 relative shrink-0", className)}
            disabled={copied}
            onClick={handleCopy}
            variant={variant}
            size={size}
            {...props}
          >
            <div
              className={cn(
                "transition-all absolute inset-0 flex items-center justify-center",
                copied ? "scale-100 opacity-100" : "scale-0 opacity-0",
              )}
            >
              <CheckIcon
                aria-hidden="true"
                className="stroke-emerald-500"
                size={14}
              />
            </div>
            <div
              className={cn(
                "transition-all flex items-center justify-center",
                copied ? "scale-0 opacity-0" : "scale-100 opacity-100",
              )}
            >
              <CopyIcon aria-hidden="true" size={14} />
            </div>
          </Button>
        </TooltipTrigger>
        <TooltipContent className="px-2 py-1 text-xs">
          {copied ? "Copied!" : "Click to copy"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}