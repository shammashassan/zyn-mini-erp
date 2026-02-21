import React from 'react';
import { Page, Text, Document, View, StyleSheet } from '@react-pdf/renderer';
import { format } from 'date-fns';
import { formatCurrency } from '@/utils/formatters/currency';
import { commonStyles, pdfColors, typography, spacing, registerPdfFonts } from '@/components/pdf/shared/styles';
import { DocumentHeader } from '@/components/pdf/shared/DocumentHeader';
import { DocumentFooter } from '@/components/pdf/shared/DocumentFooter';
import { DocumentTitle } from '@/components/pdf/shared/DocumentTitle';
import { ItemsTable, TableColumn } from '@/components/pdf/shared/ItemsTable';
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
    totalsRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: spacing.xs,
    },
    totalsBox: {
        width: '60%',
        backgroundColor: pdfColors.secondary,
        borderTopWidth: 1.5,
        borderTopColor: pdfColors.primary,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    totalLabel: {
        ...typography.emphasis,
        color: pdfColors.primary,
    },
    totalValue: {
        ...typography.emphasis,
        color: pdfColors.primary,
    },
    balancedBadge: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: spacing.xs,
    },
    badgeText: {
        ...typography.bodySmall,
        color: '#2e7d32',
        fontWeight: 'bold',
    },
    badgeTextUnbalanced: {
        ...typography.bodySmall,
        color: '#c62828',
        fontWeight: 'bold',
    },
});

export interface TrialBalanceItem {
    accountCode: string;
    accountName: string;
    groupName: string;
    totalDebit: number;
    totalCredit: number;
    balance: number;
}

export interface TrialBalanceSummary {
    totalDebits: number;
    totalCredits: number;
    difference: number;
}

interface TrialBalanceDocumentProps {
    data: TrialBalanceItem[];
    summary: TrialBalanceSummary | null;
    asOfDate: Date;
    companyDetails: ICompanyDetails | null;
}

const columns: TableColumn[] = [
    { header: 'Code', field: 'accountCode', width: '12%', align: 'left' },
    { header: 'Account Name', field: 'accountName', width: '38%', align: 'left' },
    { header: 'Group', field: 'groupName', width: '20%', align: 'left' },
    { header: 'Debit', field: 'totalDebit', width: '15%', align: 'right', format: formatCurrency },
    { header: 'Credit', field: 'totalCredit', width: '15%', align: 'right', format: formatCurrency },
];

export const TrialBalanceDocument: React.FC<TrialBalanceDocumentProps> = ({
    data,
    summary,
    asOfDate,
    companyDetails,
}) => {
    registerPdfFonts();
    const isBalanced = summary ? Math.abs(summary.difference) < 0.01 : true;

    return (
        <Document>
            <Page size="A4" style={commonStyles.page}>
                <DocumentHeader companyDetails={companyDetails} />

                <DocumentTitle title="Trial Balance" />

                <View style={s.metaRow}>
                    <Text style={s.metaText}>As of {format(asOfDate, 'dd MMMM yyyy')}</Text>
                </View>

                <ItemsTable columns={columns} items={data} zebraStripe />

                {/* Totals */}
                {summary && (
                    <>
                        <View style={s.totalsRow}>
                            <View style={s.totalsBox}>
                                <Text style={s.totalLabel}>Total Debits</Text>
                                <Text style={s.totalValue}>{formatCurrency(summary.totalDebits)}</Text>
                            </View>
                        </View>
                        <View style={s.totalsRow}>
                            <View style={[s.totalsBox, { backgroundColor: '#fff' }]}>
                                <Text style={s.totalLabel}>Total Credits</Text>
                                <Text style={s.totalValue}>{formatCurrency(summary.totalCredits)}</Text>
                            </View>
                        </View>
                        {Math.abs(summary.difference) > 0.01 && (
                            <View style={s.totalsRow}>
                                <View style={[s.totalsBox, { backgroundColor: '#ffebee' }]}>
                                    <Text style={[s.totalLabel, { color: '#c62828' }]}>Difference</Text>
                                    <Text style={[s.totalValue, { color: '#c62828' }]}>{formatCurrency(summary.difference)}</Text>
                                </View>
                            </View>
                        )}
                        <View style={s.balancedBadge}>
                            <Text style={isBalanced ? s.badgeText : s.badgeTextUnbalanced}>
                                {isBalanced ? '✓ Trial Balance is balanced' : '⚠ Trial Balance is NOT balanced'}
                            </Text>
                        </View>
                    </>
                )}

                <DocumentFooter companyDetails={companyDetails} />
            </Page>
        </Document>
    );
};