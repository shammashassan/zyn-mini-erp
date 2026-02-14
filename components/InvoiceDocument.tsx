// components/InvoiceDocument.tsx - FINAL: Using party snapshots for PDF generation

import React from 'react';
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';
import type { IInvoice } from '@/models/Invoice';
import type { ICompanyDetails } from '@/models/CompanyDetails';
import { numberToWords } from '@/lib/numberToWords';
import { UAE_VAT_PERCENTAGE } from '@/utils/constants';
import { formatCurrency } from '@/utils/formatters/currency';
import { formatDisplayDate } from '@/utils/formatters/date';

import { commonStyles, registerPdfFonts, pdfColors } from './pdf/styles';
import { PDFHeader } from './pdf/Header';
import { PDFFooter } from './pdf/Footer';

const styles = StyleSheet.create({
  content: { padding: '15 25 25 25', flexGrow: 1 },
  descCol: { width: '40%' },
  qtyCol: { width: '15%', textAlign: 'center' },
  rateCol: { width: '20%', textAlign: 'right' },
  totalCol: { width: '25%', textAlign: 'right', fontWeight: 'bold' },

  entityName: { fontSize: 11, fontWeight: 'bold', color: pdfColors.textMain, marginBottom: 2 },
  entityDetail: { fontSize: 8, color: pdfColors.textDark, marginBottom: 1 },
  labelRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 2 },
  inlineLabel: { fontSize: 9, color: pdfColors.primary, marginRight: 6, fontWeight: 'bold' },
  labelOnly: { marginBottom: 4 },
  standAloneLabel: { fontSize: 9, color: pdfColors.primary, fontWeight: 'bold' },
  dateInfo: { alignItems: 'flex-end' },
  dateLabel: { fontSize: 7, color: pdfColors.textMuted, marginBottom: 2 },
  dateValue: { fontSize: 10, fontWeight: 'bold', color: pdfColors.primary },

  unifiedBox: {
    position: 'absolute',
    bottom: 80,
    left: 25,
    right: 25,
    backgroundColor: pdfColors.white,
    border: `1.5 solid ${pdfColors.primary}`,
    borderRadius: 4,
    overflow: 'hidden',
  },

  termsRow: {
    padding: 10,
    borderBottomWidth: 1.5,
    borderBottomColor: pdfColors.primary,
  },
  sectionTitle: {
    fontSize: 8,
    fontWeight: 'bold',
    color: pdfColors.primary,
    marginBottom: 5,
    textTransform: 'uppercase',
  },
  termsText: {
    fontSize: 7.5,
    color: pdfColors.textDark,
    lineHeight: 1.3,
  },

  row2: {
    flexDirection: 'row',
    borderBottomWidth: 1.5,
    borderBottomColor: pdfColors.primary,
  },
  bankSection: {
    flex: 1,
    padding: 10,
    borderRightWidth: 1.5,
    borderRightColor: pdfColors.primary,
  },
  bankText: {
    fontSize: 7.5,
    color: pdfColors.textDark,
    lineHeight: 1.3,
  },
  amountSummarySection: {
    width: '35%',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: '5 10',
    borderBottomWidth: 0.5,
    borderBottomColor: pdfColors.border,
  },
  summaryLabel: { fontSize: 8, color: pdfColors.textDark },
  summaryValue: { fontSize: 8, color: pdfColors.textDark, fontWeight: 'bold' },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: '6 10',
    backgroundColor: pdfColors.primary,
  },
  grandTotalLabel: { fontSize: 9, fontWeight: 'bold', color: pdfColors.white },
  grandTotalValue: { fontSize: 10, fontWeight: 'bold', color: pdfColors.accent },

  amountWordsRow: {
    padding: 10,
    borderBottomWidth: 1.5,
    borderBottomColor: pdfColors.primary,
    flexDirection: 'row',
    alignItems: 'center',
  },
  amountWordsLabel: {
    fontSize: 7.5,
    color: pdfColors.primary,
    fontWeight: 'bold',
    marginRight: 5,
  },
  amountWordsText: {
    fontSize: 7.5,
    color: pdfColors.textDark,
    fontWeight: 'bold',
    flex: 1,
  },

  signatureRow: {
    flexDirection: 'row',
    height: 50,
  },
  signatureCell: {
    flex: 1,
    padding: 8,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  signatureDivider: {
    width: 1.5,
    backgroundColor: pdfColors.primary,
  },
  signatureLabel: {
    fontSize: 7,
    color: pdfColors.primary,
    fontWeight: 'bold',
    textAlign: 'center',
  },
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

  const partyName = bill.partySnapshot.displayName;
  const partyAddress = bill.partySnapshot.address;
  const contactName = bill.contactSnapshot?.name;
  const contactPhone = bill.contactSnapshot?.phone;
  const contactEmail = bill.contactSnapshot?.email;
  const contactDesignation = bill.contactSnapshot?.designation;

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
                    {[partyAddress.street, partyAddress.city, partyAddress.state, partyAddress.postalCode, partyAddress.country].filter(Boolean).join(', ')}
                  </Text>
                )}
              </>
            ) : (
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
        </View>

        {/* Unified Bottom Box */}
        <View style={styles.unifiedBox}>
          {/* Row 1: Terms & Conditions */}
          <View style={styles.termsRow}>
            <Text style={styles.sectionTitle}>Terms and Conditions</Text>
            <Text style={styles.termsText}>
              • These examples are for illustrative purposes only{'\n'}
              • Consulting a legal professional is recommended{'\n'}
              • Terms should remain clear and transparent
            </Text>
          </View>

          {/* Row 2: Bank Details | Amount Summary */}
          <View style={styles.row2}>
            {companyDetails?.bankDetails ? (
              <View style={styles.bankSection}>
                <Text style={styles.sectionTitle}>Bank Details</Text>
                <Text style={styles.bankText}>{companyDetails.bankDetails}</Text>
              </View>
            ) : (
              <View style={[styles.bankSection, { justifyContent: 'center' }]}>
                <Text style={[styles.sectionTitle, { marginBottom: 0, textAlign: 'center' }]}>
                  {companyDetails?.companyName || 'Company Name'}
                </Text>
              </View>
            )}
            <View style={styles.amountSummarySection}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Gross Total</Text>
                <Text style={styles.summaryValue}>{formatCurrency(grossTotal)}</Text>
              </View>
              {discount > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Discount</Text>
                  <Text style={styles.summaryValue}>{formatCurrency(discount)}</Text>
                </View>
              )}
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal</Text>
                <Text style={styles.summaryValue}>{formatCurrency(subtotal)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Vat</Text>
                <Text style={styles.summaryValue}>{formatCurrency(vatAmount)}</Text>
              </View>
              <View style={styles.grandTotalRow}>
                <Text style={styles.grandTotalLabel}>Grandtotal</Text>
                <Text style={styles.grandTotalValue}>{formatCurrency(grandTotal)}</Text>
              </View>
            </View>
          </View>

          {/* Row 3: Amount in Words */}
          <View style={styles.amountWordsRow}>
            <Text style={styles.amountWordsLabel}>Amount Chargeable in words :</Text>
            <Text style={styles.amountWordsText}>{numberToWords(grandTotal)}</Text>
          </View>

          {/* Row 4: VAT in Words */}
          <View style={styles.amountWordsRow}>
            <Text style={styles.amountWordsLabel}>VAT Chargeable in words :</Text>
            <Text style={styles.amountWordsText}>{numberToWords(vatAmount)}</Text>
          </View>

          {/* Row 5: Signature */}
          <View style={styles.signatureRow}>
            <View style={styles.signatureCell}>
              <Text style={styles.signatureLabel}>Customer Signature</Text>
            </View>
            <View style={styles.signatureDivider} />
            <View style={styles.signatureCell}>
              <Text style={styles.signatureLabel}>For {companyDetails?.companyName || 'Company'}</Text>
            </View>
          </View>
        </View>

        <PDFFooter companyDetails={companyDetails} />
      </Page>
    </Document>
  );
};