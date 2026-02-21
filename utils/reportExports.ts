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