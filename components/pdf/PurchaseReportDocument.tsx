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
    colCount: { width: '15%', textAlign: 'right' },
    colAmount: { width: '22%', textAlign: 'right' },
    colTax: { width: '20%', textAlign: 'right' },
    colNet: { width: '23%', textAlign: 'right' },
    totalRow: { flexDirection: 'row', paddingVertical: spacing.sm, paddingHorizontal: spacing.sm, borderTopWidth: 2, borderTopColor: pdfColors.primary, backgroundColor: pdfColors.secondary },
    totalLabel: { ...typography.emphasis, color: pdfColors.primary },
    totalValue: { ...typography.emphasis, color: pdfColors.primary },
});

interface MonthlyBreakdown { month: string; purchaseCount: number; amount: number; tax: number; netTotal: number; }
interface PurchaseReportDocumentProps {
    monthlyBreakdown: MonthlyBreakdown[];
    summary: { totalAmount: number; totalTax: number; totalNetTotal: number; totalPurchases: number; avgPurchaseValue: number };
    dateRange: { from: Date; to: Date };
    companyDetails: ICompanyDetails | null;
}

export const PurchaseReportDocument: React.FC<PurchaseReportDocumentProps> = ({ monthlyBreakdown, summary, dateRange, companyDetails }) => {
    registerPdfFonts();
    const dateStr = `${format(dateRange.from, 'dd MMM yyyy')} – ${format(dateRange.to, 'dd MMM yyyy')}`;
    return (
        <Document>
            <Page size="A4" style={commonStyles.page}>
                <DocumentHeader companyDetails={companyDetails} />
                <DocumentTitle title="Purchase Report" />
                <View style={s.metaRow}><Text style={s.metaText}>{dateStr}</Text></View>
                <View style={s.summaryGrid}>
                    <View style={s.summaryBox}><Text style={s.summaryLabel}>Total Purchases</Text><Text style={s.summaryValue}>{formatCurrency(summary.totalAmount)}</Text></View>
                    <View style={s.summaryBox}><Text style={s.summaryLabel}>Total Tax</Text><Text style={s.summaryValue}>{formatCurrency(summary.totalTax)}</Text></View>
                    <View style={s.summaryBox}><Text style={s.summaryLabel}>Total Orders</Text><Text style={s.summaryValue}>{summary.totalPurchases}</Text></View>
                    <View style={s.summaryBox}><Text style={s.summaryLabel}>Avg Order Value</Text><Text style={s.summaryValue}>{formatCurrency(summary.avgPurchaseValue)}</Text></View>
                </View>
                <View style={s.tableHeader}>
                    <Text style={[s.th, s.colMonth]}>Month</Text>
                    <Text style={[s.th, s.colCount]}>Orders</Text>
                    <Text style={[s.th, s.colAmount]}>Amount</Text>
                    <Text style={[s.th, s.colTax]}>Tax</Text>
                    <Text style={[s.th, s.colNet]}>Net Total</Text>
                </View>
                {monthlyBreakdown.map((row, i) => (
                    <View key={i} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}>
                        <Text style={[s.td, s.colMonth]}>{row.month}</Text>
                        <Text style={[s.td, s.colCount]}>{row.purchaseCount}</Text>
                        <Text style={[s.td, s.colAmount]}>{formatCurrency(row.amount)}</Text>
                        <Text style={[s.td, s.colTax]}>{formatCurrency(row.tax)}</Text>
                        <Text style={[s.td, s.colNet]}>{formatCurrency(row.netTotal)}</Text>
                    </View>
                ))}
                <View style={s.totalRow}>
                    <Text style={[s.totalLabel, s.colMonth]}>TOTAL</Text>
                    <Text style={[s.totalValue, s.colCount]}>{summary.totalPurchases}</Text>
                    <Text style={[s.totalValue, s.colAmount]}>{formatCurrency(summary.totalAmount)}</Text>
                    <Text style={[s.totalValue, s.colTax]}>{formatCurrency(summary.totalTax)}</Text>
                    <Text style={[s.totalValue, s.colNet]}>{formatCurrency(summary.totalNetTotal)}</Text>
                </View>
                <DocumentFooter companyDetails={companyDetails} />
            </Page>
        </Document>
    );
};
