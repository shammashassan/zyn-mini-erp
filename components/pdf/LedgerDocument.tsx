import React from 'react';
import { Page, Text, Document, View, StyleSheet } from '@react-pdf/renderer';
import { format } from 'date-fns';
import { formatCurrency } from '@/utils/formatters/currency';
import { commonStyles, pdfColors, typography, spacing, registerPdfFonts } from '@/components/pdf/shared/styles';
import { DocumentHeader } from '@/components/pdf/shared/DocumentHeader';
import { DocumentFooter } from '@/components/pdf/shared/DocumentFooter';
import { DocumentTitle } from '@/components/pdf/shared/DocumentTitle';
import type { ICompanyDetails } from '@/models/CompanyDetails';

// ─── Local styles (report-specific, extends shared system) ───────────────────
const s = StyleSheet.create({
    infoBox: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        backgroundColor: pdfColors.secondary,
        borderWidth: 0.5,
        borderColor: pdfColors.border,
        borderRadius: 2,
        padding: spacing.md,
        marginBottom: spacing.md,
    },
    infoLeft: { flex: 1 },
    infoRight: { alignItems: 'flex-end' },
    infoLabel: {
        ...typography.label,
        color: pdfColors.textMuted,
        marginBottom: 2,
    },
    infoValue: {
        ...typography.body,
        color: pdfColors.textDark,
        fontWeight: 'bold',
    },
    infoSubValue: {
        ...typography.bodySmall,
        color: pdfColors.textMuted,
        marginTop: 2,
    },
    balanceLabel: {
        ...typography.label,
        color: pdfColors.textMuted,
        marginBottom: 2,
    },
    balanceValue: {
        ...typography.emphasis,
        color: pdfColors.primary,
    },
    // Table
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: pdfColors.secondary,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.sm,
    },
    tableRow: {
        flexDirection: 'row',
        paddingVertical: 5,
        paddingHorizontal: spacing.sm,
        borderBottomWidth: 0.5,
        borderBottomColor: pdfColors.border,
    },
    tableRowAlt: { backgroundColor: '#fafafa' },
    tableFooter: {
        flexDirection: 'row',
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.sm,
        backgroundColor: pdfColors.secondary,
        borderTopWidth: 1,
        borderTopColor: pdfColors.primary,
    },
    th: {
        ...typography.label,
        color: pdfColors.primary,
    },
    td: {
        ...typography.bodySmall,
        color: pdfColors.textDark,
    },
    tdBold: {
        ...typography.bodySmall,
        fontWeight: 'bold',
        color: pdfColors.primary,
    },
    // Column widths (landscape ~277mm usable)
    colDate: { width: '10%' },
    colJournal: { width: '10%' },
    colType: { width: '8%' },
    colRef: { width: '15%' },
    colNarr: { width: '27%' },
    colDebit: { width: '10%', textAlign: 'right' },
    colCredit: { width: '10%', textAlign: 'right' },
    colBalance: { width: '10%', textAlign: 'right' },
});

// ─── Types ───────────────────────────────────────────────────────────────────
export interface LedgerEntry {
    date: string | Date;
    journalNumber: string;
    referenceType: string;
    referenceNumber?: string;
    narration: string;
    debit: number;
    credit: number;
    balance: number;
}

export interface LedgerData {
    account: {
        accountCode: string;
        accountName: string;
        groupName: string;
        subGroup: string;
    };
    openingBalance: number;
    entries: LedgerEntry[];
    totalDebit: number;
    totalCredit: number;
    closingBalance: number;
}

interface LedgerDocumentProps {
    ledgerData: LedgerData;
    startDate: Date;
    endDate: Date;
    companyDetails: ICompanyDetails | null;
}

// ─── Component ───────────────────────────────────────────────────────────────
export const LedgerDocument: React.FC<LedgerDocumentProps> = ({
    ledgerData,
    startDate,
    endDate,
    companyDetails,
}) => {
    registerPdfFonts();
    const dateStr = `${format(startDate, 'dd MMM yyyy')} – ${format(endDate, 'dd MMM yyyy')}`;

    return (
        <Document>
            <Page size="A4" orientation="landscape" style={commonStyles.page}>
                <DocumentHeader companyDetails={companyDetails} />

                <DocumentTitle title="General Ledger" />

                {/* Account info box */}
                <View style={s.infoBox}>
                    <View style={s.infoLeft}>
                        <Text style={s.infoLabel}>Account</Text>
                        <Text style={s.infoValue}>
                            {ledgerData.account.accountCode} — {ledgerData.account.accountName}
                        </Text>
                        <Text style={s.infoSubValue}>
                            {ledgerData.account.groupName} › {ledgerData.account.subGroup}
                        </Text>
                        <Text style={[s.infoSubValue, { marginTop: 6 }]}>Period: {dateStr}</Text>
                    </View>
                    <View style={s.infoRight}>
                        <Text style={s.balanceLabel}>Opening Balance</Text>
                        <Text style={s.balanceValue}>{formatCurrency(ledgerData.openingBalance)}</Text>
                    </View>
                </View>

                {/* Table */}
                <View style={commonStyles.table}>
                    {/* Header */}
                    <View style={s.tableHeader}>
                        <Text style={[s.th, s.colDate]}>Date</Text>
                        <Text style={[s.th, s.colJournal]}>Journal #</Text>
                        <Text style={[s.th, s.colType]}>Type</Text>
                        <Text style={[s.th, s.colRef]}>Ref #</Text>
                        <Text style={[s.th, s.colNarr]}>Narration</Text>
                        <Text style={[s.th, s.colDebit]}>Debit</Text>
                        <Text style={[s.th, s.colCredit]}>Credit</Text>
                        <Text style={[s.th, s.colBalance]}>Balance</Text>
                    </View>

                    {/* Rows */}
                    {ledgerData.entries.map((entry, i) => (
                        <View key={i} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}>
                            <Text style={[s.td, s.colDate]}>
                                {format(new Date(entry.date), 'dd MMM yy')}
                            </Text>
                            <Text style={[s.td, s.colJournal]}>{entry.journalNumber}</Text>
                            <Text style={[s.td, s.colType]}>{entry.referenceType}</Text>
                            <Text style={[s.td, s.colRef]}>{entry.referenceNumber || '—'}</Text>
                            <Text style={[s.td, s.colNarr]}>{entry.narration}</Text>
                            <Text style={[s.td, s.colDebit]}>
                                {entry.debit > 0 ? formatCurrency(entry.debit) : '—'}
                            </Text>
                            <Text style={[s.td, s.colCredit]}>
                                {entry.credit > 0 ? formatCurrency(entry.credit) : '—'}
                            </Text>
                            <Text style={[s.tdBold, s.colBalance]}>{formatCurrency(entry.balance)}</Text>
                        </View>
                    ))}

                    {/* Footer totals */}
                    <View style={s.tableFooter}>
                        <Text style={[s.tdBold, s.colDate]} />
                        <Text style={[s.tdBold, s.colJournal]} />
                        <Text style={[s.tdBold, s.colType]} />
                        <Text style={[s.tdBold, s.colRef]}>TOTALS</Text>
                        <Text style={[s.tdBold, s.colNarr]} />
                        <Text style={[s.tdBold, s.colDebit]}>{formatCurrency(ledgerData.totalDebit)}</Text>
                        <Text style={[s.tdBold, s.colCredit]}>{formatCurrency(ledgerData.totalCredit)}</Text>
                        <Text style={[s.tdBold, s.colBalance]}>{formatCurrency(ledgerData.closingBalance)}</Text>
                    </View>
                </View>

                <DocumentFooter companyDetails={companyDetails} />
            </Page>
        </Document>
    );
};