// components/InvoiceDocument.tsx - Modern Blue Theme (Updated)

import React from 'react';
import { Page, Text, View, Document, StyleSheet, Font, Image, Svg, Path } from '@react-pdf/renderer';
import path from 'path';
import type { IInvoice } from '@/models/Invoice';
import type { ICompanyDetails } from '@/models/CompanyDetails';
import { numberToWords } from '@/lib/numberToWords';
import { UAE_VAT_PERCENTAGE } from '@/utils/constants';
import { formatCurrency } from '@/utils/formatters/currency';
import { formatDisplayDate, formatDateTime } from '@/utils/formatters/date';

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

// Icon Components
const MapPinIcon = () => (
  <Svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#90caf9" strokeWidth="2">
    <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <Path d="M12 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
  </Svg>
);

const PhoneIcon = () => (
  <Svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#90caf9" strokeWidth="2">
    <Path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </Svg>
);

const MailIcon = () => (
  <Svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#90caf9" strokeWidth="2">
    <Path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <Path d="M22 6l-10 7L2 6" />
  </Svg>
);

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Roboto',
    fontSize: 9,
    padding: 0,
    backgroundColor: '#ffffff',
    position: 'relative',
  },

  // Watermark
  watermark: {
    position: 'absolute',
    top: '35%',
    left: '20%',
    fontSize: 80,
    color: '#f0f0f0',
    opacity: 0.05,
    transform: 'rotate(-45deg)',
    fontWeight: 'bold',
  },

  // Header Section
  header: {
    backgroundColor: '#1a237e',
    padding: '15 25',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logo: {
    width: 55,
    height: 55,
    objectFit: 'contain',
  },
  companyInfo: {
    alignItems: 'flex-end',
  },
  companyDetail: {
    fontSize: 8,
    color: '#e3f2fd',
    marginBottom: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  // Title Section
  titleSection: {
    backgroundColor: '#283593',
    padding: '10 25',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  documentTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 2,
  },
  documentNumber: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#ffeb3b',
  },

  // Info Bar
  infoBar: {
    backgroundColor: '#e8eaf6',
    padding: '12 25',
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 2,
    borderBottomColor: '#1a237e',
  },
  customerSection: {
    flex: 1,
  },
  sectionLabel: {
    fontSize: 8,
    color: '#1a237e',
    fontWeight: 'bold',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  customerName: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 2,
  },
  customerDetail: {
    fontSize: 8,
    color: '#424242',
    marginBottom: 1,
  },
  dateInfo: {
    alignItems: 'flex-end',
  },
  dateLabel: {
    fontSize: 7,
    color: '#666666',
    marginBottom: 2,
  },
  dateValue: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1a237e',
  },

  // Main Content
  content: {
    padding: '15 25 25 25',
    flexGrow: 1,
  },

  // Table
  table: {
    marginTop: 10,
    marginBottom: 15,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1a237e',
    padding: 8,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  tableHeaderText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#ffffff',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e0e0e0',
  },
  tableCell: {
    fontSize: 8.5,
    color: '#424242',
  },
  descCol: { width: '40%' },
  qtyCol: { width: '15%', textAlign: 'center' },
  rateCol: { width: '20%', textAlign: 'right' },
  totalCol: { width: '25%', textAlign: 'right', fontWeight: 'bold' },

  // Summary Section
  summaryContainer: {
    marginTop: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 15,
  },

  // Totals Box
  totalsBox: {
    width: '42%',
    backgroundColor: '#ffffff',
    border: '1.5 solid #1a237e',
    borderRadius: 4,
    overflow: 'hidden',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: '6 10',
    borderBottomWidth: 0.5,
    borderBottomColor: '#e0e0e0',
  },
  totalLabel: {
    fontSize: 8.5,
    color: '#424242',
  },
  totalValue: {
    fontSize: 8.5,
    color: '#424242',
    fontWeight: 'bold',
  },
  grandTotalRow: {
    backgroundColor: '#1a237e',
    padding: '8 10',
    borderBottomWidth: 0,
  },
  grandTotalLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  grandTotalValue: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#ffeb3b',
  },

  // Amount in Words Box (Voucher Style)
  amountInWordsBox: {
    backgroundColor: '#e8eaf6',
    border: '1.5 solid #1a237e',
    borderRadius: 4,
    padding: 12,
    marginBottom: 15,
  },
  amountWordsRow: {
    marginBottom: 8,
  },
  amountWordsLabel: {
    fontSize: 7,
    color: '#1a237e',
    fontWeight: 'bold',
    marginBottom: 3,
    textTransform: 'uppercase',
  },
  amountWordsText: {
    fontSize: 8,
    color: '#424242',
    backgroundColor: '#ffffff',
    padding: '5 8',
    borderRadius: 3,
    border: '0.5 solid #c5cae9',
  },

  // Bottom Section
  bottomSection: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 10,
  },

  // Bank Details Box
  bankBox: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    border: '1 solid #e0e0e0',
    borderRadius: 4,
    padding: 10,
  },
  boxTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#1a237e',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  boxContent: {
    fontSize: 8,
    color: '#424242',
    lineHeight: 1.4,
  },

  // Terms Box
  termsBox: {
    flex: 1,
    backgroundColor: '#fff3e0',
    border: '1 solid #ffe0b2',
    borderRadius: 4,
    padding: 10,
  },

  validityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 3,
  },
  bulletPoint: {
    fontSize: 8,
    color: '#1a237e',
    marginRight: 5,
    fontWeight: 'bold',
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1a237e',
    padding: '10 25',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 7,
    color: '#e3f2fd',
  },
  systemNote: {
    fontSize: 6,
    color: '#90caf9',
    fontStyle: 'italic',
  },
});

interface InvoiceDocumentProps {
  bill: IInvoice;
  type: string;
  companyDetails: ICompanyDetails | null;
}

export const InvoiceDocument: React.FC<InvoiceDocumentProps> = ({ bill, type, companyDetails }) => {
  const grossTotal = bill.totalAmount || 0;
  const vatAmount = bill.vatAmount || 0;
  const subtotal = grossTotal - bill.discount;
  const discount = bill.discount || 0;
  const grandTotal = bill.grandTotal || 0;


  const documentTitle = type.toUpperCase().replace(/_/g, ' ');

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Watermark */}
        <Text style={styles.watermark}>INVOICE</Text>

        {/* Header */}
        <View style={styles.header}>
          {companyDetails?.logoUrl ? (
            <Image style={styles.logo} src={companyDetails.logoUrl} />
          ) : (
            <View style={{ width: 55, height: 55 }} />
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
            {companyDetails?.website && (
              <Text style={[styles.companyDetail, { gap: 0 }]}>{companyDetails.website}</Text>
            )}
          </View>
        </View>

        {/* Title Section */}
        <View style={styles.titleSection}>
          <Text style={styles.documentTitle}>{documentTitle}</Text>
          <Text style={styles.documentNumber}>{bill.invoiceNumber}</Text>
        </View>

        {/* Info Bar */}
        <View style={styles.infoBar}>
          <View style={styles.customerSection}>
            <Text style={styles.sectionLabel}>Billed To:</Text>
            <Text style={styles.customerName}>{bill.customerName}</Text>
            {bill.customerPhone && (
              <Text style={styles.customerDetail}>{bill.customerPhone}</Text>
            )}
            {bill.customerEmail && (
              <Text style={styles.customerDetail}>{bill.customerEmail}</Text>
            )}
          </View>
          <View style={styles.dateInfo}>
            <Text style={styles.dateLabel}>Invoice Date</Text>
            <Text style={styles.dateValue}>{formatDisplayDate(bill.createdAt)}</Text>
          </View>
        </View>

        {/* Main Content */}
        <View style={styles.content}>
          {/* Items Table */}
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, styles.descCol]}>Description</Text>
              <Text style={[styles.tableHeaderText, styles.qtyCol]}>Qty</Text>
              <Text style={[styles.tableHeaderText, styles.rateCol]}>Rate</Text>
              <Text style={[styles.tableHeaderText, styles.totalCol]}>Total</Text>
            </View>
            {bill.items.map((item, index) => (
              <View style={styles.tableRow} key={index}>
                <Text style={[styles.tableCell, styles.descCol]}>{item.description}</Text>
                <Text style={[styles.tableCell, styles.qtyCol]}>{item.quantity}</Text>
                <Text style={[styles.tableCell, styles.rateCol]}>{formatCurrency(item.rate || 0)}</Text>
                <Text style={[styles.tableCell, styles.totalCol]}>{formatCurrency(item.total || 0)}</Text>
              </View>
            ))}
          </View>

          {/* Summary Section */}
          <View style={styles.summaryContainer}>
            {/* Totals */}
            <View style={styles.summaryRow}>
              <View style={styles.totalsBox}>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Gross Total</Text>
                  <Text style={styles.totalValue}>{formatCurrency(grossTotal)}</Text>
                </View>
                {discount > 0 && (
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Discount</Text>
                    <Text style={styles.totalValue}>- {formatCurrency(discount)}</Text>
                  </View>
                )}
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Subtotal</Text>
                  <Text style={styles.totalValue}>{formatCurrency(subtotal)}</Text>
                </View>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>VAT ({UAE_VAT_PERCENTAGE}%)</Text>
                  <Text style={styles.totalValue}>{formatCurrency(vatAmount)}</Text>
                </View>
                <View style={styles.grandTotalRow}>
                  <Text style={styles.grandTotalLabel}>Grand Total</Text>
                  <Text style={styles.grandTotalValue}>{formatCurrency(grandTotal)}</Text>
                </View>
              </View>
            </View>

            {/* Amount in Words (Voucher Style) */}
            <View style={styles.amountInWordsBox}>
              <View style={styles.amountWordsRow}>
                <Text style={styles.amountWordsLabel}>The Sum of:</Text>
                <Text style={styles.amountWordsText}>
                  Rupees {numberToWords(grandTotal)} Only
                </Text>
              </View>
              {vatAmount > 0 && (
                <View style={styles.amountWordsRow}>
                  <Text style={styles.amountWordsLabel}>VAT Amount:</Text>
                  <Text style={styles.amountWordsText}>
                    Rupees {numberToWords(vatAmount)} Only
                  </Text>
                </View>
              )}
            </View>

            {/* Bottom Section: Bank Details & Terms */}
            <View style={styles.bottomSection}>
              {companyDetails?.bankDetails && (
                <View style={styles.bankBox}>
                  <Text style={styles.boxTitle}>Bank Details</Text>
                  <Text style={styles.boxContent}>{companyDetails.bankDetails}</Text>
                </View>
              )}
              {companyDetails?.termsAndConditions && (
                <View style={styles.termsBox}>
                <Text style={styles.boxTitle}>Terms & Conditions</Text>
                
                <View style={styles.validityItem}>
                  <Text style={styles.bulletPoint}>•</Text>
                  <Text style={styles.boxContent}>
                    These examples are for illustrative purposes only and do not constitute legal advice.
                  </Text>
                </View>

                <View style={styles.validityItem}>
                  <Text style={styles.bulletPoint}>•</Text>
                  <Text style={styles.boxContent}>
                    Consulting a legal professional is recommended to ensure compliance with local laws.
                  </Text>
                </View>

                <View style={styles.validityItem}>
                  <Text style={styles.bulletPoint}>•</Text>
                  <Text style={styles.boxContent}>
                    Terms should remain clear, concise, and transparent for all users.
                  </Text>
                </View>
              </View>
              )}
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Generated: {formatDateTime(new Date())}
          </Text>
          <Text style={styles.systemNote}>
            This is a system-generated invoice and is valid without signature
          </Text>
          <Text style={styles.footerText}>
            {companyDetails?.companyName || 'Company Name'} © {new Date().getFullYear()}
          </Text>
        </View>
      </Page>
    </Document>
  );
}