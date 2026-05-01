// app/sales/receipts/page.tsx

"use client";

import { useEffect, useState, useMemo, useCallback, useRef, Suspense } from "react";
import { useQueryStates, parseAsInteger } from "nuqs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getColumns, type Receipt } from "./columns";
import { useDataTable } from "@/hooks/use-data-table";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";
import { DataTable } from "@/components/data-table/data-table";
import { PDFViewerModal } from "@/components/shared/PDFViewerModal";
import { ReceiptForm } from "./receipt-form";
import { ReceiptViewModal } from "./ReceiptViewModal";
import { toast } from "sonner";
import { Receipt as ReceiptIcon, Trash2, BarChart3, Plus, CalendarIcon, Ticket } from "lucide-react";
import Link from "next/link";
import { useVoucherPermissions, useReportPermissions } from "@/hooks/use-permissions";
import { forbidden } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";
import { getSortingStateParser, getFiltersStateParser } from "@/lib/data-table/parsers";
import type { ExtendedColumnSort, ExtendedColumnFilter } from "@/types/data-table";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { redirect, usePathname } from "next/navigation";

function ReceiptsPageContent() {
    const pathname = usePathname();
    const [receipts, setReceipts] = useState<Receipt[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const [pageCount, setPageCount] = useState(0);
    const [totalCount, setTotalCount] = useState(0);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedPdfUrl, setSelectedPdfUrl] = useState("");
    const [selectedPdfTitle, setSelectedPdfTitle] = useState("");
    const [isReceiptFormOpen, setIsReceiptFormOpen] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    // View Modal State
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [receiptToView, setReceiptToView] = useState<Receipt | null>(null);

    // Date Range State (Default 6 months)
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: startOfMonth(subMonths(new Date(), 5)),
        to: endOfMonth(new Date()),
    });

    const isSubmittingRef = useRef(false);

    const {
        permissions: {
            canRead,
            canCreate,
            canDelete,
            canViewTrash,
        },
        isPending,
        session
    } = useVoucherPermissions();

    const { permissions: { canRead: canViewReports } } = useReportPermissions();

    const [urlState, setUrlState] = useQueryStates({
        page: parseAsInteger.withDefault(1),
        pageSize: parseAsInteger.withDefault(10),
        sort: getSortingStateParser<Receipt>().withDefault([]),
        filters: getFiltersStateParser<Receipt>().withDefault([]),
    });

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const fetchReceipts = useCallback(async (background = false) => {
        if (!canRead) return;
        try {
            if (!background) {
                setIsLoading(true);
            }

            const params = new URLSearchParams({
                page: urlState.page.toString(),
                pageSize: urlState.pageSize.toString(),
                populate: 'true',
                voucherType: 'receipt', // Only fetch receipts
            });

            // Add Date Range to params
            if (dateRange?.from) {
                params.append('startDate', dateRange.from.toISOString());
            }
            if (dateRange?.to) {
                params.append('endDate', dateRange.to.toISOString());
            }

            if (urlState.sort && urlState.sort.length > 0) {
                params.append('sort', JSON.stringify(urlState.sort));
            }

            if (urlState.filters && urlState.filters.length > 0) {
                params.append('filters', JSON.stringify(urlState.filters));
            }

            const res = await fetch(`/api/vouchers?${params.toString()}`);

            if (!res.ok) throw new Error("Failed to fetch receipts");

            const result = await res.json();

            if (result.data && result.pageCount !== undefined) {
                setReceipts(result.data);
                setPageCount(result.pageCount);
                setTotalCount(result.totalCount);
            } else {
                setReceipts(result.filter((v: Receipt) => v.voucherType === 'receipt'));
            }
        } catch (error) {
            if (!background) {
                toast.error("Could not load receipts.");
            }
        } finally {
            if (!background) {
                setIsLoading(false);
            }
            setIsInitialLoad(false);
        }
    }, [canRead, urlState.page, urlState.pageSize, urlState.sort, urlState.filters, dateRange]);

    useEffect(() => {
        if (isMounted && canRead) {
            fetchReceipts();
        }
    }, [isMounted, canRead, fetchReceipts]);

    useEffect(() => {
        const onFocus = () => {
            if (isMounted && canRead) {
                fetchReceipts(true);
            }
        };

        window.addEventListener("focus", onFocus);

        return () => {
            window.removeEventListener("focus", onFocus);
        };
    }, [fetchReceipts, isMounted, canRead]);

    const handleDelete = async (selectedReceipts: Receipt[]) => {
        if (!canDelete) {
            toast.error("You don't have permission to delete receipts");
            return;
        }

        try {
            const deletePromises = selectedReceipts.map((receipt) =>
                fetch(`/api/vouchers/${receipt._id}`, { method: 'DELETE' })
            );

            await Promise.all(deletePromises);

            toast.success(
                `${selectedReceipts.length} ${selectedReceipts.length === 1 ? 'receipt' : 'receipts'} moved to trash.`,
            );

            fetchReceipts();
        } catch (error) {
            console.error('Failed to delete receipts:', error);
            toast.error('Failed to delete receipts.');
        }
    };

    const handleViewPdf = (doc: any) => {
        if (!doc || !doc._id) {
            toast.error("Cannot view PDF. Document data is missing.");
            return;
        }

        const url = `/api/vouchers/${doc._id}/pdf?type=receipt`;
        setSelectedPdfUrl(url);
        setSelectedPdfTitle(doc.invoiceNumber || "Receipt");
        setIsModalOpen(true);
    };

    const handleViewInvoicePdf = useCallback((invoice: any) => {
        if (!invoice || !invoice._id) {
            toast.error("Cannot view PDF. Invoice data is missing.");
            return;
        }
        const pdfUrl = `/api/invoices/${invoice._id}/pdf`;
        setSelectedPdfUrl(pdfUrl);
        setSelectedPdfTitle(invoice.invoiceNumber || "Invoice");
        setIsModalOpen(true);
    }, []);

    const handleViewCreditNotePdf = useCallback((creditNote: any) => {
        if (!creditNote || !creditNote._id) {
            toast.error("Cannot view PDF. Credit note data is missing.");
            return;
        }
        const pdfUrl = `/api/credit-notes/${creditNote._id}/pdf`;
        setSelectedPdfUrl(pdfUrl);
        setSelectedPdfTitle(creditNote.creditNoteNumber || "Credit Note");
        setIsModalOpen(true);
    }, []);

    const handleViewDebitNotePdf = useCallback((debitNote: any) => {
        if (!debitNote || !debitNote._id) {
            toast.error("Cannot view PDF. Debit note data is missing.");
            return;
        }
        const pdfUrl = `/api/debit-notes/${debitNote._id}/pdf`;
        setSelectedPdfUrl(pdfUrl);
        setSelectedPdfTitle(debitNote.debitNoteNumber || "Debit Note");
        setIsModalOpen(true);
    }, []);

    const handleReceiptFormSubmit = async (data: any) => {
        if (isSubmittingRef.current) return;

        if (!canCreate) {
            toast.error("You don't have permission to create receipts");
            return;
        }

        isSubmittingRef.current = true;

        try {
            const res = await fetch("/api/vouchers", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            const result = await res.json();

            if (!res.ok) {
                toast.error(result.error || "Failed to create receipt.");
                return;
            }

            const newReceiptId = result.voucher._id;
            const receiptNumber = result.voucher.invoiceNumber;

            toast.success(`Receipt ${receiptNumber} created!`);

            setIsReceiptFormOpen(false);
            fetchReceipts();

            const pdfUrl = `/api/vouchers/${newReceiptId}/pdf?type=receipt`;
            setSelectedPdfUrl(pdfUrl);
            setSelectedPdfTitle(receiptNumber || "Receipt");
            setIsModalOpen(true);

        } catch (error) {
            console.error("Error creating receipt:", error);
            toast.error("An error occurred while creating receipt.");
        } finally {
            isSubmittingRef.current = false;
        }
    };

    const handleQuickSelect = (period: string) => {
        const now = new Date();
        let from: Date;
        let to: Date;

        switch (period) {
            case "thisMonth":
                from = startOfMonth(now);
                to = endOfMonth(now);
                break;
            case "lastMonth":
                from = startOfMonth(subMonths(now, 1));
                to = endOfMonth(subMonths(now, 1));
                break;
            case "last3Months":
                from = startOfMonth(subMonths(now, 2));
                to = endOfMonth(now);
                break;
            case "last6Months":
                from = startOfMonth(subMonths(now, 5));
                to = endOfMonth(now);
                break;
            case "thisYear":
                from = new Date(now.getFullYear(), 0, 1);
                to = new Date(now.getFullYear(), 11, 31);
                break;
            default:
                return;
        }

        setDateRange({ from, to });
        setUrlState({ page: 1 });
    };

    const handleViewReceipt = (receipt: Receipt) => {
        setReceiptToView(receipt);
        setViewModalOpen(true);
    };

    const columns = useMemo(() => getColumns(
        handleViewPdf,
        (receiptOrId: Receipt | string) => {
            const id = typeof receiptOrId === 'object' ? receiptOrId._id : receiptOrId;
            const receiptToDelete = receipts.find((v: Receipt) => v._id === id);
            if (receiptToDelete) {
                handleDelete([receiptToDelete]);
            }
        },
        { canDelete },
        fetchReceipts,
        handleViewReceipt,
        handleViewInvoicePdf,
        handleViewCreditNotePdf,
        handleViewDebitNotePdf,
    ), [
        receipts,
        canDelete,
        fetchReceipts,
        handleViewInvoicePdf,
        handleViewCreditNotePdf,
        handleViewDebitNotePdf
    ]);

    const { table } = useDataTable<Receipt>({
        data: receipts,
        columns,
        pageCount,
        initialState: {
            sorting: urlState.sort,
            pagination: {
                pageSize: urlState.pageSize,
                pageIndex: urlState.page - 1,
            },
            columnFilters: urlState.filters,
        },
        onPaginationChange: (pagination) => {
            setUrlState({
                page: pagination.pageIndex + 1,
                pageSize: pagination.pageSize,
            });
        },
        onSortingChange: (sorting) => {
            setUrlState({ sort: sorting as ExtendedColumnSort<Receipt>[] });
        },
        onColumnFiltersChange: (filters) => {
            setUrlState({
                filters: filters as ExtendedColumnFilter<Receipt>[],
                page: 1,
            });
        },
        getRowId: (row) => row._id,
    });

    if (!isMounted || isPending) {
        return (
            <div className="flex flex-1 items-center justify-center">
                <Spinner className="size-10" />
            </div>
        );
    }

    if (!session) {
        redirect(`/login?callbackURL=${encodeURIComponent(pathname)}`);
    }

    if (!canRead) {
        forbidden();
    }

    return (
        <>
            <div className="flex flex-1 flex-col">
                <div className="@container/main flex flex-1 flex-col gap-2">
                    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                        <div className="flex flex-col lg:flex-row lg:justify-between px-4 lg:px-6 gap-4">

                            {/* Left: Title */}
                            <div className="flex items-center gap-3 self-start lg:self-center">
                                <div className="p-3 bg-primary/10 rounded-full">
                                    <Ticket className="h-8 w-8 text-primary" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h1 className="text-3xl font-bold tracking-tight">Receipts</h1>
                                        {totalCount > 0 && (
                                            <Badge variant="primary" appearance="outline">
                                                {totalCount}
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="text-muted-foreground">
                                        Manage receipt vouchers
                                    </p>
                                </div>
                            </div>

                            {/* Right: Actions & Filters Group */}
                            <div className="flex flex-col gap-3 w-full lg:w-auto lg:items-end">

                                {/* Row 1: Actions */}
                                <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
                                    {canViewTrash && (
                                        <Link href="./receipts/trash" className="w-full sm:w-auto">
                                            <Button variant="outline" className="gap-2 w-full sm:w-auto">
                                                <Trash2 className="h-4 w-4" />
                                                Trash
                                            </Button>
                                        </Link>
                                    )}
                                    {canViewReports && (
                                        <Link href="/reports/payments-report" className="w-full sm:w-auto">
                                            <Button variant="outline" className="gap-2 w-full sm:w-auto">
                                                <BarChart3 className="h-4 w-4" /> Reports
                                            </Button>
                                        </Link>
                                    )}
                                    {canCreate && (
                                        <Button
                                            onClick={() => setIsReceiptFormOpen(true)}
                                            className="gap-2 w-full sm:w-auto"
                                        >
                                            <Plus className="h-4 w-4" />
                                            New Receipt
                                        </Button>
                                    )}
                                </div>

                                {/* Row 2: Date Filters */}
                                <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
                                    {/* Date Range Picker */}
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                className="w-full sm:w-[260px] justify-between px-3 font-normal"
                                            >
                                                <span className={cn("truncate", !dateRange && "text-muted-foreground")}>
                                                    {dateRange?.from ? (
                                                        dateRange.to ? (
                                                            <>
                                                                {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                                                            </>
                                                        ) : (
                                                            format(dateRange.from, "LLL dd, y")
                                                        )
                                                    ) : (
                                                        "Pick a date range"
                                                    )}
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

                                    {/* Quick Select Dropdown */}
                                    <Select onValueChange={handleQuickSelect} defaultValue="last6Months">
                                        <SelectTrigger className="w-full sm:w-[180px]">
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
                            </div>
                        </div>

                        <div className="flex flex-col gap-4 px-4 lg:px-6 xl:gap-6">
                            <div className={cn("transition-opacity duration-200", isInitialLoad ? "opacity-50" : "opacity-100")}>
                                {isInitialLoad ? (
                                    <Card>
                                        <CardContent className="p-6">
                                            <DataTableSkeleton
                                                columnCount={columns.length}
                                                rowCount={10}
                                            />
                                        </CardContent>
                                    </Card>
                                ) : receipts.length > 0 || (urlState.filters && urlState.filters.length > 0) ? (
                                    <Card>
                                        <CardContent className="p-6">
                                            <div className={cn("transition-opacity duration-200", isLoading ? "opacity-50 pointer-events-none" : "opacity-100")}>
                                                <DataTable table={table}>
                                                    <DataTableToolbar table={table} />
                                                </DataTable>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ) : (
                                    <Card>
                                        <CardContent className="flex flex-col items-center justify-center py-12">
                                            <ReceiptIcon className="h-12 w-12 text-muted-foreground mb-4" />
                                            <h3 className="text-lg font-semibold mb-2">No receipts yet</h3>
                                            <p className="text-muted-foreground text-center mb-4">
                                                Your receipts will appear here once you create them
                                            </p>
                                            {canCreate && (
                                                <Button onClick={() => setIsReceiptFormOpen(true)} className="gap-2">
                                                    <Plus className="h-4 w-4" />
                                                    Create Receipt
                                                </Button>
                                            )}
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <ReceiptForm
                isOpen={isReceiptFormOpen}
                onClose={() => setIsReceiptFormOpen(false)}
                onSubmit={handleReceiptFormSubmit}
            />

            <PDFViewerModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                pdfUrl={selectedPdfUrl}
                title={selectedPdfTitle}
            />

            {/* Receipt View Modal */}
            <ReceiptViewModal
                isOpen={viewModalOpen}
                onClose={() => {
                    setViewModalOpen(false);
                    setReceiptToView(null);
                }}
                receipt={receiptToView}
                onViewPdf={handleViewPdf}
                onViewInvoice={handleViewInvoicePdf}
                onViewCreditNote={handleViewCreditNotePdf}
                onViewDebitNote={handleViewDebitNotePdf}
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
            <ReceiptsPageContent />
        </Suspense>
    );
}
