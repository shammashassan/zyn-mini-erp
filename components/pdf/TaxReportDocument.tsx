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
    netLiabilityBox: { flex: 1, backgroundColor: pdfColors.secondary, borderLeftWidth: 3, borderLeftColor: '#c62828', padding: spacing.sm },
    netLiabilityValue: { ...typography.emphasis, color: '#c62828' },
    tableHeader: { flexDirection: 'row', backgroundColor: pdfColors.secondary, paddingVertical: spacing.sm, paddingHorizontal: spacing.sm },
    tableRow: { flexDirection: 'row', paddingVertical: 5, paddingHorizontal: spacing.sm, borderBottomWidth: 0.5, borderBottomColor: pdfColors.border },
    tableRowAlt: { backgroundColor: '#fafafa' },
    th: { ...typography.label, color: pdfColors.primary },
    td: { ...typography.bodySmall, color: pdfColors.textDark },
    colPeriod: { width: '20%' },
    colSalesTax: { width: '20%', textAlign: 'right' },
    colPurchaseTax: { width: '20%', textAlign: 'right' },
    colNet: { width: '20%', textAlign: 'right' },
    colTransactions: { width: '20%', textAlign: 'right' },
    totalRow: { flexDirection: 'row', paddingVertical: spacing.sm, paddingHorizontal: spacing.sm, borderTopWidth: 2, borderTopColor: pdfColors.primary, backgroundColor: pdfColors.secondary },
    totalLabel: { ...typography.emphasis, color: pdfColors.primary },
    totalValue: { ...typography.emphasis, color: pdfColors.primary },
});

// Matches actual API MonthlyBreakdown interface
interface TaxReportData {
    period: string;
    salesTax: number;
    purchaseTax: number;
    netTaxLiability: number;  // was wrongly 'netTax' before
    salesTransactions: number;
    purchaseTransactions: number;
}

interface TaxReportDocumentProps {
    monthlyBreakdown: TaxReportData[];
    summary: {
        totalSalesTax: number;
        totalPurchaseTax: number;
        netTaxLiability: number;
        salesTransactions: number;
        purchaseTransactions: number;
    };
    dateRange: { from: Date; to: Date };
    companyDetails: ICompanyDetails | null;
}

export const TaxReportDocument: React.FC<TaxReportDocumentProps> = ({ monthlyBreakdown, summary, dateRange, companyDetails }) => {
    registerPdfFonts();
    const dateStr = `${format(dateRange.from, 'dd MMM yyyy')} – ${format(dateRange.to, 'dd MMM yyyy')}`;
    return (
        <Document>
            <Page size="A4" style={commonStyles.page}>
                <DocumentHeader companyDetails={companyDetails} />
                <DocumentTitle title="Tax Report" />
                <View style={s.metaRow}><Text style={s.metaText}>{dateStr}</Text></View>
                <View style={s.summaryGrid}>
                    <View style={s.summaryBox}><Text style={s.summaryLabel}>Sales Tax Collected</Text><Text style={s.summaryValue}>{formatCurrency(summary.totalSalesTax)}</Text></View>
                    <View style={s.summaryBox}><Text style={s.summaryLabel}>Purchase Tax Paid</Text><Text style={s.summaryValue}>{formatCurrency(summary.totalPurchaseTax)}</Text></View>
                    <View style={s.netLiabilityBox}><Text style={s.summaryLabel}>Net Tax Liability</Text><Text style={s.netLiabilityValue}>{formatCurrency(Math.abs(summary.netTaxLiability))}</Text></View>
                </View>
                <View style={s.tableHeader}>
                    <Text style={[s.th, s.colPeriod]}>Period</Text>
                    <Text style={[s.th, s.colSalesTax]}>Sales Tax</Text>
                    <Text style={[s.th, s.colPurchaseTax]}>Purchase Tax</Text>
                    <Text style={[s.th, s.colNet]}>Net Tax</Text>
                    <Text style={[s.th, s.colTransactions]}>Txns</Text>
                </View>
                {monthlyBreakdown.map((row, i) => (
                    <View key={i} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}>
                        <Text style={[s.td, s.colPeriod]}>{row.period}</Text>
                        <Text style={[s.td, s.colSalesTax]}>{formatCurrency(row.salesTax)}</Text>
                        <Text style={[s.td, s.colPurchaseTax]}>{formatCurrency(row.purchaseTax)}</Text>
                        <Text style={[s.td, s.colNet]}>{formatCurrency(row.netTaxLiability)}</Text>
                        <Text style={[s.td, s.colTransactions]}>{row.salesTransactions + row.purchaseTransactions}</Text>
                    </View>
                ))}
                <View style={s.totalRow}>
                    <Text style={[s.totalLabel, s.colPeriod]}>TOTAL</Text>
                    <Text style={[s.totalValue, s.colSalesTax]}>{formatCurrency(summary.totalSalesTax)}</Text>
                    <Text style={[s.totalValue, s.colPurchaseTax]}>{formatCurrency(summary.totalPurchaseTax)}</Text>
                    <Text style={[s.totalValue, s.colNet]}>{formatCurrency(Math.abs(summary.netTaxLiability))}</Text>
                    <Text style={[s.totalValue, s.colTransactions]}>{summary.salesTransactions + summary.purchaseTransactions}</Text>
                </View>
                <DocumentFooter companyDetails={companyDetails} />
            </Page>
        </Document>
    );
};
