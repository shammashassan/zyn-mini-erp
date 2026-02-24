import React from 'react';
import { Page, Text, Document, View, StyleSheet } from '@react-pdf/renderer';
import { format } from 'date-fns';
import { formatCurrency } from '@/utils/formatters/currency';
import { commonStyles, pdfColors, typography, spacing, registerPdfFonts } from '@/components/pdf/shared/styles';
import { DocumentHeader } from '@/components/pdf/shared/DocumentHeader';
import { DocumentFooter } from '@/components/pdf/shared/DocumentFooter';
import { DocumentTitle } from '@/components/pdf/shared/DocumentTitle';
import type { ICompanyDetails } from '@/models/CompanyDetails';

const s = StyleSheet.create({
    metaRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: spacing.md },
    metaText: { ...typography.body, color: pdfColors.textMuted },
    summaryGrid: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
    summaryBox: { flex: 1, backgroundColor: pdfColors.secondary, borderLeftWidth: 3, borderLeftColor: pdfColors.primary, padding: spacing.sm },
    summaryLabel: { ...typography.label, color: pdfColors.textMuted, marginBottom: 2 },
    summaryValue: { ...typography.emphasis, color: pdfColors.primary },
    tableHeader: { flexDirection: 'row', backgroundColor: pdfColors.secondary, paddingVertical: spacing.sm, paddingHorizontal: spacing.sm },
    tableRow: { flexDirection: 'row', paddingVertical: 5, paddingHorizontal: spacing.sm, borderBottomWidth: 0.5, borderBottomColor: pdfColors.border },
    tableRowAlt: { backgroundColor: '#fafafa' },
    th: { ...typography.label, color: pdfColors.primary },
    td: { ...typography.bodySmall, color: pdfColors.textDark },
    colMonth: { width: '20%' },
    colInflow: { width: '20%', textAlign: 'right' },
    colOutflow: { width: '20%', textAlign: 'right' },
    colNet: { width: '20%', textAlign: 'right' },
    colTxns: { width: '20%', textAlign: 'right' },
    totalRow: { flexDirection: 'row', paddingVertical: spacing.sm, paddingHorizontal: spacing.sm, borderTopWidth: 2, borderTopColor: pdfColors.primary, backgroundColor: pdfColors.secondary },
    totalLabel: { ...typography.emphasis, color: pdfColors.primary },
    totalValue: { ...typography.emphasis, color: pdfColors.primary },
});

// Matches actual API MonthlyBreakdown interface
interface MonthlyData {
    month: string;
    totalInflow: number;
    totalOutflow: number;
    netMovement: number;
    inflowCount: number;
    outflowCount: number;
}

interface PaymentsReportDocumentProps {
    monthlyBreakdown: MonthlyData[];
    summary: { totalCashIn: number; totalCashOut: number; netCashMovement: number; openingBalance: number; closingBalance: number; totalTransactions: number; };
    dateRange: { from: Date; to: Date };
    companyDetails: ICompanyDetails | null;
}

export const PaymentsReportDocument: React.FC<PaymentsReportDocumentProps> = ({ monthlyBreakdown, summary, dateRange, companyDetails }) => {
    registerPdfFonts();
    const dateStr = `${format(dateRange.from, 'dd MMM yyyy')} – ${format(dateRange.to, 'dd MMM yyyy')}`;
    return (
        <Document>
            <Page size="A4" style={commonStyles.page}>
                <DocumentHeader companyDetails={companyDetails} />
                <DocumentTitle title="Payments Report" />
                <View style={s.metaRow}><Text style={s.metaText}>{dateStr}</Text></View>
                <View style={s.summaryGrid}>
                    <View style={s.summaryBox}><Text style={s.summaryLabel}>Total Cash In</Text><Text style={s.summaryValue}>{formatCurrency(summary.totalCashIn)}</Text></View>
                    <View style={s.summaryBox}><Text style={s.summaryLabel}>Total Cash Out</Text><Text style={s.summaryValue}>{formatCurrency(summary.totalCashOut)}</Text></View>
                    <View style={s.summaryBox}><Text style={s.summaryLabel}>Net Cash Flow</Text><Text style={s.summaryValue}>{formatCurrency(summary.netCashMovement)}</Text></View>
                    <View style={s.summaryBox}><Text style={s.summaryLabel}>Closing Balance</Text><Text style={s.summaryValue}>{formatCurrency(summary.closingBalance)}</Text></View>
                </View>
                <View style={s.tableHeader}>
                    <Text style={[s.th, s.colMonth]}>Month</Text>
                    <Text style={[s.th, s.colInflow]}>Cash In</Text>
                    <Text style={[s.th, s.colOutflow]}>Cash Out</Text>
                    <Text style={[s.th, s.colNet]}>Net Movement</Text>
                    <Text style={[s.th, s.colTxns]}>Txns</Text>
                </View>
                {monthlyBreakdown.map((row, i) => (
                    <View key={i} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}>
                        <Text style={[s.td, s.colMonth]}>{row.month}</Text>
                        <Text style={[s.td, s.colInflow]}>{formatCurrency(row.totalInflow)}</Text>
                        <Text style={[s.td, s.colOutflow]}>{formatCurrency(row.totalOutflow)}</Text>
                        <Text style={[s.td, s.colNet]}>{formatCurrency(row.netMovement)}</Text>
                        <Text style={[s.td, s.colTxns]}>{row.inflowCount + row.outflowCount}</Text>
                    </View>
                ))}
                <View style={s.totalRow}>
                    <Text style={[s.totalLabel, s.colMonth]}>TOTAL</Text>
                    <Text style={[s.totalValue, s.colInflow]}>{formatCurrency(summary.totalCashIn)}</Text>
                    <Text style={[s.totalValue, s.colOutflow]}>{formatCurrency(summary.totalCashOut)}</Text>
                    <Text style={[s.totalValue, s.colNet]}>{formatCurrency(summary.netCashMovement)}</Text>
                    <Text style={[s.totalValue, s.colTxns]}>{summary.totalTransactions}</Text>
                </View>
                <DocumentFooter companyDetails={companyDetails} />
            </Page>
        </Document>
    );
};
