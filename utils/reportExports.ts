// utils/reportExports.ts
import * as XLSX from 'xlsx';
import { formatCurrency } from '@/utils/formatters/currency';
import { format } from 'date-fns';

// --- Interfaces ---
export interface CompanyDetails {
  companyName: string;
  address?: string;
  contactNumber?: string;
  email?: string;
  website?: string;
  logoUrl?: string;
}

// --- Style Constants ---
const COLORS = {
  primary: [26, 35, 126] as [number, number, number], // Deep Blue
  secondary: [40, 53, 147] as [number, number, number], // Lighter Blue
  accent: [255, 235, 59] as [number, number, number], // Yellow
  tableHeader: [245, 245, 245] as [number, number, number], // Light Gray
  text: [0, 0, 0] as [number, number, number],
  sectionBg: [240, 242, 255] as [number, number, number], // Very Light Blue for sections
};

// --- Shared Helpers ---

const addExcelHeader = (ws: XLSX.WorkSheet, title: string, dateInfo: string, company: CompanyDetails | null) => {
  XLSX.utils.sheet_add_aoa(ws, [
    [company?.companyName || 'Company Name'],
    [title.toUpperCase()],
    [dateInfo],
    ['Generated on:', format(new Date(), 'yyyy-MM-dd HH:mm')],
    ['']
  ], { origin: 'A1' });
};

// --- 1. LEDGER EXPORTS ---

export function exportLedgerToExcel(ledgerData: any, startDate: Date, endDate: Date, company: CompanyDetails | null) {
  const ws = XLSX.utils.aoa_to_sheet([]);
  const dateStr = `${format(startDate, 'dd MMM yyyy')} - ${format(endDate, 'dd MMM yyyy')}`;

  addExcelHeader(ws, 'GENERAL LEDGER', dateStr, company);

  XLSX.utils.sheet_add_aoa(ws, [
    ['Account Code:', ledgerData.account.accountCode],
    ['Account Name:', ledgerData.account.accountName],
    ['Group:', ledgerData.account.groupName],
    ['Opening Balance:', ledgerData.openingBalance],
    ['']
  ], { origin: 'A6' });

  const headers = ['Date', 'Journal #', 'Type', 'Ref #', 'Narration', 'Debit', 'Credit', 'Balance'];
  const data = ledgerData.entries.map((e: any) => [
    format(new Date(e.date), 'yyyy-MM-dd'),
    e.journalNumber,
    e.referenceType,
    e.referenceNumber || '',
    e.narration,
    e.debit,
    e.credit,
    e.balance
  ]);

  XLSX.utils.sheet_add_aoa(ws, [headers, ...data], { origin: 'A12' });

  const lastRow = 12 + data.length;
  XLSX.utils.sheet_add_aoa(ws, [[
    'TOTALS:', '', '', '', '',
    ledgerData.totalDebit,
    ledgerData.totalCredit,
    ledgerData.closingBalance
  ]], { origin: `A${lastRow + 1}` });

  ws['!cols'] = [{ wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 50 }, { wch: 12 }, { wch: 12 }, { wch: 15 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Ledger');
  XLSX.writeFile(wb, `Ledger_${ledgerData.account.accountCode}.xlsx`);
}

// --- 2. TRIAL BALANCE EXPORTS ---

export function exportTrialBalanceToExcel(data: any[], asOfDate: Date, company: CompanyDetails | null) {
  const ws = XLSX.utils.json_to_sheet([]);
  addExcelHeader(ws, 'TRIAL BALANCE', `As of ${format(asOfDate, 'dd MMM yyyy')}`, company);

  const rows = data.map(item => ({
    'Code': item.accountCode,
    'Account Name': item.accountName,
    'Group': item.groupName,
    'Debit': item.totalDebit,
    'Credit': item.totalCredit,
    'Balance': item.balance
  }));

  XLSX.utils.sheet_add_json(ws, rows, { origin: 'A6' });
  ws['!cols'] = [{ wch: 10 }, { wch: 30 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Trial Balance');
  XLSX.writeFile(wb, `Trial_Balance_${format(asOfDate, 'yyyyMMdd')}.xlsx`);
}

// --- 3. PROFIT & LOSS EXPORTS ---

export function exportProfitLossToExcel(income: any[], expenses: any[], dateRange: { from: Date; to: Date }, company: CompanyDetails | null) {
  const ws = XLSX.utils.aoa_to_sheet([]);
  const dateStr = `${format(dateRange.from, 'dd MMM yyyy')} - ${format(dateRange.to, 'dd MMM yyyy')}`;

  addExcelHeader(ws, 'PROFIT & LOSS STATEMENT', dateStr, company);

  const totalIncome = income.reduce((sum, i) => sum + i.amount, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  const rows = [
    ['REVENUE'],
    ['Account', 'Subgroup', 'Amount'],
    ...income.map(i => [i.accountName, i.subGroup, i.amount]),
    ['TOTAL REVENUE', '', totalIncome],
    [],
    ['EXPENSES'],
    ['Account', 'Subgroup', 'Amount'],
    ...expenses.map(e => [e.accountName, e.subGroup, e.amount]),
    ['TOTAL EXPENSES', '', totalExpenses],
    [],
    ['NET PROFIT/LOSS', '', totalIncome - totalExpenses]
  ];

  XLSX.utils.sheet_add_aoa(ws, rows, { origin: 'A6' });
  ws['!cols'] = [{ wch: 40 }, { wch: 25 }, { wch: 15 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'P&L');
  XLSX.writeFile(wb, `Profit_Loss_${format(dateRange.to, 'yyyyMMdd')}.xlsx`);
}

// --- 4. BALANCE SHEET EXPORTS ---

export function exportBalanceSheetToExcel(data: any, asOfDate: Date, company: CompanyDetails | null) {
  const ws = XLSX.utils.aoa_to_sheet([]);
  addExcelHeader(ws, 'BALANCE SHEET', `As of ${format(asOfDate, 'dd MMM yyyy')}`, company);

  const section = (header: string, dataObj: Record<string, number>, totalLabel: string, totalVal: number) => [
    [header.toUpperCase()],
    ...Object.entries(dataObj).map(([k, v]) => [k, v]),
    [totalLabel, totalVal],
    []
  ];

  const rows = [
    ['ASSETS'],
    ...section('Current Assets', data.assets.currentAssets, 'Total Current Assets', data.totals.totalCurrentAssets),
    ...section('Fixed Assets', data.assets.fixedAssets, 'Total Fixed Assets', data.totals.totalFixedAssets),
    ['TOTAL ASSETS', data.totals.totalAssets],
    [],
    ['LIABILITIES'],
    ...section('Liabilities', { ...data.liabilities.currentLiabilities, ...data.liabilities.longTermLiabilities }, 'Total Liabilities', data.totals.totalLiabilities),
    [],
    ['EQUITY'],
    ...section('Equity', data.equity, 'Total Equity', data.totals.totalEquity),
    ['TOTAL LIABILITIES & EQUITY', data.totals.totalLiabilitiesEquity]
  ];

  XLSX.utils.sheet_add_aoa(ws, rows, { origin: 'A6' });
  ws['!cols'] = [{ wch: 40 }, { wch: 15 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Balance Sheet');
  XLSX.writeFile(wb, `Balance_Sheet_${format(asOfDate, 'yyyyMMdd')}.xlsx`);
}

// --- 5. CASH FLOW EXPORTS ---

export function exportCashFlowToExcel(data: any, dateRange: { from: Date; to: Date }, company: CompanyDetails | null) {
  const ws = XLSX.utils.aoa_to_sheet([]);
  const dateStr = `${format(dateRange.from, 'dd MMM yyyy')} - ${format(dateRange.to, 'dd MMM yyyy')}`;

  addExcelHeader(ws, 'CASH FLOW STATEMENT', dateStr, company);

  const section = (title: string, dataObj: Record<string, number>, total: number) => [
    [title.toUpperCase()],
    ...Object.entries(dataObj).map(([k, v]) => [k, v]),
    [`Net ${title}`, total],
    []
  ];

  const rows = [
    ...section('Operating Activities', data.operating, data.totals.operatingCash),
    ...section('Investing Activities', data.investing, data.totals.investingCash),
    ...section('Financing Activities', data.financing, data.totals.financingCash),
    ['NET INCREASE/DECREASE IN CASH', data.totals.netCashChange]
  ];

  XLSX.utils.sheet_add_aoa(ws, rows, { origin: 'A6' });
  ws['!cols'] = [{ wch: 40 }, { wch: 15 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Cash Flow');
  XLSX.writeFile(wb, `Cash_Flow_${format(dateRange.to, 'yyyyMMdd')}.xlsx`);
}

// ============================================================
// GENERAL REPORT EXPORTS (Sales, Purchase, Expense, Tax, Payments, Inventory)
// ============================================================

// --- 6. SALES REPORT ---
export function exportSalesReportToExcel(
  monthlyBreakdown: Array<{ month: string; invoiceCount: number; revenue: number; tax: number; netTotal: number }>,
  summary: { totalRevenue: number; totalTax: number; totalNetTotal: number; totalInvoices: number; avgInvoiceValue: number },
  dateRange: { from: Date; to: Date },
  company: CompanyDetails | null,
) {
  const ws = XLSX.utils.aoa_to_sheet([]);
  const dateStr = `${format(dateRange.from, 'dd MMM yyyy')} - ${format(dateRange.to, 'dd MMM yyyy')}`;
  addExcelHeader(ws, 'SALES REPORT', dateStr, company);

  const rows = [
    ['Month', 'Invoices', 'Revenue', 'Tax', 'Net Total'],
    ...monthlyBreakdown.map(r => [r.month, r.invoiceCount, r.revenue, r.tax, r.netTotal]),
    [],
    ['TOTAL', summary.totalInvoices, summary.totalRevenue, summary.totalTax, summary.totalNetTotal],
    ['Average Invoice Value', '', summary.avgInvoiceValue],
  ];

  XLSX.utils.sheet_add_aoa(ws, rows, { origin: 'A6' });
  ws['!cols'] = [{ wch: 20 }, { wch: 12 }, { wch: 16 }, { wch: 16 }, { wch: 16 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sales Report');
  XLSX.writeFile(wb, `Sales_Report_${format(dateRange.from, 'yyyyMMdd')}_${format(dateRange.to, 'yyyyMMdd')}.xlsx`);
}

// --- 7. PURCHASE REPORT ---
export function exportPurchaseReportToExcel(
  monthlyBreakdown: Array<{ month: string; purchaseCount: number; amount: number; tax: number; netTotal: number }>,
  summary: { totalAmount: number; totalTax: number; totalNetTotal: number; totalPurchases: number; avgPurchaseValue: number },
  dateRange: { from: Date; to: Date },
  company: CompanyDetails | null,
) {
  const ws = XLSX.utils.aoa_to_sheet([]);
  const dateStr = `${format(dateRange.from, 'dd MMM yyyy')} - ${format(dateRange.to, 'dd MMM yyyy')}`;
  addExcelHeader(ws, 'PURCHASE REPORT', dateStr, company);

  const rows = [
    ['Month', 'Orders', 'Amount', 'Tax', 'Net Total'],
    ...monthlyBreakdown.map(r => [r.month, r.purchaseCount, r.amount, r.tax, r.netTotal]),
    [],
    ['TOTAL', summary.totalPurchases, summary.totalAmount, summary.totalTax, summary.totalNetTotal],
    ['Average Order Value', '', summary.avgPurchaseValue],
  ];

  XLSX.utils.sheet_add_aoa(ws, rows, { origin: 'A6' });
  ws['!cols'] = [{ wch: 20 }, { wch: 12 }, { wch: 16 }, { wch: 16 }, { wch: 16 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Purchase Report');
  XLSX.writeFile(wb, `Purchase_Report_${format(dateRange.from, 'yyyyMMdd')}_${format(dateRange.to, 'yyyyMMdd')}.xlsx`);
}

// --- 8. EXPENSE REPORT ---
export function exportExpenseReportToExcel(
  monthlyBreakdown: Array<{ period: string; totalAmount: number; totalExpenses: number; topCategory: string; averageExpense: number; highestExpense: number; trendVsLastMonth?: number }>,
  summary: { totalAmount: number; totalCount: number; averageExpense: number },
  dateRange: { from: Date; to: Date },
  company: CompanyDetails | null,
) {
  const ws = XLSX.utils.aoa_to_sheet([]);
  const dateStr = `${format(dateRange.from, 'dd MMM yyyy')} - ${format(dateRange.to, 'dd MMM yyyy')}`;
  addExcelHeader(ws, 'EXPENSE REPORT', dateStr, company);

  const rows = [
    ['Period', 'No. of Expenses', 'Top Category', 'Total Amount', 'Avg per Expense'],
    ...monthlyBreakdown.map(r => [r.period, r.totalExpenses, r.topCategory || 'N/A', r.totalAmount, r.averageExpense]),
    [],
    ['TOTAL', summary.totalCount, '', summary.totalAmount, summary.averageExpense],
  ];

  XLSX.utils.sheet_add_aoa(ws, rows, { origin: 'A6' });
  ws['!cols'] = [{ wch: 18 }, { wch: 16 }, { wch: 25 }, { wch: 16 }, { wch: 16 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Expense Report');
  XLSX.writeFile(wb, `Expense_Report_${format(dateRange.from, 'yyyyMMdd')}_${format(dateRange.to, 'yyyyMMdd')}.xlsx`);
}

// --- 9. TAX REPORT ---
export function exportTaxReportToExcel(
  monthlyBreakdown: Array<{ period: string; salesTax: number; purchaseTax: number; netTaxLiability: number; salesTransactions: number; purchaseTransactions: number }>,
  summary: { totalSalesTax: number; totalPurchaseTax: number; netTaxLiability: number; salesTransactions: number; purchaseTransactions: number },
  dateRange: { from: Date; to: Date },
  company: CompanyDetails | null,
) {
  const ws = XLSX.utils.aoa_to_sheet([]);
  const dateStr = `${format(dateRange.from, 'dd MMM yyyy')} - ${format(dateRange.to, 'dd MMM yyyy')}`;
  addExcelHeader(ws, 'TAX REPORT', dateStr, company);

  const rows = [
    ['Period', 'Sales Tax', 'Purchase Tax', 'Net Tax Liability', 'Total Txns'],
    ...monthlyBreakdown.map(r => [r.period, r.salesTax, r.purchaseTax, r.netTaxLiability, r.salesTransactions + r.purchaseTransactions]),
    [],
    ['TOTAL', summary.totalSalesTax, summary.totalPurchaseTax, summary.netTaxLiability, summary.salesTransactions + summary.purchaseTransactions],
  ];

  XLSX.utils.sheet_add_aoa(ws, rows, { origin: 'A6' });
  ws['!cols'] = [{ wch: 18 }, { wch: 16 }, { wch: 16 }, { wch: 18 }, { wch: 12 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Tax Report');
  XLSX.writeFile(wb, `Tax_Report_${format(dateRange.from, 'yyyyMMdd')}_${format(dateRange.to, 'yyyyMMdd')}.xlsx`);
}

// --- 10. PAYMENTS REPORT ---
export function exportPaymentsReportToExcel(
  monthlyBreakdown: Array<{ month: string; totalInflow: number; totalOutflow: number; netMovement: number; inflowCount: number; outflowCount: number }>,
  summary: { totalCashIn: number; totalCashOut: number; netCashMovement: number; openingBalance: number; closingBalance: number; totalTransactions: number },
  dateRange: { from: Date; to: Date },
  company: CompanyDetails | null,
) {
  const ws = XLSX.utils.aoa_to_sheet([]);
  const dateStr = `${format(dateRange.from, 'dd MMM yyyy')} - ${format(dateRange.to, 'dd MMM yyyy')}`;
  addExcelHeader(ws, 'PAYMENTS REPORT', dateStr, company);

  const rows = [
    ['Month', 'Total Inflow', 'Total Outflow', 'Net Movement', 'Receipts', 'Payments'],
    ...monthlyBreakdown.map(r => [r.month, r.totalInflow, r.totalOutflow, r.netMovement, r.inflowCount, r.outflowCount]),
    [],
    ['TOTAL', summary.totalCashIn, summary.totalCashOut, summary.netCashMovement, summary.totalTransactions],
    [],
    ['Opening Balance', summary.openingBalance],
    ['Closing Balance', summary.closingBalance],
  ];

  XLSX.utils.sheet_add_aoa(ws, rows, { origin: 'A6' });
  ws['!cols'] = [{ wch: 20 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 12 }, { wch: 12 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Payments Report');
  XLSX.writeFile(wb, `Payments_Report_${format(dateRange.from, 'yyyyMMdd')}_${format(dateRange.to, 'yyyyMMdd')}.xlsx`);
}

// --- 11. INVENTORY REPORT ---
export function exportInventoryReportToExcel(
  inventory: Array<{ name: string; category: string; type: string; openingQty: number; purchased: number; sold: number; adjusted: number; closingQty: number; unitCost: number; stockValue: number; status: string }>,
  summary: { totalItems: number; totalStockValue: number; lowStockItems: number; outOfStockItems: number; avgStockValue: number },
  dateRange: { from: Date; to: Date },
  company: CompanyDetails | null,
) {
  const ws = XLSX.utils.aoa_to_sheet([]);
  const dateStr = `${format(dateRange.from, 'dd MMM yyyy')} - ${format(dateRange.to, 'dd MMM yyyy')}`;
  addExcelHeader(ws, 'INVENTORY REPORT', dateStr, company);

  const rows = [
    ['Name', 'Category', 'Type', 'Opening', 'Purchased', 'Adjusted', 'Closing Qty', 'Unit Cost', 'Stock Value', 'Status'],
    ...inventory.map(r => [r.name, r.category, r.type, r.openingQty, r.purchased, r.adjusted, r.closingQty, r.unitCost, r.stockValue, r.status]),
    [],
    ['SUMMARY'],
    ['Total Materials', summary.totalItems],
    ['Total Stock Value', summary.totalStockValue],
    ['Low Stock Items', summary.lowStockItems],
    ['Out of Stock Items', summary.outOfStockItems],
    ['Avg Material Value', summary.avgStockValue],
  ];

  XLSX.utils.sheet_add_aoa(ws, rows, { origin: 'A6' });
  ws['!cols'] = [{ wch: 28 }, { wch: 20 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 14 }, { wch: 16 }, { wch: 14 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Inventory Report');
  XLSX.writeFile(wb, `Inventory_Report_${format(dateRange.from, 'yyyyMMdd')}_${format(dateRange.to, 'yyyyMMdd')}.xlsx`);
}