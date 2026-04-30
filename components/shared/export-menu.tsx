"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileText, FileSpreadsheet, ChevronDown, Table } from "lucide-react";
import { Spinner } from "../ui/spinner";

interface ExportMenuProps {
  onExportPDF: () => void;
  onExportExcel: () => void;
  canExport: boolean;
  isExporting?: boolean;
  disabled?: boolean; // Added disabled prop
}

export function ExportMenu({
  onExportPDF,
  onExportExcel,
  canExport,
  isExporting = false,
  disabled = false,
}: ExportMenuProps) {
  if (!canExport) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="gap-2"
          disabled={isExporting || disabled} // Apply disabled state
        >
          {isExporting ? (
            <Spinner />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Export
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onExportPDF} className="gap-2 cursor-pointer">
          <FileText className="h-4 w-4 text-red-600" />
          Export as PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onExportExcel} className="gap-2 cursor-pointer">
          <Table className="h-4 w-4 text-green-600" />
          Export as Excel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}