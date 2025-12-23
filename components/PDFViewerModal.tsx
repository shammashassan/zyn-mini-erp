"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { XIcon, DownloadIcon, PrinterIcon } from "lucide-react";

interface PDFViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfUrl: string;
  title: string;
}

export function PDFViewerModal({ isOpen, onClose, pdfUrl, title }: PDFViewerModalProps) {
  if (!isOpen) {
    return null;
  }

  const iframeSrc = `${pdfUrl}#toolbar=0`;

  const handlePrint = () => {
    const iframe = document.getElementById('pdf-iframe') as HTMLIFrameElement;
    if (iframe) {
      iframe.contentWindow?.print();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        style={{
          width: '95vw',
          maxWidth: '95vw',
          height: '90vh',
        }}
        className="flex flex-col p-0 gap-0 [&>button]:hidden"
      >
        {/* --- FIX: Corrected flexbox layout for proper alignment --- */}
        <DialogHeader className="px-4 py-2 border-b flex flex-row items-center justify-between">
          <DialogTitle>{title}</DialogTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild className="focus-visible:ring-0 focus-visible:ring-offset-0">
              <a href={pdfUrl} download={`${title}.pdf`}>
                <DownloadIcon className="h-4 w-4 mr-2" />
                Download
              </a>
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handlePrint}
              className="focus-visible:ring-0 focus-visible:ring-offset-0"
            >
              <PrinterIcon className="h-4 w-4 mr-2" />
              Print
            </Button>
            <DialogClose asChild>
              <Button variant="ghost" size="icon" className="ml-auto focus-visible:ring-0 focus-visible:ring-offset-0">
                <XIcon className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </Button>
            </DialogClose>
          </div>
        </DialogHeader>
        <div className="flex-1 w-full h-full bg-muted/20">
          <iframe
            id="pdf-iframe"
            src={iframeSrc}
            title={title}
            className="w-full h-full border-0"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
