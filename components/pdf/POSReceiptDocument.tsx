// components/pdf/POSReceiptDocument.tsx
// Thermal receipt — 80 mm wide (226 pt), height computed from content.
// Pure black and white. No trailing divider on the last item row.

import React from 'react';
import { Page, Text, Document, View, StyleSheet } from '@react-pdf/renderer';
import { registerPdfFonts } from './shared/styles';
import { formatCurrency } from '@/utils/formatters/currency';
import { formatDateTime } from '@/utils/formatters/date';

// ─────────────────────────────────────────────────────────────────────────────
// Layout constants
// 1 mm = 2.8346 pt  →  80 mm ≈ 226 pt
// ─────────────────────────────────────────────────────────────────────────────
const W = 226;  // page width (pt) — 80 mm
const PX = 10;   // horizontal padding (pt)

// Fixed-height blocks (pt) — used to compute page height at render time
const BLOCK = {
    paddingTopBottom: 28,   // page paddingTop(12) + paddingBottom(16)
    companyName: 15,   // company name text + marginBottom
    companyDetailLine: 9,    // each detail line (address / phone / email)
    solidDivider: 11,   // borderBottom + marginVertical(5)*2
    dashedDivider: 11,
    receiptTitle: 16,   // title text + marginBottom
    metaRow: 10,   // each key-value meta row
    itemsHeader: 16,   // header row + paddingBottom + marginBottom
    itemRow: 16,   // each item row (paddingVertical(2)*2 + font ~12pt)
    totalRow: 10,   // each total/discount/vat row + marginBottom
    grandTotalRow: 20,   // double-border grand total row
    paymentRow: 12,   // paid-by row + marginTop
    thankYou: 18,   // thank you text + margins
    footerLine: 9,    // each footer detail line
    copyright: 14,   // copyright + marginTop
    buffer: 8,    // small safety buffer so nothing clips
} as const;

/**
 * Compute the exact page height (pt) needed for this sale's content.
 * This eliminates the blank space that appears with a fixed-height page.
 */
function computePageHeight(sale: any, companyDetails: any): number {
    const items: any[] = sale.items ?? [];
    const detailLines =
        (companyDetails?.address ? 1 : 0) +
        (companyDetails?.contactNumber ? 1 : 0) +
        (companyDetails?.email ? 1 : 0);

    const footerLines =
        1 +                                  // "Please keep this for your records."
        (companyDetails?.email ? 1 : 0);     // email repeated in footer

    return (
        BLOCK.paddingTopBottom +
        BLOCK.companyName +
        detailLines * BLOCK.companyDetailLine +
        BLOCK.solidDivider +
        BLOCK.receiptTitle +
        3 * BLOCK.metaRow +                  // No., Date, Customer
        BLOCK.dashedDivider +
        BLOCK.itemsHeader +
        items.length * BLOCK.itemRow +
        BLOCK.dashedDivider +
        BLOCK.totalRow +                     // Subtotal always shown
        (sale.discount > 0 ? BLOCK.totalRow : 0) +
        (sale.vatAmount > 0 ? BLOCK.totalRow : 0) +
        BLOCK.grandTotalRow +
        BLOCK.paymentRow +
        BLOCK.solidDivider +
        BLOCK.thankYou +
        footerLines * BLOCK.footerLine +
        BLOCK.copyright +
        BLOCK.buffer
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    page: {
        fontFamily: 'Roboto',
        fontSize: 7.5,
        backgroundColor: '#ffffff',
        color: '#000000',
        paddingTop: 12,
        paddingBottom: 16,
        paddingHorizontal: PX,
        flexDirection: 'column',
    },

    // Header
    companyName: {
        fontSize: 12,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 2,
        letterSpacing: 0.3,
    },
    companyDetail: {
        fontSize: 7,
        color: '#333333',
        textAlign: 'center',
        marginBottom: 1,
    },

    // Dividers
    dashed: {
        borderBottomWidth: 1,
        borderBottomStyle: 'dashed',
        borderBottomColor: '#999999',
        marginVertical: 5,
    },
    solid: {
        borderBottomWidth: 1,
        borderBottomColor: '#000000',
        marginVertical: 5,
    },

    // Receipt title
    receiptTitle: {
        fontSize: 10,
        fontWeight: 'bold',
        textAlign: 'center',
        letterSpacing: 3,
        marginBottom: 2,
    },

    // Meta rows
    metaRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 1.5,
    },
    metaLabel: { fontSize: 7, color: '#555555' },
    metaValue: { fontSize: 7, fontWeight: 'bold' },

    // Items table header
    itemsHeader: {
        flexDirection: 'row',
        borderBottomWidth: 0.5,
        borderBottomColor: '#000000',
        paddingBottom: 2,
        marginBottom: 2,
    },
    colDesc: { flex: 1, fontSize: 6.5, fontWeight: 'bold' },
    colQty: { width: 20, fontSize: 6.5, fontWeight: 'bold', textAlign: 'right' },
    colRate: { width: 36, fontSize: 6.5, fontWeight: 'bold', textAlign: 'right' },
    colAmt: { width: 38, fontSize: 6.5, fontWeight: 'bold', textAlign: 'right' },

    // Item row — border is applied conditionally (not on last row)
    itemRow: {
        flexDirection: 'row',
        paddingVertical: 2,
    },
    // Applied to every row except the last
    itemRowDivider: {
        borderBottomWidth: 0.3,
        borderBottomColor: '#dddddd',
    },

    itemDesc: { flex: 1, fontSize: 7.5, color: '#000000' },
    itemQty: { width: 20, fontSize: 7.5, color: '#333333', textAlign: 'right' },
    itemRate: { width: 36, fontSize: 7, color: '#555555', textAlign: 'right' },
    itemAmt: { width: 38, fontSize: 7.5, fontWeight: 'bold', textAlign: 'right' },

    // Totals
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 2,
    },
    totalLabel: { fontSize: 7.5, color: '#333333' },
    totalValue: { fontSize: 7.5, fontWeight: 'bold' },
    discountValue: { fontSize: 7.5, fontWeight: 'bold', color: '#333333' },

    // Grand total
    grandTotalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 3,
        paddingTop: 4,
        borderTopWidth: 2,
        borderTopColor: '#000000',
    },
    grandTotalLabel: { fontSize: 10, fontWeight: 'bold' },
    grandTotalValue: { fontSize: 10, fontWeight: 'bold' },

    // Payment method
    paymentRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 4,
    },
    paymentLabel: { fontSize: 7, color: '#555555' },
    paymentValue: { fontSize: 7, fontWeight: 'bold' },

    // Footer
    thankYou: {
        fontSize: 9,
        fontWeight: 'bold',
        textAlign: 'center',
        marginTop: 8,
        marginBottom: 2,
    },
    footerText: {
        fontSize: 6.5,
        color: '#555555',
        textAlign: 'center',
        marginBottom: 1,
    },
    footerCopyright: {
        fontSize: 6,
        color: '#aaaaaa',
        textAlign: 'center',
        marginTop: 6,
    },
});

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
interface POSReceiptDocumentProps {
    sale: any;
    companyDetails: any;
}

export const POSReceiptDocument: React.FC<POSReceiptDocumentProps> = ({
    sale,
    companyDetails,
}) => {
    registerPdfFonts();

    const items: any[] = sale.items ?? [];
    const lastIndex = items.length - 1;

    // Compute tight page height — no blank space below footer
    const pageHeight = computePageHeight(sale, companyDetails);

    return (
        <Document>
            {/* Size is [width, height] — height shrinks to content */}
            <Page size={[W, pageHeight]} style={styles.page}>

                {/* Company header */}
                <Text style={styles.companyName}>
                    {companyDetails?.companyName || 'Company'}
                </Text>
                {companyDetails?.address && (
                    <Text style={styles.companyDetail}>{companyDetails.address}</Text>
                )}
                {companyDetails?.contactNumber && (
                    <Text style={styles.companyDetail}>Tel: {companyDetails.contactNumber}</Text>
                )}
                {companyDetails?.email && (
                    <Text style={styles.companyDetail}>{companyDetails.email}</Text>
                )}

                <View style={styles.solid} />

                {/* Receipt title */}
                <Text style={styles.receiptTitle}>RECEIPT</Text>

                {/* Meta */}
                <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>No.</Text>
                    <Text style={styles.metaValue}>{sale.saleNumber}</Text>
                </View>
                <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Date</Text>
                    <Text style={styles.metaValue}>{formatDateTime(sale.createdAt)}</Text>
                </View>
                <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Customer</Text>
                    <Text style={styles.metaValue}>{sale.customerName}</Text>
                </View>

                <View style={styles.dashed} />

                {/* Items table */}
                <View style={styles.itemsHeader}>
                    <Text style={styles.colDesc}>ITEM</Text>
                    <Text style={styles.colQty}>QTY</Text>
                    <Text style={styles.colRate}>RATE</Text>
                    <Text style={styles.colAmt}>AMT</Text>
                </View>

                {items.map((item: any, i: number) => (
                    <View
                        key={i}
                        // Only apply the inter-row divider when this is NOT the last row.
                        // Filter removes the conditional so react-pdf never receives `false`.
                        style={[styles.itemRow, ...(i < lastIndex ? [styles.itemRowDivider] : [])]}
                    >
                        <Text style={styles.itemDesc}>{item.description}</Text>
                        <Text style={styles.itemQty}>{item.quantity}</Text>
                        <Text style={styles.itemRate}>{formatCurrency(item.rate)}</Text>
                        <Text style={styles.itemAmt}>{formatCurrency(item.total)}</Text>
                    </View>
                ))}

                <View style={styles.dashed} />

                {/* Totals */}
                <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Subtotal</Text>
                    <Text style={styles.totalValue}>{formatCurrency(sale.totalAmount)}</Text>
                </View>

                {sale.discount > 0 && (
                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>Discount</Text>
                        <Text style={styles.discountValue}>- {formatCurrency(sale.discount)}</Text>
                    </View>
                )}

                {sale.vatAmount > 0 && (
                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>VAT</Text>
                        <Text style={styles.totalValue}>{formatCurrency(sale.vatAmount)}</Text>
                    </View>
                )}

                {/* Grand total */}
                <View style={styles.grandTotalRow}>
                    <Text style={styles.grandTotalLabel}>TOTAL</Text>
                    <Text style={styles.grandTotalValue}>{formatCurrency(sale.grandTotal)}</Text>
                </View>

                {/* Payment method */}
                <View style={styles.paymentRow}>
                    <Text style={styles.paymentLabel}>Paid by</Text>
                    <Text style={styles.paymentValue}>{sale.paymentMethod}</Text>
                </View>

                <View style={styles.solid} />

                {/* Footer */}
                <Text style={styles.thankYou}>Thank You!</Text>
                <Text style={styles.footerText}>Please keep this for your records.</Text>
                {companyDetails?.email && (
                    <Text style={styles.footerText}>{companyDetails.email}</Text>
                )}
                <Text style={styles.footerCopyright}>
                    {companyDetails?.companyName || 'Company'} © {new Date().getFullYear()}
                </Text>

            </Page>
        </Document>
    );
};