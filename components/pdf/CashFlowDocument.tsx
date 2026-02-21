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
    // Activity section header
    sectionHeader: {
        backgroundColor: pdfColors.secondary,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderLeftWidth: 3,
        borderLeftColor: pdfColors.primary,
        marginBottom: 2,
        marginTop: spacing.sm,
    },
    sectionHeaderText: {
        ...typography.sectionTitle,
        color: pdfColors.primary,
    },
    // KV rows
    kvRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 5,
        paddingHorizontal: spacing.md,
        borderBottomWidth: 0.5,
        borderBottomColor: pdfColors.border,
    },
    kvRowAlt: { backgroundColor: '#fafafa' },
    kvLabel: { ...typography.body, color: pdfColors.textDark, flex: 1 },
    kvValue: { ...typography.body, color: pdfColors.textDark, textAlign: 'right' },
    // Subtotal
    subtotalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        marginTop: 2,
        borderTopWidth: 0.5,
        borderTopColor: pdfColors.border,
    },
    subtotalLabel: { ...typography.emphasis, color: pdfColors.textDark },
    subtotalPositive: { ...typography.emphasis, color: '#2e7d32' },
    subtotalNegative: { ...typography.emphasis, color: '#c62828' },
    // Net change grand total
    netWrapper: {
        marginTop: spacing.md,
        borderTopWidth: 2,
        borderTopColor: pdfColors.primary,
    },
    netRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.md,
        backgroundColor: pdfColors.secondary,
    },
    netLabel: { ...typography.grandTotal, color: pdfColors.primary },
    netPositive: { ...typography.grandTotal, color: '#2e7d32' },
    netNegative: { ...typography.grandTotal, color: '#c62828' },
});

export interface CashFlowData {
    operating: Record<string, number>;
    investing: Record<string, number>;
    financing: Record<string, number>;
    totals: {
        operatingCash: number;
        investingCash: number;
        financingCash: number;
        netCashChange: number;
    };
}

interface CashFlowDocumentProps {
    data: CashFlowData;
    dateRange: { from: Date; to: Date };
    companyDetails: ICompanyDetails | null;
}

const ActivitySection: React.FC<{
    title: string;
    items: Record<string, number>;
    subtotal: number;
}> = ({ title, items, subtotal }) => {
    const entries = Object.entries(items);
    const isPositive = subtotal >= 0;
    return (
        <View>
            <View style={s.sectionHeader}>
                <Text style={s.sectionHeaderText}>{title}</Text>
            </View>
            {entries.map(([key, value], i) => (
                <View key={i} style={[s.kvRow, i % 2 === 1 ? s.kvRowAlt : {}]}>
                    <Text style={s.kvLabel}>{key}</Text>
                    <Text style={s.kvValue}>{formatCurrency(value)}</Text>
                </View>
            ))}
            {entries.length === 0 && (
                <View style={s.kvRow}>
                    <Text style={[s.kvLabel, { color: pdfColors.textMuted, fontStyle: 'italic' }]}>No transactions</Text>
                    <Text style={s.kvValue}>{formatCurrency(0)}</Text>
                </View>
            )}
            <View style={s.subtotalRow}>
                <Text style={s.subtotalLabel}>Net {title}</Text>
                <Text style={isPositive ? s.subtotalPositive : s.subtotalNegative}>
                    {formatCurrency(subtotal)}
                </Text>
            </View>
        </View>
    );
};

export const CashFlowDocument: React.FC<CashFlowDocumentProps> = ({
    data,
    dateRange,
    companyDetails,
}) => {
    registerPdfFonts();
    const dateStr = `${format(dateRange.from, 'dd MMM yyyy')} – ${format(dateRange.to, 'dd MMM yyyy')}`;
    const isIncrease = data.totals.netCashChange >= 0;

    return (
        <Document>
            <Page size="A4" style={commonStyles.page}>
                <DocumentHeader companyDetails={companyDetails} />

                <DocumentTitle title="Cash Flow Statement" />

                <View style={s.metaRow}>
                    <Text style={s.metaText}>{dateStr}</Text>
                </View>

                <ActivitySection
                    title="Operating Activities"
                    items={data.operating}
                    subtotal={data.totals.operatingCash}
                />

                <ActivitySection
                    title="Investing Activities"
                    items={data.investing}
                    subtotal={data.totals.investingCash}
                />

                <ActivitySection
                    title="Financing Activities"
                    items={data.financing}
                    subtotal={data.totals.financingCash}
                />

                {/* Net Change in Cash */}
                <View style={s.netWrapper}>
                    <View style={s.netRow}>
                        <Text style={s.netLabel}>NET INCREASE / DECREASE IN CASH</Text>
                        <Text style={isIncrease ? s.netPositive : s.netNegative}>
                            {formatCurrency(data.totals.netCashChange)}
                        </Text>
                    </View>
                </View>

                <DocumentFooter companyDetails={companyDetails} />
            </Page>
        </Document>
    );
};