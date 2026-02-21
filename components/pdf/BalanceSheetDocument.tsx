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
    metaText: { ...typography.body, color: pdfColors.textMuted },
    // Main section header (ASSETS / LIABILITIES & EQUITY)
    mainSectionHeader: {
        backgroundColor: pdfColors.primary,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        marginBottom: spacing.sm,
    },
    mainSectionHeaderText: {
        ...typography.sectionTitle,
        color: pdfColors.white,
        letterSpacing: 1,
    },
    // Sub-section (Current Assets, Fixed Assets, etc.)
    subSectionHeader: {
        backgroundColor: pdfColors.secondary,
        paddingVertical: 5,
        paddingHorizontal: spacing.md,
        borderLeftWidth: 3,
        borderLeftColor: pdfColors.primary,
        marginBottom: 2,
        marginTop: spacing.sm,
    },
    subSectionHeaderText: {
        ...typography.label,
        color: pdfColors.primary,
    },
    // KV row for account entries
    kvRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 4,
        paddingHorizontal: spacing.md,
        borderBottomWidth: 0.5,
        borderBottomColor: pdfColors.border,
    },
    kvRowAlt: { backgroundColor: '#fafafa' },
    kvLabel: { ...typography.body, color: pdfColors.textDark, flex: 1 },
    kvValue: { ...typography.body, color: pdfColors.textDark, textAlign: 'right' },
    // Sub-total row
    subTotalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        marginTop: 2,
        borderTopWidth: 0.5,
        borderTopColor: pdfColors.border,
    },
    subTotalLabel: { ...typography.emphasis, color: pdfColors.textDark },
    subTotalValue: { ...typography.emphasis, color: pdfColors.primary },
    // Grand total (double underline style)
    grandTotalWrapper: {
        marginTop: spacing.sm,
        borderTopWidth: 2,
        borderTopColor: pdfColors.primary,
    },
    grandTotalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.md,
        backgroundColor: pdfColors.secondary,
    },
    grandTotalLabel: { ...typography.grandTotal, color: pdfColors.primary },
    grandTotalValue: { ...typography.grandTotal, color: pdfColors.primary },
    // Balance indicator
    balanceBadge: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: spacing.xs,
    },
    badgeText: { ...typography.bodySmall, color: '#2e7d32', fontWeight: 'bold' },
    badgeTextUnbalanced: { ...typography.bodySmall, color: '#c62828', fontWeight: 'bold' },
});

// Helper: render a Record<string, number> as KV rows
const KVSection: React.FC<{
    title: string;
    data: Record<string, number>;
    totalLabel: string;
    totalValue: number;
}> = ({ title, data, totalLabel, totalValue }) => {
    const entries = Object.entries(data);
    return (
        <View>
            <View style={s.subSectionHeader}>
                <Text style={s.subSectionHeaderText}>{title}</Text>
            </View>
            {entries.map(([key, value], i) => (
                <View key={i} style={[s.kvRow, i % 2 === 1 ? s.kvRowAlt : {}]}>
                    <Text style={s.kvLabel}>{key}</Text>
                    <Text style={s.kvValue}>{formatCurrency(value)}</Text>
                </View>
            ))}
            <View style={s.subTotalRow}>
                <Text style={s.subTotalLabel}>{totalLabel}</Text>
                <Text style={s.subTotalValue}>{formatCurrency(totalValue)}</Text>
            </View>
        </View>
    );
};

export interface BalanceSheetData {
    assets: {
        currentAssets: Record<string, number>;
        fixedAssets: Record<string, number>;
    };
    liabilities: {
        currentLiabilities: Record<string, number>;
        longTermLiabilities: Record<string, number>;
    };
    equity: Record<string, number>;
    totals: {
        totalCurrentAssets: number;
        totalFixedAssets: number;
        totalAssets: number;
        totalCurrentLiabilities: number;
        totalLongTermLiabilities: number;
        totalLiabilities: number;
        totalEquity: number;
        totalLiabilitiesEquity: number;
        isBalanced?: boolean;
    };
}

interface BalanceSheetDocumentProps {
    data: BalanceSheetData;
    asOfDate: Date;
    companyDetails: ICompanyDetails | null;
}

export const BalanceSheetDocument: React.FC<BalanceSheetDocumentProps> = ({
    data,
    asOfDate,
    companyDetails,
}) => {
    registerPdfFonts();
    const isBalanced = data.totals.isBalanced ?? Math.abs(data.totals.totalAssets - data.totals.totalLiabilitiesEquity) < 0.01;

    return (
        <Document>
            {/* ── Page 1: Assets ─────────────────────────────────────────────── */}
            <Page size="A4" style={commonStyles.page}>
                <DocumentHeader companyDetails={companyDetails} />
                <DocumentTitle title="Balance Sheet" />

                <View style={s.metaRow}>
                    <Text style={s.metaText}>As of {format(asOfDate, 'dd MMMM yyyy')}</Text>
                </View>

                <View style={s.mainSectionHeader}>
                    <Text style={s.mainSectionHeaderText}>ASSETS</Text>
                </View>

                <KVSection
                    title="Current Assets"
                    data={data.assets.currentAssets}
                    totalLabel="Total Current Assets"
                    totalValue={data.totals.totalCurrentAssets}
                />

                <KVSection
                    title="Fixed Assets"
                    data={data.assets.fixedAssets}
                    totalLabel="Total Fixed Assets"
                    totalValue={data.totals.totalFixedAssets}
                />

                <View style={s.grandTotalWrapper}>
                    <View style={s.grandTotalRow}>
                        <Text style={s.grandTotalLabel}>TOTAL ASSETS</Text>
                        <Text style={s.grandTotalValue}>{formatCurrency(data.totals.totalAssets)}</Text>
                    </View>
                </View>

                <DocumentFooter companyDetails={companyDetails} />
            </Page>

            {/* ── Page 2: Liabilities & Equity ────────────────────────────────── */}
            <Page size="A4" style={commonStyles.page}>
                <DocumentHeader companyDetails={companyDetails} />
                <DocumentTitle title="Balance Sheet (continued)" />

                <View style={s.metaRow}>
                    <Text style={s.metaText}>As of {format(asOfDate, 'dd MMMM yyyy')}</Text>
                </View>

                <View style={s.mainSectionHeader}>
                    <Text style={s.mainSectionHeaderText}>LIABILITIES & EQUITY</Text>
                </View>

                {/* Merge current + long-term liabilities into one section */}
                <KVSection
                    title="Current Liabilities"
                    data={data.liabilities.currentLiabilities}
                    totalLabel="Total Current Liabilities"
                    totalValue={data.totals.totalCurrentLiabilities}
                />
                <KVSection
                    title="Long-Term Liabilities"
                    data={data.liabilities.longTermLiabilities}
                    totalLabel="Total Long-Term Liabilities"
                    totalValue={data.totals.totalLongTermLiabilities}
                />

                <View style={s.subTotalRow}>
                    <Text style={s.subTotalLabel}>Total Liabilities</Text>
                    <Text style={[s.subTotalValue, { color: '#c62828' }]}>{formatCurrency(data.totals.totalLiabilities)}</Text>
                </View>

                <KVSection
                    title="Equity"
                    data={data.equity}
                    totalLabel="Total Equity"
                    totalValue={data.totals.totalEquity}
                />

                <View style={s.grandTotalWrapper}>
                    <View style={s.grandTotalRow}>
                        <Text style={s.grandTotalLabel}>TOTAL LIABILITIES & EQUITY</Text>
                        <Text style={s.grandTotalValue}>{formatCurrency(data.totals.totalLiabilitiesEquity)}</Text>
                    </View>
                </View>

                <View style={s.balanceBadge}>
                    <Text style={isBalanced ? s.badgeText : s.badgeTextUnbalanced}>
                        {isBalanced ? '✓ Balance Sheet is balanced' : '⚠ Balance Sheet is NOT balanced'}
                    </Text>
                </View>

                <DocumentFooter companyDetails={companyDetails} />
            </Page>
        </Document>
    );
};