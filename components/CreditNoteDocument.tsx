import React from 'react';
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';
import type { ICreditNote } from '@/models/CreditNote';
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

  customerName: {
    fontSize: 11, fontWeight: 'bold', color: pdfColors.textMain, marginBottom: 2,
  },
  partyDetail: { fontSize: 8, color: pdfColors.textDark, marginBottom: 1 },
  dateInfo: { alignItems: 'flex-end' },
  dateLabel: { fontSize: 7, color: pdfColors.textMuted, marginBottom: 2 },
  dateValue: { fontSize: 10, fontWeight: 'bold', color: pdfColors.primary },

  reasonBox: {
    backgroundColor: pdfColors.secondary,
    border: `1.5 solid ${pdfColors.primary}`,
    borderRadius: 4,
    padding: 10,
    marginBottom: 15,
  },
  reasonLabel: { fontSize: 8, color: pdfColors.primary, fontWeight: 'bold', marginBottom: 4, textTransform: 'uppercase' },
  reasonText: { fontSize: 8.5, color: pdfColors.textDark, lineHeight: 1.4 },

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
    flexDirection: 'row', justifyContent: 'space-between', padding: '6 10', borderBottomWidth: 0.5, borderBottomColor: pdfColors.border,
  },
  grandTotalRow: {
    backgroundColor: pdfColors.primary, padding: '8 10', borderBottomWidth: 0, flexDirection: 'row', justifyContent: 'space-between',
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
  amountWordsRow: { marginBottom: 8 },
  amountWordsLabel: { fontSize: 7, color: pdfColors.primary, fontWeight: 'bold', marginBottom: 3, textTransform: 'uppercase' },
  amountWordsText: {
    fontSize: 8, color: pdfColors.textDark, backgroundColor: pdfColors.white, padding: '5 8', borderRadius: 3, border: `0.5 solid ${pdfColors.border}`,
  },

  bottomSection: { flexDirection: 'row', gap: 15, marginBottom: 10 },
  bankBox: { flex: 1, backgroundColor: '#f5f5f5', border: `1 solid ${pdfColors.border}`, borderRadius: 4, padding: 10 },
  termsBox: { flex: 1, backgroundColor: pdfColors.warning, border: `1 solid ${pdfColors.warningBorder}`, borderRadius: 4, padding: 10 },
  boxTitle: { fontSize: 9, fontWeight: 'bold', color: pdfColors.primary, marginBottom: 6, textTransform: 'uppercase' },
  boxContent: { fontSize: 8, color: pdfColors.textDark, lineHeight: 1.4 },

  notesBox: {
    backgroundColor: pdfColors.warning, border: `1 solid ${pdfColors.warningBorder}`, borderRadius: 4, padding: 10, marginBottom: 10,
  },
  notesTitle: { fontSize: 9, fontWeight: 'bold', color: pdfColors.primary, marginBottom: 6, textTransform: 'uppercase' },
  notesContent: { fontSize: 8, color: pdfColors.textDark, lineHeight: 1.4 },
});

interface PopulatedReturnNote { _id: string; returnNumber: string; }

interface CreditNoteDocumentProps {
  creditNote: ICreditNote & {
    customerPhone?: string;
    customerEmail?: string;
    supplierPhone?: string;
    supplierEmail?: string;
    payeePhone?: string;
    payeeEmail?: string;
    connectedDocuments?: {
      returnNoteId?: PopulatedReturnNote | string;
    };
  };
  companyDetails: ICompanyDetails | null;
}

export const CreditNoteDocument: React.FC<CreditNoteDocumentProps> = ({ creditNote, companyDetails }) => {
  registerPdfFonts();

  // Extract connected return note info
  const returnNote = typeof creditNote.connectedDocuments?.returnNoteId === 'object'
    ? creditNote.connectedDocuments.returnNoteId as PopulatedReturnNote
    : null;

  const returnNoteNumber = returnNote?.returnNumber;

  const grossTotal = creditNote.totalAmount || 0;
  const vatAmount = creditNote.vatAmount || 0;
  const subtotal = grossTotal - creditNote.discount;
  const discount = creditNote.discount || 0;
  const grandTotal = creditNote.grandTotal || 0;

  const partyName = creditNote.customerName || creditNote.supplierName || creditNote.payeeName || creditNote.vendorName;
  let partyLabel = "Customer";
  if (creditNote.supplierName) partyLabel = "Supplier";
  if (creditNote.payeeName) partyLabel = "Payee";
  if (creditNote.vendorName) partyLabel = "Vendor";


  const isManualEntry = creditNote.items?.length === 1 && !creditNote.items[0].productId;

  return (
    <Document>
      <Page size="A4" style={commonStyles.page}>
        <Text style={commonStyles.watermark}>CREDIT NOTE</Text>

        <PDFHeader companyDetails={companyDetails} />

        <View style={commonStyles.titleSection}>
          <Text style={commonStyles.documentTitle}>CREDIT NOTE</Text>
          <Text style={commonStyles.documentNumber}>{creditNote.creditNoteNumber}</Text>
        </View>

        <View style={commonStyles.infoBar}>
          <View style={{ flex: 1 }}>
            <Text style={commonStyles.sectionLabel}>{partyLabel}:</Text>
            <Text style={styles.customerName}>{partyName}</Text>
            {creditNote.customerName && creditNote.customerPhone && <Text style={styles.partyDetail}>{creditNote.customerPhone}</Text>}
            {creditNote.customerName && creditNote.customerEmail && <Text style={styles.partyDetail}>{creditNote.customerEmail}</Text>}
            {creditNote.supplierName && creditNote.supplierPhone && <Text style={styles.partyDetail}>{creditNote.supplierPhone}</Text>}
            {creditNote.supplierName && creditNote.supplierEmail && <Text style={styles.partyDetail}>{creditNote.supplierEmail}</Text>}
            {creditNote.payeeName && creditNote.payeePhone && <Text style={styles.partyDetail}>{creditNote.payeePhone}</Text>}
            {creditNote.payeeName && creditNote.payeeEmail && <Text style={styles.partyDetail}>{creditNote.payeeEmail}</Text>}
          </View>
          <View style={styles.dateInfo}>
            <Text style={styles.dateLabel}>Credit Note Date</Text>
            <Text style={styles.dateValue}>{formatDisplayDate(creditNote.creditDate)}</Text>
            {returnNoteNumber && (
              <>
                <Text style={[styles.dateLabel, { marginTop: 8 }]}>Against Sales Return</Text>
                <Text style={styles.dateValue}>{returnNoteNumber}</Text>
              </>
            )}
          </View>
        </View>

        <View style={styles.content}>

          {(creditNote.reason || isManualEntry) && (
            <View style={styles.reasonBox}>
              {isManualEntry && (
                <View style={{ marginBottom: creditNote.reason ? 10 : 0 }}>
                  <Text style={styles.reasonLabel}>Description:</Text>
                  <Text style={styles.reasonText}>{creditNote.items[0].description}</Text>
                </View>
              )}
              {creditNote.reason && (
                <View>
                  <Text style={styles.reasonLabel}>Reason:</Text>
                  <Text style={styles.reasonText}>{creditNote.reason}</Text>
                </View>
              )}
            </View>
          )}

          {!isManualEntry && creditNote.items && creditNote.items.length > 0 && (
            <View style={commonStyles.table}>
              <View style={commonStyles.tableHeader}>
                <Text style={[commonStyles.tableHeaderText, styles.descCol]}>Product</Text>
                <Text style={[commonStyles.tableHeaderText, styles.qtyCol]}>Qty</Text>
                <Text style={[commonStyles.tableHeaderText, styles.rateCol]}>Unit Price</Text>
                <Text style={[commonStyles.tableHeaderText, styles.totalCol]}>Total</Text>
              </View>
              {creditNote.items.map((item, index) => (
                <View style={commonStyles.tableRow} key={index}>
                  <Text style={[commonStyles.tableCell, styles.descCol]}>{item.description}</Text>
                  <Text style={[commonStyles.tableCell, styles.qtyCol]}>{item.quantity}</Text>
                  <Text style={[commonStyles.tableCell, styles.rateCol]}>{formatCurrency(item.price || 0)}</Text>
                  <Text style={[commonStyles.tableCell, styles.totalCol]}>{formatCurrency(item.total || 0)}</Text>
                </View>
              ))}
            </View>
          )}

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
              <View style={styles.amountWordsRow}>
                <Text style={styles.amountWordsLabel}>Amount in Words:</Text>
                <Text style={styles.amountWordsText}>Rupees {numberToWords(grandTotal)} Only</Text>
              </View>
              {vatAmount > 0 && (
                <View style={styles.amountWordsRow}>
                  <Text style={styles.amountWordsLabel}>VAT Amount:</Text>
                  <Text style={styles.amountWordsText}>Rupees {numberToWords(vatAmount)} Only</Text>
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
                <Text style={styles.boxContent}>
                  • These examples are for illustrative purposes only.{'\n'}
                  • Consulting a legal professional is recommended.{'\n'}
                  • Terms should remain clear, concise, and transparent.
                </Text>
              </View>
            </View>

            {creditNote.notes && (
              <View style={styles.notesBox}>
                <Text style={styles.notesTitle}>Additional Notes</Text>
                <Text style={styles.notesContent}>{creditNote.notes}</Text>
              </View>
            )}
          </View>
        </View>

        <PDFFooter companyDetails={companyDetails} />
      </Page>
    </Document>
  );
};