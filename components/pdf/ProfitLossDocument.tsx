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
    metaRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: spacing.md,
    },
    metaText: {
        ...typography.body,
        color: pdfColors.textMuted,
    },
    // Section
    sectionWrapper: {
        marginBottom: spacing.md,
    },
    sectionHeaderBar: {
        backgroundColor: pdfColors.secondary,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderLeftWidth: 3,
        borderLeftColor: pdfColors.primary,
        marginBottom: 2,
    },
    sectionHeaderText: {
        ...typography.sectionTitle,
        color: pdfColors.primary,
    },
    // Table inside section
    tableHeader: {
        flexDirection: 'row',
        paddingVertical: 5,
        paddingHorizontal: spacing.md,
        borderBottomWidth: 0.5,
        borderBottomColor: pdfColors.border,
    },
    tableRow: {
        flexDirection: 'row',
        paddingVertical: 5,
        paddingHorizontal: spacing.md,
        borderBottomWidth: 0.5,
        borderBottomColor: pdfColors.border,
    },
    tableRowAlt: { backgroundColor: '#fafafa' },
    th: { ...typography.label, color: pdfColors.textMuted },
    td: { ...typography.body, color: pdfColors.textDark },
    colAccount: { width: '55%' },
    colSubgroup: { width: '25%' },
    colAmount: { width: '20%', textAlign: 'right' },
    // Section footer
    sectionTotal: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        marginTop: 2,
        borderTopWidth: 0.5,
        borderTopColor: pdfColors.border,
    },
    sectionTotalLabel: { ...typography.emphasis, color: pdfColors.textDark },
    sectionTotalIncome: { ...typography.emphasis, color: '#2e7d32' },
    sectionTotalExpense: { ...typography.emphasis, color: '#c62828' },
    // Net profit
    netProfitWrapper: {
        marginTop: spacing.md,
        borderTopWidth: 2,
        borderTopColor: pdfColors.primary,
    },
    netProfitRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.md,
        backgroundColor: pdfColors.secondary,
    },
    netProfitLabel: {
        ...typography.grandTotal,
        color: pdfColors.primary,
    },
    netProfitPositive: {
        ...typography.grandTotal,
        color: '#2e7d32',
    },
    netProfitNegative: {
        ...typography.grandTotal,
        color: '#c62828',
    },
});

export interface AccountData {
    accountName: string;
    subGroup: string;
    amount: number;
}

interface ProfitLossDocumentProps {
    income: AccountData[];
    expenses: AccountData[];
    totals: { income: number; expenses: number; netProfit: number };
    dateRange: { from: Date; to: Date };
    companyDetails: ICompanyDetails | null;
}

const AccountSection: React.FC<{
    title: string;
    items: AccountData[];
    sectionTotal: number;
    totalStyle: any;
}> = ({ title, items, sectionTotal, totalStyle }) => (
    <View style={s.sectionWrapper}>
        <View style={s.sectionHeaderBar}>
            <Text style={s.sectionHeaderText}>{title}</Text>
        </View>
        {/* Table header */}
        <View style={s.tableHeader}>
            <Text style={[s.th, s.colAccount]}>Account Name</Text>
            <Text style={[s.th, s.colSubgroup]}>Subgroup</Text>
            <Text style={[s.th, s.colAmount]}>Amount</Text>
        </View>
        {/* Rows */}
        {items.map((item, i) => (
            <View key={i} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}>
                <Text style={[s.td, s.colAccount]}>{item.accountName}</Text>
                <Text style={[s.td, s.colSubgroup]}>{item.subGroup}</Text>
                <Text style={[s.td, s.colAmount]}>{formatCurrency(item.amount)}</Text>
            </View>
        ))}
        {/* Total */}
        <View style={s.sectionTotal}>
            <Text style={s.sectionTotalLabel}>Total {title}</Text>
            <Text style={totalStyle}>{formatCurrency(sectionTotal)}</Text>
        </View>
    </View>
);

export const ProfitLossDocument: React.FC<ProfitLossDocumentProps> = ({
    income,
    expenses,
    totals,
    dateRange,
    companyDetails,
}) => {
    registerPdfFonts();
    const dateStr = `${format(dateRange.from, 'dd MMM yyyy')} – ${format(dateRange.to, 'dd MMM yyyy')}`;
    const isProfit = totals.netProfit >= 0;

    return (
        <Document>
            <Page size="A4" style={commonStyles.page}>
                <DocumentHeader companyDetails={companyDetails} />

                <DocumentTitle title="Profit & Loss Statement" />

                <View style={s.metaRow}>
                    <Text style={s.metaText}>{dateStr}</Text>
                </View>

                <AccountSection
                    title="Revenue / Income"
                    items={income}
                    sectionTotal={totals.income}
                    totalStyle={s.sectionTotalIncome}
                />

                <AccountSection
                    title="Expenses"
                    items={expenses}
                    sectionTotal={totals.expenses}
                    totalStyle={s.sectionTotalExpense}
                />

                {/* Net Profit */}
                <View style={s.netProfitWrapper}>
                    <View style={s.netProfitRow}>
                        <Text style={s.netProfitLabel}>
                            {isProfit ? 'NET PROFIT' : 'NET LOSS'}
                        </Text>
                        <Text style={isProfit ? s.netProfitPositive : s.netProfitNegative}>
                            {formatCurrency(Math.abs(totals.netProfit))}
                        </Text>
                    </View>
                </View>

                <DocumentFooter companyDetails={companyDetails} />
            </Page>
        </Document>
    );
};