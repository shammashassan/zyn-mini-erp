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
    sectionTitle: { ...typography.sectionTitle, color: pdfColors.primary, marginTop: spacing.md, marginBottom: spacing.xs },
    tableHeader: { flexDirection: 'row', backgroundColor: pdfColors.secondary, paddingVertical: spacing.sm, paddingHorizontal: spacing.sm },
    tableRow: { flexDirection: 'row', paddingVertical: 5, paddingHorizontal: spacing.sm, borderBottomWidth: 0.5, borderBottomColor: pdfColors.border },
    tableRowAlt: { backgroundColor: '#fafafa' },
    th: { ...typography.label, color: pdfColors.primary },
    td: { ...typography.bodySmall, color: pdfColors.textDark },
    colPeriod: { width: '22%' },
    colCategory: { width: '30%' },
    colCount: { width: '16%', textAlign: 'right' },
    colAmount: { width: '17%', textAlign: 'right' },
    colAvg: { width: '15%', textAlign: 'right' },
    totalRow: { flexDirection: 'row', paddingVertical: spacing.sm, paddingHorizontal: spacing.sm, borderTopWidth: 2, borderTopColor: pdfColors.primary, backgroundColor: pdfColors.secondary },
    totalLabel: { ...typography.emphasis, color: pdfColors.primary },
    totalValue: { ...typography.emphasis, color: pdfColors.primary },
});

// Matches actual API MonthlyBreakdown interface
interface MonthlyBreakdown {
    period: string;
    totalAmount: number;
    totalExpenses: number;
    topCategory: string;
    topCategoryAmount: number;
    averageExpense: number;
    highestExpense: number;
    trendVsLastMonth?: number;
}

interface ExpenseReportDocumentProps {
    monthlyBreakdown: MonthlyBreakdown[];
    summary: { totalAmount: number; totalCount: number; averageExpense: number };
    dateRange: { from: Date; to: Date };
    companyDetails: ICompanyDetails | null;
}

export const ExpenseReportDocument: React.FC<ExpenseReportDocumentProps> = ({ monthlyBreakdown, summary, dateRange, companyDetails }) => {
    registerPdfFonts();
    const dateStr = `${format(dateRange.from, 'dd MMM yyyy')} – ${format(dateRange.to, 'dd MMM yyyy')}`;
    return (
        <Document>
            <Page size="A4" style={commonStyles.page}>
                <DocumentHeader companyDetails={companyDetails} />
                <DocumentTitle title="Expense Report" />
                <View style={s.metaRow}><Text style={s.metaText}>{dateStr}</Text></View>
                <View style={s.summaryGrid}>
                    <View style={s.summaryBox}><Text style={s.summaryLabel}>Total Expenses</Text><Text style={s.summaryValue}>{formatCurrency(summary.totalAmount)}</Text></View>
                    <View style={s.summaryBox}><Text style={s.summaryLabel}>Transactions</Text><Text style={s.summaryValue}>{summary.totalCount}</Text></View>
                    <View style={s.summaryBox}><Text style={s.summaryLabel}>Avg per Expense</Text><Text style={s.summaryValue}>{formatCurrency(summary.averageExpense)}</Text></View>
                </View>
                <View style={s.tableHeader}>
                    <Text style={[s.th, s.colPeriod]}>Period</Text>
                    <Text style={[s.th, s.colCategory]}>Top Category</Text>
                    <Text style={[s.th, s.colCount]}>No. of Exp.</Text>
                    <Text style={[s.th, s.colAmount]}>Total Amt</Text>
                    <Text style={[s.th, s.colAvg]}>Avg/Exp</Text>
                </View>
                {monthlyBreakdown.map((row, i) => (
                    <View key={i} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}>
                        <Text style={[s.td, s.colPeriod]}>{row.period}</Text>
                        <Text style={[s.td, s.colCategory]}>{row.topCategory || '—'}</Text>
                        <Text style={[s.td, s.colCount]}>{row.totalExpenses}</Text>
                        <Text style={[s.td, s.colAmount]}>{formatCurrency(row.totalAmount)}</Text>
                        <Text style={[s.td, s.colAvg]}>{formatCurrency(row.averageExpense)}</Text>
                    </View>
                ))}
                <View style={s.totalRow}>
                    <Text style={[s.totalLabel, { width: '52%' }]}>TOTAL</Text>
                    <Text style={[s.totalValue, s.colCount]}>{summary.totalCount}</Text>
                    <Text style={[s.totalValue, s.colAmount]}>{formatCurrency(summary.totalAmount)}</Text>
                    <Text style={[s.totalValue, s.colAvg]}>{formatCurrency(summary.averageExpense)}</Text>
                </View>
                <DocumentFooter companyDetails={companyDetails} />
            </Page>
        </Document>
    );
};
