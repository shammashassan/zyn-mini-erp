// components/VoucherDocument.tsx - FIXED: Proper support for payeeName and vendorName

import React from 'react';
import { Page, Text, View, Document, StyleSheet, Font, Image, Svg, Path } from '@react-pdf/renderer';
import path from 'path';
import type { IVoucher } from '@/models/Voucher';
import type { ICompanyDetails } from '@/models/CompanyDetails';
import { numberToWords } from '@/lib/numberToWords';
import { formatCurrency } from '@/utils/formatters/currency';
import { formatDateTime, formatDisplayDate } from '@/utils/formatters/date';

try {
    Font.register({
        family: 'Roboto',
        fonts: [
            { src: path.join(process.cwd(), 'public', 'fonts', 'Roboto-Regular.ttf') },
            { src: path.join(process.cwd(), 'public', 'fonts', 'Roboto-Bold.ttf'), fontWeight: 'bold' },
            { src: path.join(process.cwd(), 'public', 'fonts', 'Roboto-Italic.ttf'), fontStyle: 'italic' },
        ],
    });
} catch (error) {
    console.error("Failed to register fonts.", error);
}

// Lucide Icon Components
const MapPinIcon = () => (
    <Svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#90caf9" strokeWidth="2">
        <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <Path d="M12 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
    </Svg>
);

const PhoneIcon = () => (
    <Svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#90caf9" strokeWidth="2">
        <Path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </Svg>
);

const MailIcon = () => (
    <Svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#90caf9" strokeWidth="2">
        <Path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
        <Path d="M22 6l-10 7L2 6" />
    </Svg>
);

const styles = StyleSheet.create({
    page: {
        fontFamily: 'Roboto',
        fontSize: 8,
        padding: 0,
        backgroundColor: '#ffffff',
        position: 'relative',
        flexDirection: 'column',
    },

    // Watermark
    watermark: {
        position: 'absolute',
        top: '40%',
        left: '25%',
        fontSize: 60,
        color: '#f0f0f0',
        opacity: 0.06,
        transform: 'rotate(-45deg)',
        fontWeight: 'bold',
    },

    // Header Section
    header: {
        backgroundColor: '#1a237e',
        padding: '12 20',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    logo: {
        width: 45,
        height: 45,
        objectFit: 'contain',
    },
    companyInfo: {
        alignItems: 'flex-end',
    },
    companyDetail: {
        fontSize: 7,
        color: '#e3f2fd',
        marginBottom: 2.5,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },

    // Title Section
    titleSection: {
        backgroundColor: '#283593',
        padding: '7 15',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    voucherTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#ffffff',
        letterSpacing: 1.5,
    },
    voucherNumber: {
        fontSize: 11,
        fontWeight: 'bold',
        color: '#ffeb3b',
    },

    // Info Bar
    infoBar: {
        backgroundColor: '#f5f5f5',
        padding: '6 15',
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderBottomWidth: 1.5,
        borderBottomColor: '#1a237e',
    },
    infoItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    infoLabel: {
        fontSize: 7,
        color: '#666666',
        marginRight: 3,
        fontWeight: 'bold',
    },
    infoValue: {
        fontSize: 7,
        color: '#000000',
        fontWeight: 'bold',
    },

    // Main Content
    content: {
        padding: '10 15 30 15',
        flexGrow: 1,
        display: 'flex',
        flexDirection: 'column',
    },

    // AMOUNT BOX
    amountBox: {
        backgroundColor: '#e8eaf6',
        border: '1.5 solid #1a237e',
        borderRadius: 4,
        padding: '15 12',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    amountWordsSection: {
        flex: 1,
        marginRight: 15,
        justifyContent: 'center',
    },
    amountValueSection: {
        alignItems: 'flex-end',
        justifyContent: 'center',
        minWidth: '30%',
        borderLeftWidth: 1,
        borderLeftColor: '#c5cae9',
        paddingLeft: 12,
    },
    amountLabel: {
        fontSize: 6.5,
        color: '#1a237e',
        fontWeight: 'bold',
        marginBottom: 3,
        textTransform: 'uppercase',
    },
    amountWords: {
        fontSize: 7.5,
        color: '#424242',
        backgroundColor: '#ffffff',
        padding: '5 8',
        borderRadius: 3,
        border: '0.5 solid #c5cae9',
    },
    amountValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1a237e',
    },

    // Details Table
    table: {
        marginBottom: 12,
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 0.5,
        borderBottomColor: '#e0e0e0',
        paddingVertical: 5,
    },
    tableLabel: {
        width: '25%',
        fontSize: 7,
        color: '#1a237e',
        fontWeight: 'bold',
    },
    tableValue: {
        flex: 1,
        fontSize: 7.5,
        color: '#000000',
    },

    // Items Section
    itemsSection: {
        marginBottom: 6,
    },
    sectionTitle: {
        fontSize: 8,
        fontWeight: 'bold',
        color: '#1a237e',
        marginBottom: 4,
        paddingBottom: 2,
        borderBottomWidth: 1.5,
        borderBottomColor: '#1a237e',
    },
    itemsHeader: {
        flexDirection: 'row',
        paddingVertical: 4,
        backgroundColor: '#f5f5f5',
        borderBottomWidth: 1,
        borderBottomColor: '#1a237e',
        fontWeight: 'bold',
    },
    itemRow: {
        flexDirection: 'row',
        paddingVertical: 4,
        borderBottomWidth: 0.5,
        borderBottomColor: '#f0f0f0',
    },
    itemDesc: {
        flex: 1,
        fontSize: 7,
        color: '#424242',
    },
    itemQty: {
        width: '12%',
        fontSize: 7,
        color: '#424242',
        textAlign: 'center',
    },
    itemRate: {
        width: '15%',
        fontSize: 7,
        color: '#424242',
        textAlign: 'right',
    },
    itemAmount: {
        width: '15%',
        fontSize: 7,
        color: '#424242',
        textAlign: 'right',
        fontWeight: 'bold',
    },

    // System Note
    systemNote: {
        fontSize: 6,
        color: '#90caf9',
        fontStyle: 'italic',
    },

    // Footer
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#1a237e',
        padding: '8 20',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    footerText: {
        fontSize: 6,
        color: '#e3f2fd',
    },
});

interface VoucherDocumentProps {
    bill: IVoucher;
    companyDetails: ICompanyDetails | null;
}

export const VoucherDocument: React.FC<VoucherDocumentProps> = ({ bill, companyDetails }) => {
    const type = bill.voucherType || (bill as any).documentType;
    const isReceipt = type === 'receipt';
    const isRefund = type === 'refund';

    const voucherTitle = isRefund
        ? 'REFUND VOUCHER'
        : isReceipt
            ? 'RECEIPT VOUCHER'
            : 'PAYMENT VOUCHER';
    const partyLabel = isReceipt ? 'Received From' : 'Paid To';

    // ✅ FIXED: Comprehensive party name resolution
    let partyName = '';
    
    if (isReceipt || isRefund) {
        // For receipts and refunds, prioritize customer
        partyName = bill.customerName || bill.supplierName || bill.payeeName || (bill as any).vendorName || '';
    } else {
        // For payments, check all possible party fields
        partyName = 
            bill.supplierName || 
            bill.payeeName || 
            (bill as any).vendorName || 
            bill.customerName || 
            '';
    }

    // Logic: Connected Invoice IDs
    const connectedInvoiceIds = bill.connectedDocuments?.invoiceIds || [];
    const hasConnectedInvoices = connectedInvoiceIds.length > 0;

    const connectedInvoicesDisplay = connectedInvoiceIds.map((inv: any) => {
        if (typeof inv === 'object' && inv?.invoiceNumber) {
            return inv.invoiceNumber;
        }
        return inv;
    }).join(', ');

    // Logic: Connected Purchase IDs (For Payments)
    const connectedPurchaseIds = bill.connectedDocuments?.purchaseIds || [];
    const hasConnectedPurchases = connectedPurchaseIds.length > 0;

    const connectedPurchasesDisplay = connectedPurchaseIds.map((purch: any) => {
        if (typeof purch === 'object' && purch?.referenceNumber) {
            return purch.referenceNumber;
        }
        return purch;
    }).join(', ');

    // ✅ NEW: Connected Expense IDs (For Payments)
    const connectedExpenseIds = bill.connectedDocuments?.expenseIds || [];
    const hasConnectedExpenses = connectedExpenseIds.length > 0;

    const connectedExpensesDisplay = connectedExpenseIds.map((exp: any) => {
        if (typeof exp === 'object' && exp?.referenceNumber) {
            return exp.referenceNumber;
        }
        return exp;
    }).join(', ');

    const hasNotes = bill.notes && bill.notes.trim().length > 0;
    const amount = bill.grandTotal || bill.totalAmount || 0;

    return (
        <Document>
            <Page size="A5" orientation="landscape" style={styles.page}>
                {/* Watermark */}
                <Text style={styles.watermark}>
                    {isRefund ? 'REFUND' : isReceipt ? 'RECEIPT' : 'PAYMENT'}
                </Text>

                {/* Header */}
                <View style={styles.header}>
                    {companyDetails?.logoUrl ? (
                        <Image style={styles.logo} src={companyDetails.logoUrl} />
                    ) : (
                        <View style={{ width: 45, height: 45 }} />
                    )}
                    <View style={styles.companyInfo}>
                        {companyDetails?.address && (
                            <View style={styles.companyDetail}>
                                <MapPinIcon />
                                <Text>{companyDetails.address}</Text>
                            </View>
                        )}
                        {companyDetails?.contactNumber && (
                            <View style={styles.companyDetail}>
                                <PhoneIcon />
                                <Text>
                                    {companyDetails.contactNumber}
                                    {companyDetails.telephone && ` / ${companyDetails.telephone}`}
                                </Text>
                            </View>
                        )}
                        {companyDetails?.email && (
                            <View style={styles.companyDetail}>
                                <MailIcon />
                                <Text>{companyDetails.email}</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Title Section */}
                <View style={styles.titleSection}>
                    <Text style={styles.voucherTitle}>{voucherTitle}</Text>
                    <Text style={styles.voucherNumber}>{bill.invoiceNumber}</Text>
                </View>

                {/* Info Bar */}
                <View style={styles.infoBar}>
                    <View style={styles.infoItem}>
                        <Text style={styles.infoLabel}>DATE:</Text>
                        <Text style={styles.infoValue}>
                            {formatDisplayDate(bill.voucherDate)}
                        </Text>
                    </View>
                    <View style={styles.infoItem}>
                        <Text style={styles.infoLabel}>METHOD:</Text>
                        <Text style={styles.infoValue}>{bill.paymentMethod}</Text>
                    </View>
                </View>

                {/* Main Content */}
                <View style={styles.content}>

                    {/* Items and Details Container */}
                    <View>
                        {/* 1. Details Table */}
                        <View style={styles.table}>
                            <View style={styles.tableRow}>
                                <Text style={styles.tableLabel}>{partyLabel}</Text>
                                <Text style={styles.tableValue}>
                                    {partyName || 'Walk-in Customer'}
                                </Text>
                            </View>

                            {/* Connected Invoices Row */}
                            {hasConnectedInvoices && (
                                <View style={styles.tableRow}>
                                    <Text style={styles.tableLabel}>Agst Invoice(s)</Text>
                                    <Text style={styles.tableValue}>{connectedInvoicesDisplay}</Text>
                                </View>
                            )}

                            {/* Connected Purchases Row */}
                            {hasConnectedPurchases && (
                                <View style={styles.tableRow}>
                                    <Text style={styles.tableLabel}>Agst Purchase(s)</Text>
                                    <Text style={styles.tableValue}>{connectedPurchasesDisplay}</Text>
                                </View>
                            )}

                            {/* ✅ NEW: Connected Expenses Row */}
                            {hasConnectedExpenses && (
                                <View style={styles.tableRow}>
                                    <Text style={styles.tableLabel}>Agst Expense(s)</Text>
                                    <Text style={styles.tableValue}>{connectedExpensesDisplay}</Text>
                                </View>
                            )}

                            {hasNotes && (
                                <View style={styles.tableRow}>
                                    <Text style={styles.tableLabel}>Remarks</Text>
                                    <Text style={styles.tableValue}>{bill.notes}</Text>
                                </View>
                            )}
                        </View>

                        {/* 2. Items Section */}
                        {bill.items && bill.items.length > 0 && (
                            <View style={styles.itemsSection}>
                                <Text style={styles.sectionTitle}>PARTICULARS</Text>

                                <View style={styles.itemsHeader}>
                                    <Text style={styles.itemDesc}>Description</Text>
                                    <Text style={styles.itemQty}>Qty</Text>
                                    <Text style={styles.itemRate}>Rate</Text>
                                    <Text style={styles.itemAmount}>Amount</Text>
                                </View>

                                {bill.items.map((item: any, index: number) => (
                                    <View key={index} style={styles.itemRow}>
                                        <Text style={styles.itemDesc}>{item.description}</Text>
                                        <Text style={styles.itemQty}>{item.quantity}</Text>
                                        <Text style={styles.itemRate}>{formatCurrency(item.rate)}</Text>
                                        <Text style={styles.itemAmount}>{formatCurrency(item.total)}</Text>
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>

                    {/* SPACER */}
                    <View style={{ flex: 1 }} />

                    {/* 3. Bottom Amount Box */}
                    <View style={styles.amountBox}>
                        <View style={styles.amountWordsSection}>
                            <Text style={styles.amountLabel}>The Sum of:</Text>
                            <Text style={styles.amountWords}>
                                {numberToWords(amount)} Dirhams Only
                            </Text>
                        </View>

                        <View style={styles.amountValueSection}>
                            <Text style={styles.amountValue}>
                                {formatCurrency(amount)}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    <Text style={styles.footerText}>
                        Generated: {formatDateTime(new Date())}
                    </Text>
                    <Text style={styles.systemNote}>
                        This is a system-generated voucher and is valid without signature
                    </Text>
                    <Text style={styles.footerText}>
                        {companyDetails?.companyName || 'Company Name'} © {new Date().getFullYear()}
                    </Text>
                </View>
            </Page>
        </Document>
    );
};