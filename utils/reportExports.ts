// utils/reportExports.ts
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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

const createDoc = (title: string, subtitle: string, company: CompanyDetails | null, orientation: 'portrait' | 'landscape' = 'portrait') => {
  const doc = new jsPDF({ orientation, unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  
  // 1. Header Background
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageWidth, 25, 'F');

  // 2. Company Info
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text(company?.companyName || "Company Name", 14, 10);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  let yPos = 16;
  if (company?.address) {
    doc.text(company.address, 14, yPos);
    yPos += 4;
  }
  if (company?.contactNumber || company?.email) {
    const contactText = [company.contactNumber, company.email].filter(Boolean).join(' | ');
    doc.text(contactText, 14, yPos);
  }

  // 3. Report Title Bar
  doc.setFillColor(...COLORS.secondary);
  doc.rect(0, 25, pageWidth, 12, 'F');
  
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text(title.toUpperCase(), 14, 32.5);
  
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.accent);
  doc.text(subtitle, pageWidth - 14, 32.5, { align: 'right' });

  // 4. Footer Helper
  const addFooter = (pageNumber: number) => {
    doc.setFillColor(...COLORS.primary);
    doc.rect(0, pageHeight - 12, pageWidth, 12, 'F');
    
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text(`Generated on: ${format(new Date(), 'dd MMM yyyy HH:mm')}`, 14, pageHeight - 5);
    doc.text(`Page ${pageNumber}`, pageWidth - 14, pageHeight - 5, { align: 'right' });
  };

  // Return pageHeight so it can be used in other functions
  return { doc, startY: 45, pageWidth, pageHeight, addFooter };
};

const saveOrReturnBlob = (doc: jsPDF, filename: string, output: 'download' | 'blob', addFooter: (n: number) => void) => {
  const pageCount = doc.getNumberOfPages();
  for(let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    addFooter(i);
  }

  if (output === 'blob') {
    return URL.createObjectURL(doc.output('blob'));
  }
  doc.save(filename);
  return filename;
};

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

export function exportLedgerToPDF(
  ledgerData: any, 
  startDate: Date, 
  endDate: Date, 
  company: CompanyDetails | null,
  output: 'download' | 'blob' = 'download'
) {
  const dateStr = `${format(startDate, 'dd MMM yyyy')} - ${format(endDate, 'dd MMM yyyy')}`;
  const { doc, startY, pageWidth, pageHeight, addFooter } = createDoc('GENERAL LEDGER', dateStr, company, 'landscape');

  // Account Info Box
  doc.setFillColor(245, 245, 245);
  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(0.5);
  doc.rect(14, startY - 5, pageWidth - 28, 24, 'FD');

  doc.setFontSize(11);
  doc.setTextColor(...COLORS.primary);
  doc.setFont('helvetica', 'bold');
  doc.text('Account Details:', 18, startY + 2);
  
  doc.setFontSize(10);
  doc.setTextColor(0);
  doc.text(`${ledgerData.account.accountCode} - ${ledgerData.account.accountName}`, 18, startY + 8);
  
  doc.setFontSize(9);
  doc.setTextColor(80);
  doc.text(`Group: ${ledgerData.account.groupName} > ${ledgerData.account.subGroup}`, 18, startY + 13);

  doc.setFontSize(10);
  doc.setTextColor(...COLORS.primary);
  doc.setFont('helvetica', 'bold');
  doc.text('Opening Balance:', pageWidth - 80, startY + 2); 
  
  doc.setTextColor(0);
  doc.text(formatCurrency(ledgerData.openingBalance), pageWidth - 20, startY + 2, { align: 'right' });

  const tableData = ledgerData.entries.map((entry: any) => [
    format(new Date(entry.date), 'dd MMM yyyy'),
    entry.journalNumber,
    entry.referenceType,
    entry.referenceNumber || '-',
    entry.narration,
    entry.debit > 0 ? formatCurrency(entry.debit) : '-',
    entry.credit > 0 ? formatCurrency(entry.credit) : '-',
    formatCurrency(entry.balance),
  ]);

  autoTable(doc, {
    startY: startY + 25,
    head: [['Date', 'Journal #', 'Type', 'Ref #', 'Narration', 'Debit', 'Credit', 'Balance']],
    body: tableData,
    foot: [[
      '', '', '', 'TOTAL', '', 
      formatCurrency(ledgerData.totalDebit), 
      formatCurrency(ledgerData.totalCredit), 
      formatCurrency(ledgerData.closingBalance)
    ]],
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: COLORS.tableHeader, textColor: COLORS.primary, fontStyle: 'bold' },
    columnStyles: {
      4: { cellWidth: 'auto' },
      5: { halign: 'right' },
      6: { halign: 'right' },
      7: { halign: 'right', fontStyle: 'bold', textColor: COLORS.primary },
    },
    footStyles: { fillColor: [232, 234, 246], textColor: COLORS.primary, fontStyle: 'bold' },
  });

  return saveOrReturnBlob(doc, `Ledger_${ledgerData.account.accountCode}.pdf`, output, addFooter);
}

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

export function exportTrialBalanceToPDF(
  data: any[],
  summary: any,
  asOfDate: Date,
  company: CompanyDetails | null,
  output: 'download' | 'blob' = 'download'
) {
  const { doc, startY, addFooter } = createDoc('TRIAL BALANCE', `As of ${format(asOfDate, 'dd MMM yyyy')}`, company);

  const tableData = data.map(item => [
    item.accountCode,
    item.accountName,
    item.groupName,
    formatCurrency(item.totalDebit),
    formatCurrency(item.totalCredit),
    formatCurrency(item.balance)
  ]);

  autoTable(doc, {
    startY,
    head: [['Code', 'Account Name', 'Group', 'Debit', 'Credit', 'Balance']],
    body: tableData,
    foot: summary ? [[
      '', 'TOTAL', '',
      formatCurrency(summary.totalDebits),
      formatCurrency(summary.totalCredits),
      formatCurrency(summary.difference)
    ]] : undefined,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: COLORS.tableHeader, textColor: COLORS.primary, fontStyle: 'bold' },
    columnStyles: {
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right', fontStyle: 'bold', textColor: COLORS.primary }
    },
    footStyles: { fillColor: [232, 234, 246], textColor: COLORS.primary, fontStyle: 'bold' }
  });

  return saveOrReturnBlob(doc, `Trial_Balance_${format(asOfDate, 'yyyyMMdd')}.pdf`, output, addFooter);
}

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

export function exportProfitLossToPDF(
  income: any[],
  expenses: any[],
  totals: { income: number; expenses: number; netProfit: number },
  dateRange: { from: Date; to: Date },
  company: CompanyDetails | null,
  output: 'download' | 'blob' = 'download'
) {
  const dateStr = `${format(dateRange.from, 'dd MMM yyyy')} - ${format(dateRange.to, 'dd MMM yyyy')}`;
  const { doc, startY, addFooter } = createDoc('PROFIT & LOSS STATEMENT', dateStr, company);

  let currentY = startY;

  const drawSection = (title: string, items: any[], sectionTotal: number, color: [number, number, number]) => {
    // Header Title - Uniform Color
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.primary); // Uniform color for headings
    doc.text(title, 14, currentY);
    currentY += 5;

    autoTable(doc, {
      startY: currentY,
      head: [['Account Name', 'Subgroup', 'Amount']],
      body: items.map(i => [i.accountName, i.subGroup, formatCurrency(i.amount)]),
      foot: [['', `Total ${title}`, formatCurrency(sectionTotal)]],
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: COLORS.tableHeader, textColor: COLORS.primary, fontStyle: 'bold' },
      columnStyles: { 
        0: { cellWidth: 100 },
        2: { halign: 'right' } 
      },
      // Apply the distinct color only to the footer/totals
      footStyles: { halign: 'right', fontStyle: 'bold', textColor: color, fillColor: [250, 250, 250] }
    });
    
    currentY = (doc as any).lastAutoTable.finalY + 15;
  };

  drawSection('REVENUE / INCOME', income, totals.income, [46, 125, 50]);
  drawSection('EXPENSES', expenses, totals.expenses, [198, 40, 40]);

  // Net Profit
  doc.setFillColor(245, 245, 245);
  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(0.5);
  doc.rect(14, currentY - 5, 182, 15, 'FD');
  
  doc.setFontSize(14);
  doc.setTextColor(...COLORS.primary);
  doc.text("NET PROFIT / LOSS", 20, currentY + 5);
  
  const profitColor = totals.netProfit >= 0 ? [46, 125, 50] : [198, 40, 40];
  doc.setTextColor(profitColor[0], profitColor[1], profitColor[2] as number);
  doc.text(formatCurrency(totals.netProfit), 190, currentY + 5, { align: 'right' });

  return saveOrReturnBlob(doc, `Profit_Loss_${format(dateRange.to, 'yyyyMMdd')}.pdf`, output, addFooter);
}

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

export function exportBalanceSheetToPDF(
  data: any, 
  asOfDate: Date,
  company: CompanyDetails | null,
  output: 'download' | 'blob' = 'download'
) {
  const { doc, startY, pageWidth, pageHeight, addFooter } = createDoc('BALANCE SHEET', `As of ${format(asOfDate, 'dd MMM yyyy')}`, company);
  let currentY = startY;
  const bottomMargin = 20;

  // Pagination Check Helper
  const checkPageBreak = (heightNeeded: number) => {
    if (currentY + heightNeeded > pageHeight - bottomMargin) {
      doc.addPage();
      currentY = 30; // Reset to top margin
    }
  };

  const flatten = (record: Record<string, number>) => Object.entries(record).map(([k, v]) => [k, formatCurrency(v)]);

  const drawCategory = (title: string, items: any[][], totalLabel: string, totalValue: number, color: [number, number, number]) => {
    checkPageBreak(15); // Check for header space
    
    // Section Sub-Header - Uniform Color for Heading
    doc.setFontSize(11);
    doc.setTextColor(...COLORS.primary); // Uniform color
    doc.setFont('helvetica', 'bold');
    doc.text(title, 14, currentY);
    currentY += 6;

    // Table
    if (items.length > 0) {
      autoTable(doc, {
        startY: currentY,
        body: items,
        theme: 'plain', // Cleaner modern look
        showHead: 'never',
        columnStyles: { 0: { cellWidth: 120 }, 1: { halign: 'right' } },
        styles: { cellPadding: 2, fontSize: 10, lineColor: [240, 240, 240] },
        margin: { left: 14, right: 14 },
        didDrawPage: (data) => {
           // If table breaks page, update currentY to end of table
           if (data.cursor) {
              currentY = data.cursor.y;
           }
        }
      });
      currentY = (doc as any).lastAutoTable.finalY + 4;
    } else {
        currentY += 4;
    }

    checkPageBreak(12); // Check for subtotal space

    // Subtotal Bar - Apply distinct color to the totals only
    doc.setFillColor(250, 250, 250);
    doc.rect(14, currentY, 182, 8, 'F');
    doc.setFontSize(10);
    doc.setTextColor(50, 50, 50);
    doc.text(totalLabel, 18, currentY + 5.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...color); // Distinct color for the total value
    doc.text(formatCurrency(totalValue), 192, currentY + 5.5, { align: 'right' });
    
    currentY += 15;
  };

  const drawMainHeader = (title: string) => {
    // Only check page break for main header if NOT forced to new page already
    checkPageBreak(15);
    doc.setFillColor(...COLORS.sectionBg);
    doc.rect(14, currentY, 182, 10, 'F');
    doc.setFontSize(14);
    doc.setTextColor(...COLORS.primary);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 18, currentY + 7);
    currentY += 18;
  };

  const drawGrandTotal = (label: string, value: number) => {
    checkPageBreak(20);
    currentY += 5;
    doc.setDrawColor(...COLORS.primary);
    doc.setLineWidth(0.5);
    doc.line(14, currentY, 196, currentY);
    doc.line(14, currentY + 1.5, 196, currentY + 1.5);
    
    currentY += 8;
    doc.setFontSize(12);
    doc.setTextColor(...COLORS.primary);
    doc.setFont('helvetica', 'bold');
    doc.text(label, 14, currentY);
    doc.text(formatCurrency(value), 192, currentY, { align: 'right' });
    currentY += 10;
  };

  // --- ASSETS SECTION (Page 1) ---
  drawMainHeader('ASSETS');

  drawCategory('Current Assets', flatten(data.assets.currentAssets), 'Total Current Assets', data.totals.totalCurrentAssets, COLORS.secondary);
  drawCategory('Fixed Assets', flatten(data.assets.fixedAssets), 'Total Fixed Assets', data.totals.totalFixedAssets, COLORS.secondary);

  drawGrandTotal('TOTAL ASSETS', data.totals.totalAssets);

  // --- FORCE PAGE BREAK FOR LIABILITIES & EQUITY (Page 2) ---
  doc.addPage();
  currentY = 30; // Reset to top margin for new page

  // --- LIABILITIES & EQUITY SECTION ---
  drawMainHeader('LIABILITIES & EQUITY');

  const liabItems = [...flatten(data.liabilities.currentLiabilities), ...flatten(data.liabilities.longTermLiabilities)];
  drawCategory('Liabilities', liabItems, 'Total Liabilities', data.totals.totalLiabilities, [198, 40, 40]);
  
  drawCategory('Equity', flatten(data.equity), 'Total Equity', data.totals.totalEquity, [100, 100, 100]);

  drawGrandTotal('TOTAL LIABILITIES & EQUITY', data.totals.totalLiabilitiesEquity);

  return saveOrReturnBlob(doc, `Balance_Sheet_${format(asOfDate, 'yyyyMMdd')}.pdf`, output, addFooter);
}

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

export function exportCashFlowToPDF(
  data: any, 
  dateRange: { from: Date; to: Date },
  company: CompanyDetails | null,
  output: 'download' | 'blob' = 'download'
) {
  const dateStr = `${format(dateRange.from, 'dd MMM yyyy')} - ${format(dateRange.to, 'dd MMM yyyy')}`;
  const { doc, startY, pageWidth, pageHeight, addFooter } = createDoc('CASH FLOW STATEMENT', dateStr, company);
  let currentY = startY;
  const bottomMargin = 20;

  const checkPageBreak = (heightNeeded: number) => {
    if (currentY + heightNeeded > pageHeight - bottomMargin) {
      doc.addPage();
      currentY = 30; 
    }
  };

  const drawSection = (title: string, items: Record<string, number>, total: number, color: [number, number, number]) => {
    checkPageBreak(15);
    
    // Section Header with background
    doc.setFillColor(...COLORS.sectionBg);
    doc.rect(14, currentY, 182, 9, 'F');
    doc.setFontSize(12);
    doc.setTextColor(...color);
    doc.setFont('helvetica', 'bold');
    doc.text(title.toUpperCase(), 18, currentY + 6);
    currentY += 12;

    const entries = Object.entries(items).map(([k, v]) => [k, formatCurrency(v)]);
    if (entries.length > 0) {
      autoTable(doc, {
        startY: currentY,
        body: entries,
        theme: 'plain',
        showHead: 'never',
        columnStyles: { 0: { cellWidth: 120 }, 1: { halign: 'right' } },
        styles: { cellPadding: 3, fontSize: 10, lineColor: [240, 240, 240] },
        margin: { left: 14, right: 14 },
        didDrawPage: (data) => {
           if (data.cursor) {
              currentY = data.cursor.y;
           }
        }
      });
      currentY = (doc as any).lastAutoTable.finalY + 5;
    } else {
        currentY += 5;
    }

    checkPageBreak(12);

    // Subtotal
    doc.setFillColor(250, 250, 250);
    doc.rect(14, currentY, 182, 8, 'F');
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text(`Net ${title}`, 18, currentY + 5.5);
    doc.setFont('helvetica', 'bold');
    doc.text(formatCurrency(total), 192, currentY + 5.5, { align: 'right' });
    
    currentY += 15;
  };

  drawSection('Operating Activities', data.operating, data.totals.operatingCash, COLORS.secondary);
  drawSection('Investing Activities', data.investing, data.totals.investingCash, COLORS.secondary);
  drawSection('Financing Activities', data.financing, data.totals.financingCash, COLORS.secondary);

  // Grand Total
  checkPageBreak(25);
  currentY += 5;
  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(0.5);
  doc.line(14, currentY, 196, currentY);
  doc.line(14, currentY + 1.5, 196, currentY + 1.5);
  
  currentY += 8;
  doc.setFontSize(14);
  doc.setTextColor(...COLORS.primary);
  doc.setFont('helvetica', 'bold');
  doc.text(`NET INCREASE/DECREASE IN CASH`, 14, currentY);
  doc.text(formatCurrency(data.totals.netCashChange), 192, currentY, { align: 'right' });

  return saveOrReturnBlob(doc, `Cash_Flow_${format(dateRange.to, 'yyyyMMdd')}.pdf`, output, addFooter);
}

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