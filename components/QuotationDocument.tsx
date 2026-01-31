import React from 'react';
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';
import type { IQuotation } from '@/models/Quotation';
import type { ICompanyDetails } from '@/models/CompanyDetails';
import { numberToWords } from '@/lib/numberToWords';
import { UAE_VAT_PERCENTAGE } from '@/utils/constants';
import { formatCurrency } from '@/utils/formatters/currency';
import { formatDisplayDate } from '@/utils/formatters/date';

import { commonStyles, registerPdfFonts, pdfColors } from './pdf/styles';
import { PDFHeader } from './pdf/Header';
import { PDFFooter } from './pdf/Footer';
import { FileTextIcon } from './pdf/Icons';

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

  // New Styles for label-only layout
  labelOnly: { marginBottom: 4 },
  standAloneLabel: { fontSize: 9, color: pdfColors.primary, fontWeight: 'bold' },

  dateInfo: { alignItems: 'flex-end' },
  dateLabel: { fontSize: 7, color: pdfColors.textMuted, marginBottom: 2 },
  dateValue: { fontSize: 10, fontWeight: 'bold', color: pdfColors.primary },

  summaryContainer: { marginTop: 20 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 15, marginBottom: 15 },

  notesBox: {
    width: '55%',
    backgroundColor: pdfColors.warning,
    border: `1 solid ${pdfColors.warningBorder}`,
    borderRadius: 4,
    padding: 10
  },
  boxTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: pdfColors.primary,
    marginBottom: 6,
    textTransform: 'uppercase'
  },
  boxContent: {
    fontSize: 8,
    color: pdfColors.textDark,
    lineHeight: 1.4
  },

  totalsBox: {
    width: '40%',
    backgroundColor: pdfColors.white,
    border: `1.5 solid ${pdfColors.primary}`,
    borderRadius: 4,
    overflow: 'hidden'
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: '6 10',
    borderBottomWidth: 0.5,
    borderBottomColor: pdfColors.border
  },
  grandTotalRow: {
    backgroundColor: pdfColors.primary,
    padding: '8 10',
    borderBottomWidth: 0,
    flexDirection: 'row',
    justifyContent: 'space-between'
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
    marginBottom: 15
  },
  amountWordsLabel: {
    fontSize: 7,
    color: pdfColors.primary,
    fontWeight: 'bold',
    marginBottom: 3,
    textTransform: 'uppercase'
  },
  amountWordsText: {
    fontSize: 8,
    color: pdfColors.textDark,
    backgroundColor: pdfColors.white,
    padding: '5 8',
    borderRadius: 3,
    border: `0.5 solid ${pdfColors.border}`
  },

  bottomSection: { flexDirection: 'row', gap: 15, marginBottom: 10 },
  validityBox: {
    flex: 1,
    backgroundColor: '#e3f2fd',
    border: `1 solid ${pdfColors.stroke}`,
    borderRadius: 4,
    padding: 10
  },
  validityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 3
  },
  bulletPoint: {
    fontSize: 8,
    color: pdfColors.primary,
    marginRight: 5,
    fontWeight: 'bold'
  },
  termsBox: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    border: `1 solid ${pdfColors.border}`,
    borderRadius: 4,
    padding: 10
  },
});

interface QuotationDocumentProps {
  bill: IQuotation;
  companyDetails: ICompanyDetails | null;
}

export const QuotationDocument: React.FC<QuotationDocumentProps> = ({ bill, companyDetails }) => {
  registerPdfFonts();

  const grossTotal = bill.totalAmount || 0;
  const vatAmount = bill.vatAmount || 0;
  const subtotal = grossTotal - bill.discount;
  const discount = bill.discount || 0;
  const grandTotal = bill.grandTotal || 0;

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
        <Text style={commonStyles.watermark}>QUOTATION</Text>

        <PDFHeader companyDetails={companyDetails} />

        <View style={commonStyles.titleSection}>
          <View style={commonStyles.documentTitle}>
            <FileTextIcon />
            <Text>QUOTATION / PROPOSAL</Text>
          </View>
          <Text style={commonStyles.documentNumber}>{bill.invoiceNumber}</Text>
        </View>

        <View style={commonStyles.infoBar}>
          <View style={{ flex: 1 }}>
            {hasAdditionalInfo ? (
              /* Has Contact Info or Address */
              <>
                <View style={styles.labelRow}>
                  <Text style={styles.inlineLabel}>Quoted For:</Text>
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
              /* Only Party Name - No Additional Info */
              <>
                <View style={styles.labelOnly}>
                  <Text style={styles.standAloneLabel}>Quoted For:</Text>
                </View>
                <Text style={styles.entityName}>{partyName}</Text>
              </>
            )}
          </View>

          <View style={styles.dateInfo}>
            <Text style={styles.dateLabel}>Quotation Date</Text>
            <Text style={styles.dateValue}>{formatDisplayDate(bill.quotationDate)}</Text>
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
              {bill.notes ? (
                <View style={styles.notesBox}>
                  <Text style={styles.boxTitle}>Notes</Text>
                  <Text style={styles.boxContent}>{bill.notes}</Text>
                </View>
              ) : <View style={{ width: '55%' }} />}

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
              <View>
                <Text style={styles.amountWordsLabel}>The Sum of:</Text>
                <Text style={styles.amountWordsText}>Dirhams {numberToWords(grandTotal)} Only</Text>
              </View>
            </View>

            <View style={styles.bottomSection}>
              <View style={styles.validityBox}>
                <Text style={styles.boxTitle}>Validity & Terms</Text>
                <View style={styles.validityItem}>
                  <Text style={styles.bulletPoint}>•</Text>
                  <Text style={styles.boxContent}>Valid for 30 days from date</Text>
                </View>
                <View style={styles.validityItem}>
                  <Text style={styles.bulletPoint}>•</Text>
                  <Text style={styles.boxContent}>Payment: Net 30 days</Text>
                </View>
              </View>
              <View style={styles.termsBox}>
                <Text style={styles.boxTitle}>Important</Text>
                <View style={styles.validityItem}>
                  <Text style={styles.bulletPoint}>•</Text>
                  <Text style={styles.boxContent}>Illustrative purposes only.</Text>
                </View>
                <View style={styles.validityItem}>
                  <Text style={styles.bulletPoint}>•</Text>
                  <Text style={styles.boxContent}>Consult legal professional.</Text>
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