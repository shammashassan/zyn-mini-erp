// app/accounting/ledger/page.tsx

"use client";

import React, { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import { toast } from "sonner";
import { CalendarIcon, ChevronsUpDown, Check, Book } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";
import { useDataTable } from "@/hooks/use-data-table";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { cn } from "@/lib/utils";
import { formatCompactCurrency } from "@/utils/formatters/currency";
import type { IChartOfAccount } from "@/models/ChartOfAccount";
import { useSearchParams } from "next/navigation";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { getLedgerColumns, type LedgerEntry } from "./columns";
import { PDFViewerModal } from "@/components/PDFViewerModal";
import { PartyContactSelector } from "@/components/PartyContactSelector";
import { Calendar } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";
import { StatsCards, type StatItem } from "@/components/stats-cards";
import { useLedgerPermissions } from "@/hooks/use-permissions";
import { AccessDenied } from "@/components/access-denied";
import { ExportMenu } from "@/components/export-menu";
import { exportLedgerToExcel } from "@/utils/reportExports";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";
import { redirect, usePathname } from "next/navigation";

interface LedgerData {
  account: IChartOfAccount;
  openingBalance: number;
  closingBalance: number;
  entries: LedgerEntry[];
  totalDebit: number;
  totalCredit: number;
}

function LedgerSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in-50">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={`stat-${i}`} className="p-6 py-4">
            <CardContent className="p-0 space-y-3">
              <div className="flex justify-between items-center">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-5 w-14 rounded-full" />
              </div>
              <Skeleton className="h-9 w-32" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function LedgerPageContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [accounts, setAccounts] = useState<IChartOfAccount[]>([]);
  const [selectedAccountCode, setSelectedAccountCode] = useState<string>("");
  const [ledgerData, setLedgerData] = useState<LedgerData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const [selectedPartyId, setSelectedPartyId] = useState<string>("");
  const [selectedPartyType, setSelectedPartyType] = useState<'customer' | 'supplier' | 'payee' | 'vendor' | undefined>(undefined);
  const [selectedPartyName, setSelectedPartyName] = useState("");

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(subMonths(new Date(), 5)),
    to: endOfMonth(new Date())
  });

  const [accountPopoverOpen, setAccountPopoverOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string>("");
  const [isPdfViewerOpen, setIsPdfViewerOpen] = useState(false);

  const {
    permissions: { canRead, canExport },
    session,
    isPending,
  } = useLedgerPermissions();

  useEffect(() => { setIsMounted(true); }, []);

  useEffect(() => {
    const fetchAccounts = async () => {
      if (!canRead) return;
      try {
        const res = await fetch("/api/chart-of-accounts?isActive=true");
        if (res.ok) setAccounts(await res.json());
      } catch (error) {
        console.error("Failed to fetch accounts:", error);
      }
    };
    if (canRead) fetchAccounts();
  }, [canRead]);

  useEffect(() => {
    const code = searchParams.get('accountCode');
    if (code && accounts.length > 0) setSelectedAccountCode(code);
  }, [searchParams, accounts]);

  const fetchLedger = useCallback(async (background = false) => {
    if (!canRead || !selectedAccountCode || !dateRange?.from || !dateRange?.to) return;
    try {
      if (!background) setIsLoading(true);
      const params = new URLSearchParams({
        accountCode: selectedAccountCode,
        startDate: dateRange.from.toISOString(),
        endDate: dateRange.to.toISOString(),
      });
      if (selectedPartyId) params.append("partyId", selectedPartyId);
      const res = await fetch(`/api/ledger?${params}`);
      if (!res.ok) throw new Error("Failed to fetch ledger");
      setLedgerData(await res.json());
    } catch (error) {
      console.error("Error fetching ledger:", error);
      if (!background) toast.error("Could not load ledger data");
    } finally {
      if (!background) setIsLoading(false);
    }
  }, [canRead, selectedAccountCode, dateRange, selectedPartyId]);

  useEffect(() => {
    if (selectedAccountCode && dateRange?.from && dateRange?.to && canRead) {
      fetchLedger();
    }
  }, [selectedAccountCode, dateRange, selectedPartyId, canRead, fetchLedger]);

  useEffect(() => {
    const onFocus = () => { if (isMounted && canRead && selectedAccountCode) fetchLedger(true); };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [fetchLedger, isMounted, canRead, selectedAccountCode]);

  const handleQuickSelect = (period: string) => {
    const now = new Date();
    const map: Record<string, { from: Date; to: Date }> = {
      thisMonth: { from: startOfMonth(now), to: endOfMonth(now) },
      lastMonth: { from: startOfMonth(subMonths(now, 1)), to: endOfMonth(subMonths(now, 1)) },
      last3Months: { from: startOfMonth(subMonths(now, 2)), to: endOfMonth(now) },
      last6Months: { from: startOfMonth(subMonths(now, 5)), to: endOfMonth(now) },
      thisYear: { from: new Date(now.getFullYear(), 0, 1), to: new Date(now.getFullYear(), 11, 31) },
    };
    if (map[period]) setDateRange(map[period]);
  };

  // ── PDF: call API route, stream react-pdf result ──────────────────────────
  const handleExportPDF = async () => {
    if (!ledgerData || !dateRange?.from || !dateRange?.to) return;
    setIsExporting(true);
    try {
      const params = new URLSearchParams({
        accountCode: selectedAccountCode,
        startDate: dateRange.from.toISOString(),
        endDate: dateRange.to.toISOString(),
      });
      if (selectedPartyId) params.append("partyId", selectedPartyId);
      const res = await fetch(`/api/ledger/pdf?${params}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "PDF generation failed");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
      setIsPdfViewerOpen(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to generate PDF");
      console.error(err);
    } finally {
      setIsExporting(false);
    }
  };

  // ── Excel: stays client-side ───────────────────────────────────────────────
  const handleExportExcel = () => {
    if (!ledgerData || !dateRange?.from || !dateRange?.to) return;
    setIsExporting(true);
    try {
      exportLedgerToExcel(ledgerData, dateRange.from, dateRange.to, null);
      toast.success("Excel exported successfully");
    } catch (err) {
      toast.error("Failed to generate Excel");
      console.error(err);
    } finally {
      setIsExporting(false);
    }
  };

  const selectedAccount = accounts.find(a => a.accountCode === selectedAccountCode);

  const columns = useMemo(() => {
    if (!selectedAccountCode) return [];
    return getLedgerColumns(selectedAccountCode);
  }, [selectedAccountCode]);

  const columnsWithOptions = useMemo(() => {
    const typeOptions = ledgerData?.entries
      ? [
        { label: "Invoice", value: "Invoice", count: ledgerData.entries.filter(e => e.referenceType === "Invoice").length },
        { label: "Receipt", value: "Receipt", count: ledgerData.entries.filter(e => e.referenceType === "Receipt").length },
        { label: "Payment", value: "Payment", count: ledgerData.entries.filter(e => e.referenceType === "Payment").length },
        { label: "Purchase", value: "Purchase", count: ledgerData.entries.filter(e => e.referenceType === "Purchase").length },
        { label: "Expense", value: "Expense", count: ledgerData.entries.filter(e => e.referenceType === "Expense").length },
        { label: "General", value: "General", count: ledgerData.entries.filter(e => e.referenceType === "General").length },
        { label: "Contra", value: "Contra", count: ledgerData.entries.filter(e => e.referenceType === "Contra").length },
        { label: "Adjustment", value: "Adjustment", count: ledgerData.entries.filter(e => e.referenceType === "Adjustment").length },
      ].filter(opt => opt.count > 0)
      : [];
    return columns.map((col: any) => {
      if (col.accessorKey === "referenceType") {
        return { ...col, meta: { ...col.meta, options: typeOptions } };
      }
      return col;
    });
  }, [columns, ledgerData?.entries]);

  const { table } = useDataTable({
    data: ledgerData?.entries || [],
    columns: columnsWithOptions,
    initialState: {
      sorting: [{ id: "date", desc: true }],
      pagination: { pageSize: 10, pageIndex: 0 },
    },
    getRowId: (row) => row.journalId || row.journalNumber,
  });

  const statsData: StatItem[] = useMemo(() => {
    if (!ledgerData) return [];
    const debitCount = ledgerData.entries.filter(e => e.debit > 0).length;
    const creditCount = ledgerData.entries.filter(e => e.credit > 0).length;
    return [
      {
        name: "Opening Balance",
        stat: `${formatCompactCurrency(Math.abs(ledgerData.openingBalance))} ${ledgerData.openingBalance < 0 ? "Dr" : "Cr"}`,
        subtext: "Start of period",
        changeType: "neutral",
      },
      {
        name: "Total Debits",
        stat: formatCompactCurrency(ledgerData.totalDebit),
        subtext: `${debitCount} transactions`,
        changeType: "positive",
      },
      {
        name: "Total Credits",
        stat: formatCompactCurrency(ledgerData.totalCredit),
        subtext: `${creditCount} transactions`,
        changeType: "negative",
      },
      {
        name: "Closing Balance",
        stat: `${formatCompactCurrency(Math.abs(ledgerData.closingBalance))} ${ledgerData.closingBalance < 0 ? "Dr" : "Cr"}`,
        subtext: "End of period",
        changeType: "neutral",
      },
    ];
  }, [ledgerData]);

  if (!isMounted || isPending) {
    return <div className="flex flex-1 items-center justify-center"><Spinner className="size-10" /></div>;
  }

  if (!session) redirect(`/login?callbackURL=${encodeURIComponent(pathname)}`);
  if (!canRead) return <AccessDenied />;

  return (
    <>
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">

            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 px-4 lg:px-6 gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-full">
                  <Book className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">Ledger</h1>
                  <p className="text-muted-foreground">Account-wise transaction history</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
                <ExportMenu
                  onExportPDF={handleExportPDF}
                  onExportExcel={handleExportExcel}
                  canExport={canExport ?? false}
                  isExporting={isExporting}
                  disabled={!selectedAccountCode || !ledgerData}
                />
              </div>
            </div>

            {/* Filters */}
            <div className="px-4 lg:px-6">
              <Card>
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Account selector */}
                    <div className="space-y-2 md:col-span-1">
                      <Label>Account</Label>
                      <Popover open={accountPopoverOpen} onOpenChange={setAccountPopoverOpen}>
                        <PopoverTrigger asChild>
                          <Button variant="outline" role="combobox" className="w-full justify-between">
                            <span className="truncate">
                              {selectedAccount
                                ? `${selectedAccount.accountCode} - ${selectedAccount.accountName}`
                                : "Select account..."}
                            </span>
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[350px] p-0">
                          <Command>
                            <CommandInput placeholder="Search accounts..." />
                            <CommandList
                              className="max-h-[200px] overflow-y-auto"
                              onWheel={(e) => e.stopPropagation()}
                            >
                              <CommandEmpty>No account found.</CommandEmpty>
                              <CommandGroup>
                                {accounts.map((acc) => (
                                  <CommandItem
                                    key={acc._id}
                                    value={`${acc.accountCode} ${acc.accountName}`}
                                    onSelect={() => {
                                      setSelectedAccountCode(acc.accountCode);
                                      setAccountPopoverOpen(false);
                                    }}
                                  >
                                    <Check className={cn("mr-2 h-4 w-4", selectedAccountCode === acc.accountCode ? "opacity-100" : "opacity-0")} />
                                    <div className="flex-1">
                                      <div className="font-mono text-xs">{acc.accountCode}</div>
                                      <div>{acc.accountName}</div>
                                      <div className="text-xs text-muted-foreground">
                                        {acc.groupName} › {acc.subGroup}
                                      </div>
                                    </div>
                                    <Badge variant={acc.nature === 'debit' ? 'primary' : 'warning'} appearance="outline" className="text-xs">
                                      {acc.nature}
                                    </Badge>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* Date range */}
                    <div className="space-y-2 md:col-span-1">
                      <Label>Date Range</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-between px-3 font-normal">
                            <span className={cn("truncate", !dateRange && "text-muted-foreground")}>
                              {dateRange?.from ? (
                                dateRange.to
                                  ? <>{format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}</>
                                  : format(dateRange.from, "LLL dd, y")
                              ) : "Pick a date range"}
                            </span>
                            <CalendarIcon size={16} aria-hidden="true" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={dateRange?.from}
                            selected={dateRange}
                            onSelect={setDateRange}
                            captionLayout="dropdown"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* Quick select */}
                    <div className="space-y-2 md:col-span-1">
                      <Label>Quick Select</Label>
                      <Select onValueChange={handleQuickSelect}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Quick select" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="thisMonth">This Month</SelectItem>
                          <SelectItem value="lastMonth">Last Month</SelectItem>
                          <SelectItem value="last3Months">Last 3 Months</SelectItem>
                          <SelectItem value="last6Months">Last 6 Months</SelectItem>
                          <SelectItem value="thisYear">This Year</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Party filter */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t md:col-span-3">
                      <div className="space-y-2">
                        <PartyContactSelector
                          allowedRoles={['customer', 'supplier', 'payee', 'vendor']}
                          value={{ partyId: selectedPartyId, partyType: selectedPartyType, partyName: selectedPartyName }}
                          onChange={(val) => {
                            setSelectedPartyId(val.partyId ?? "");
                            setSelectedPartyType(val.partyType);
                            setSelectedPartyName(val.partyName ?? "");
                          }}
                          showContactSelector={false}
                          layout="horizontal"
                          className="w-full"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Account header + stats + table */}
            {ledgerData && (
              <div className="px-4 lg:px-6">
                <Card className="mb-6">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-2xl">
                          {ledgerData.account.accountCode} - {ledgerData.account.accountName}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          {ledgerData.account.groupName} › {ledgerData.account.subGroup}
                        </p>
                      </div>
                      <Badge
                        variant={ledgerData.account.nature === 'debit' ? 'primary' : 'warning'}
                        appearance="outline"
                        className="capitalize"
                      >
                        {ledgerData.account.nature}
                      </Badge>
                    </div>
                  </CardHeader>
                </Card>

                <div className={cn("transition-opacity duration-200", isLoading && !ledgerData ? "opacity-50" : "opacity-100")}>
                  {isLoading && statsData.length === 0 ? (
                    <LedgerSkeleton />
                  ) : (
                    <div className="mb-6">
                      <StatsCards data={statsData} columns={4} />
                    </div>
                  )}
                </div>

                <Card>
                  <CardContent className="p-6">
                    <div className={cn("transition-opacity duration-200", isLoading ? "opacity-50 pointer-events-none" : "opacity-100")}>
                      {isLoading && !ledgerData.entries.length ? (
                        <DataTableSkeleton columnCount={columns.length} rowCount={10} />
                      ) : (
                        <DataTable table={table}>
                          <DataTableToolbar table={table} />
                        </DataTable>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Empty state */}
            {!ledgerData && !isLoading && (
              <div className="px-4 lg:px-6">
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Book className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Select an Account</h3>
                    <p className="text-muted-foreground text-center max-w-md">
                      Choose an account from the Chart of Accounts to view its ledger entries and transaction history.
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Loading state */}
            {isLoading && !ledgerData && (
              <div className="px-4 lg:px-6">
                <Card>
                  <CardContent className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                      <p className="text-muted-foreground">Loading ledger data...</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

          </div>
        </div>
      </div>

      <PDFViewerModal
        isOpen={isPdfViewerOpen}
        onClose={() => {
          setIsPdfViewerOpen(false);
          if (pdfUrl.startsWith("blob:")) URL.revokeObjectURL(pdfUrl);
          setPdfUrl("");
        }}
        pdfUrl={pdfUrl}
        title={`Ledger - ${ledgerData?.account.accountCode || ''}`}
      />
    </>
  );
}

export default function Component() {
  return (
    <Suspense fallback={
      <div className="flex flex-1 items-center justify-center">
        <Spinner className="size-10" />
      </div>
    }>
      <LedgerPageContent />
    </Suspense>
  );
}