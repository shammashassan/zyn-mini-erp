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
    colName: { width: '28%' },
    colCategory: { width: '18%' },
    colQty: { width: '12%', textAlign: 'right' },
    colUnitCost: { width: '16%', textAlign: 'right' },
    colValue: { width: '14%', textAlign: 'right' },
    colStatus: { width: '12%', textAlign: 'center' },
    statusLow: { color: '#e65100' },
    statusOut: { color: '#c62828' },
    statusOk: { color: '#2e7d32' },
});

// Matches actual API InventoryItem interface
interface InventoryItemData {
    id: string;
    name: string;
    type: string;
    category: string;
    openingQty: number;
    purchased: number;
    adjusted: number;
    closingQty: number;       // was wrongly 'currentStock' before
    unitCost: number;
    stockValue: number;
    status: 'In Stock' | 'Low Stock' | 'Out of Stock';  // was wrongly 'ok'|'low'|'out' before
}

interface InventoryReportDocumentProps {
    inventory: InventoryItemData[];
    summary: { totalItems: number; totalStockValue: number; lowStockItems: number; outOfStockItems: number; avgStockValue: number; };
    dateRange: { from: Date; to: Date };
    companyDetails: ICompanyDetails | null;
}

export const InventoryReportDocument: React.FC<InventoryReportDocumentProps> = ({ inventory, summary, dateRange, companyDetails }) => {
    registerPdfFonts();
    const dateStr = `${format(dateRange.from, 'dd MMM yyyy')} – ${format(dateRange.to, 'dd MMM yyyy')}`;
    return (
        <Document>
            <Page size="A4" style={commonStyles.page}>
                <DocumentHeader companyDetails={companyDetails} />
                <DocumentTitle title="Inventory Report" />
                <View style={s.metaRow}><Text style={s.metaText}>{dateStr}</Text></View>
                <View style={s.summaryGrid}>
                    <View style={s.summaryBox}><Text style={s.summaryLabel}>Total Stock Value</Text><Text style={s.summaryValue}>{formatCurrency(summary.totalStockValue)}</Text></View>
                    <View style={s.summaryBox}><Text style={s.summaryLabel}>Total Materials</Text><Text style={s.summaryValue}>{summary.totalItems}</Text></View>
                    <View style={s.summaryBox}><Text style={s.summaryLabel}>Low Stock</Text><Text style={s.summaryValue}>{summary.lowStockItems}</Text></View>
                    <View style={s.summaryBox}><Text style={s.summaryLabel}>Out of Stock</Text><Text style={s.summaryValue}>{summary.outOfStockItems}</Text></View>
                </View>
                <View style={s.tableHeader}>
                    <Text style={[s.th, s.colName]}>Material</Text>
                    <Text style={[s.th, s.colCategory]}>Category</Text>
                    <Text style={[s.th, s.colQty]}>Closing Qty</Text>
                    <Text style={[s.th, s.colUnitCost]}>Unit Cost</Text>
                    <Text style={[s.th, s.colValue]}>Stock Value</Text>
                    <Text style={[s.th, s.colStatus]}>Status</Text>
                </View>
                {inventory.map((row, i) => {
                    const isOut = row.status === 'Out of Stock';
                    const isLow = row.status === 'Low Stock';
                    return (
                        <View key={row.id} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}>
                            <Text style={[s.td, s.colName]}>{row.name}</Text>
                            <Text style={[s.td, s.colCategory]}>{row.category}</Text>
                            <Text style={[s.td, s.colQty]}>{row.closingQty.toLocaleString()}</Text>
                            <Text style={[s.td, s.colUnitCost]}>{formatCurrency(row.unitCost)}</Text>
                            <Text style={[s.td, s.colValue]}>{formatCurrency(row.stockValue)}</Text>
                            <Text style={[s.td, s.colStatus, isOut ? s.statusOut : isLow ? s.statusLow : s.statusOk]}>
                                {row.status}
                            </Text>
                        </View>
                    );
                })}
                <DocumentFooter companyDetails={companyDetails} />
            </Page>
        </Document>
    );
};
