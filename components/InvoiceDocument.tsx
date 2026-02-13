// components/InvoiceDocument.tsx - FINAL: Using party snapshots for PDF generation

import React from 'react';
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';
import type { IInvoice } from '@/models/Invoice';
import type { ICompanyDetails } from '@/models/CompanyDetails';
import { numberToWords } from '@/lib/numberToWords';
import { UAE_VAT_PERCENTAGE } from '@/utils/constants';
import { formatCurrency } from '@/utils/formatters/currency';
import { formatDisplayDate } from '@/utils/formatters/date';

// Shared Components
import { commonStyles, registerPdfFonts, pdfColors } from './pdf/styles';
import { PDFHeader } from './pdf/Header';
import { PDFFooter } from './pdf/Footer';

const styles = StyleSheet.create({
  // Invoice specific overrides
  content: {
    padding: '15 25 25 25',
    flexGrow: 1,
  },
  descCol: { width: '40%' },
  qtyCol: { width: '15%', textAlign: 'center' },
  rateCol: { width: '20%', textAlign: 'right' },
  totalCol: { width: '25%', textAlign: 'right', fontWeight: 'bold' },

  entityName: { fontSize: 11, fontWeight: 'bold', color: pdfColors.textMain, marginBottom: 2 },
  entityDetail: { fontSize: 8, color: pdfColors.textDark, marginBottom: 1 },
  labelRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 2 },
  inlineLabel: { fontSize: 9, color: pdfColors.primary, marginRight: 6, fontWeight: 'bold' },

  // New Styles for label-only layout
  labelOnly: { marginBottom: 4 },
  standAloneLabel: { fontSize: 9, color: pdfColors.primary, fontWeight: 'bold' },

  dateInfo: {
    alignItems: 'flex-end',
  },
  dateLabel: {
    fontSize: 7,
    color: pdfColors.textMuted,
    marginBottom: 2,
  },
  dateValue: {
    fontSize: 10,
    fontWeight: 'bold',
    color: pdfColors.primary,
  },

  summaryContainer: { marginTop: 20 },
  summaryRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 15 },

  totalsBox: {
    width: '42%',
    backgroundColor: pdfColors.white,
    border: `1.5 solid ${pdfColors.primary}`,
    borderRadius: 4,
    overflow: 'hidden',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: '6 10',
    borderBottomWidth: 0.5,
    borderBottomColor: pdfColors.border,
  },
  grandTotalRow: {
    backgroundColor: pdfColors.primary,
    padding: '8 10',
    borderBottomWidth: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  totalLabel: { fontSize: 8.5, color: pdfColors.textDark },
  totalValue: { fontSize: 8.5, color: pdfColors.textDark, fontWeight: 'bold' },
  grandTotalLabel: { fontSize: 10, fontWeight: 'bold', color: pdfColors.white },
  grandTotalValue: { fontSize: 11, fontWeight: 'bold', color: pdfColors.accent },

  amountInWordsBox: {
    backgroundColor: pdfColors.secondary,
    border: `1.5 solid ${pdfColors.primary}`,
    borderRadius: 4,
    padding: 12,
    marginBottom: 15,
  },
  amountWordsLabel: {
    fontSize: 7,
    color: pdfColors.primary,
    fontWeight: 'bold',
    marginBottom: 3,
    textTransform: 'uppercase',
  },
  amountWordsText: {
    fontSize: 8,
    color: pdfColors.textDark,
    backgroundColor: pdfColors.white,
    padding: '5 8',
    borderRadius: 3,
    border: `0.5 solid ${pdfColors.border}`,
  },

  bottomSection: { flexDirection: 'row', gap: 15, marginBottom: 10 },
  bankBox: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    border: `1 solid ${pdfColors.border}`,
    borderRadius: 4,
    padding: 10,
  },
  termsBox: {
    flex: 1,
    backgroundColor: pdfColors.warning,
    border: `1 solid ${pdfColors.warningBorder}`,
    borderRadius: 4,
    padding: 10,
  },
  boxTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: pdfColors.primary,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  boxContent: { fontSize: 8, color: pdfColors.textDark, lineHeight: 1.4 },
  validityItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 3 },
  bulletPoint: { fontSize: 8, color: pdfColors.primary, marginRight: 5, fontWeight: 'bold' },
});

interface InvoiceDocumentProps {
  bill: IInvoice;
  type: string;
  companyDetails: ICompanyDetails | null;
}

export const InvoiceDocument: React.FC<InvoiceDocumentProps> = ({ bill, type, companyDetails }) => {
  registerPdfFonts();

  const grossTotal = bill.totalAmount || 0;
  const vatAmount = bill.vatAmount || 0;
  const subtotal = grossTotal - bill.discount;
  const discount = bill.discount || 0;
  const grandTotal = bill.grandTotal || 0;
  const documentTitle = type.toUpperCase().replace(/_/g, ' ');

  // Use snapshots for PDF (immutable legal truth)
  const partyName = bill.partySnapshot.displayName;
  const partyAddress = bill.partySnapshot.address;
  // const partyVAT = bill.partySnapshot.taxIdentifiers?.vatNumber;

  const contactName = bill.contactSnapshot?.name;
  const contactPhone = bill.contactSnapshot?.phone;
  const contactEmail = bill.contactSnapshot?.email;
  const contactDesignation = bill.contactSnapshot?.designation;

  // Check if there's any additional info beyond party name
  const hasAdditionalInfo = contactName || contactPhone || contactEmail ||
    (partyAddress && (partyAddress.street || partyAddress.city || partyAddress.state ||
      partyAddress.postalCode || partyAddress.country));

  return (
    <Document>
      <Page size="A4" style={commonStyles.page}>
        <Text style={commonStyles.watermark}>INVOICE</Text>

        <PDFHeader companyDetails={companyDetails} />

        <View style={commonStyles.titleSection}>
          <Text style={commonStyles.documentTitle}>{documentTitle}</Text>
          <Text style={commonStyles.documentNumber}>{bill.invoiceNumber}</Text>
        </View>

        <View style={commonStyles.infoBar}>
          <View style={{ flex: 1 }}>
            {hasAdditionalInfo ? (
              /* Has Contact Info or Address */
              <>
                <View style={styles.labelRow}>
                  <Text style={styles.inlineLabel}>Billed To:</Text>
                  <Text style={styles.entityName}>{partyName}</Text>
                </View>
                {contactName && (
                  <Text style={styles.entityDetail}>
                    {contactName}{contactDesignation && ` (${contactDesignation})`}
                  </Text>
                )}
                {contactPhone && <Text style={styles.entityDetail}>{contactPhone}</Text>}
                {contactEmail && <Text style={styles.entityDetail}>{contactEmail}</Text>}
                {partyAddress && (
                  <Text style={styles.entityDetail}>
                    {[
                      partyAddress.street,
                      partyAddress.city,
                      partyAddress.state,
                      partyAddress.postalCode,
                      partyAddress.country
                    ].filter(Boolean).join(', ')}
                  </Text>
                )}
              </>
            ) : (
              /* No Contact Info - Just Party */
              <>
                <View style={styles.labelOnly}>
                  <Text style={styles.standAloneLabel}>Billed To:</Text>
                </View>
                <Text style={styles.entityName}>{partyName}</Text>
              </>
            )}
          </View>

          <View style={styles.dateInfo}>
            <Text style={styles.dateLabel}>Invoice Date</Text>
            <Text style={styles.dateValue}>{formatDisplayDate(bill.invoiceDate)}</Text>
          </View>
        </View>

        <View style={styles.content}>
          <View style={commonStyles.table}>
            <View style={commonStyles.tableHeader}>
              <Text style={[commonStyles.tableHeaderText, styles.descCol]}>Description</Text>
              <Text style={[commonStyles.tableHeaderText, styles.qtyCol]}>Qty</Text>
              <Text style={[commonStyles.tableHeaderText, styles.rateCol]}>Rate</Text>
              <Text style={[commonStyles.tableHeaderText, styles.totalCol]}>Total</Text>
            </View>
            {bill.items.map((item, index) => (
              <View style={commonStyles.tableRow} key={index}>
                <Text style={[commonStyles.tableCell, styles.descCol]}>{item.description}</Text>
                <Text style={[commonStyles.tableCell, styles.qtyCol]}>{item.quantity}</Text>
                <Text style={[commonStyles.tableCell, styles.rateCol]}>{formatCurrency(item.rate || 0)}</Text>
                <Text style={[commonStyles.tableCell, styles.totalCol]}>{formatCurrency(item.total || 0)}</Text>
              </View>
            ))}
          </View>

          <View style={styles.summaryContainer}>
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

            <View style={styles.amountInWordsBox}>
              <View style={{ marginBottom: 8 }}>
                <Text style={styles.amountWordsLabel}>The Sum of:</Text>
                <Text style={styles.amountWordsText}>
                  Dhirhams {numberToWords(grandTotal)} Only
                </Text>
              </View>
              {vatAmount > 0 && (
                <View>
                  <Text style={styles.amountWordsLabel}>VAT Amount:</Text>
                  <Text style={styles.amountWordsText}>
                    Dhirhams {numberToWords(vatAmount)} Only
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.bottomSection}>
              {companyDetails?.bankDetails && (
                <View style={styles.bankBox}>
                  <Text style={styles.boxTitle}>Bank Details</Text>
                  <Text style={styles.boxContent}>{companyDetails.bankDetails}</Text>
                </View>
              )}
              <View style={styles.termsBox}>
                <Text style={styles.boxTitle}>Terms & Conditions</Text>
                <View style={styles.validityItem}>
                  <Text style={styles.bulletPoint}>•</Text>
                  <Text style={styles.boxContent}>These examples are for illustrative purposes only.</Text>
                </View>
                <View style={styles.validityItem}>
                  <Text style={styles.bulletPoint}>•</Text>
                  <Text style={styles.boxContent}>Consulting a legal professional is recommended.</Text>
                </View>
                <View style={styles.validityItem}>
                  <Text style={styles.bulletPoint}>•</Text>
                  <Text style={styles.boxContent}>Terms should remain clear and transparent.</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        <PDFFooter companyDetails={companyDetails} />
      </Page>
    </Document>
  );
};