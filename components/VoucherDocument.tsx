import React from 'react';
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';
import type { IVoucher } from '@/models/Voucher';
import type { ICompanyDetails } from '@/models/CompanyDetails';
import { numberToWords } from '@/lib/numberToWords';
import { formatCurrency } from '@/utils/formatters/currency';
import { formatDisplayDate } from '@/utils/formatters/date';

import { commonStyles, registerPdfFonts, pdfColors } from './pdf/styles';
import { PDFHeader } from './pdf/Header';
import { PDFFooter } from './pdf/Footer';

const styles = StyleSheet.create({
  // Specific Overrides for A5 Landscape
  page: {
    fontFamily: 'Roboto', fontSize: 8, padding: 0, backgroundColor: '#ffffff', position: 'relative', flexDirection: 'column',
  },
  watermark: {
    position: 'absolute', top: '40%', left: '25%', fontSize: 60, color: '#f0f0f0', opacity: 0.06, transform: 'rotate(-45deg)', fontWeight: 'bold',
  },
  
  titleSection: {
    backgroundColor: pdfColors.primaryDark, padding: '7 15', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  voucherTitle: { fontSize: 12, fontWeight: 'bold', color: pdfColors.white, letterSpacing: 1.5 },
  voucherNumber: { fontSize: 11, fontWeight: 'bold', color: pdfColors.accent },

  infoBar: {
    backgroundColor: '#f5f5f5', padding: '6 15', flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1.5, borderBottomColor: pdfColors.primary,
  },
  infoItem: { flexDirection: 'row', alignItems: 'center' },
  infoLabel: { fontSize: 7, color: '#666666', marginRight: 3, fontWeight: 'bold' },
  infoValue: { fontSize: 7, color: '#000000', fontWeight: 'bold' },

  content: { padding: '10 15 30 15', flexGrow: 1, display: 'flex', flexDirection: 'column' },

  amountBox: {
    backgroundColor: pdfColors.secondary, border: `1.5 solid ${pdfColors.primary}`, borderRadius: 4, padding: '15 12',
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8,
  },
  amountWordsSection: { flex: 1, marginRight: 15, justifyContent: 'center' },
  amountValueSection: { alignItems: 'flex-end', justifyContent: 'center', minWidth: '30%', borderLeftWidth: 1, borderLeftColor: '#c5cae9', paddingLeft: 12 },
  amountLabel: { fontSize: 6.5, color: pdfColors.primary, fontWeight: 'bold', marginBottom: 3, textTransform: 'uppercase' },
  amountWords: { fontSize: 7.5, color: pdfColors.textDark, backgroundColor: pdfColors.white, padding: '5 8', borderRadius: 3, border: `0.5 solid ${pdfColors.border}` },
  amountValue: { fontSize: 18, fontWeight: 'bold', color: pdfColors.primary },

  table: { marginBottom: 12 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#e0e0e0', paddingVertical: 5 },
  tableLabel: { width: '25%', fontSize: 7, color: pdfColors.primary, fontWeight: 'bold' },
  tableValue: { flex: 1, fontSize: 7.5, color: '#000000' },

  itemsSection: { marginBottom: 6 },
  sectionTitle: { fontSize: 8, fontWeight: 'bold', color: pdfColors.primary, marginBottom: 4, paddingBottom: 2, borderBottomWidth: 1.5, borderBottomColor: pdfColors.primary },
  itemsHeader: { flexDirection: 'row', paddingVertical: 4, backgroundColor: '#f5f5f5', borderBottomWidth: 1, borderBottomColor: pdfColors.primary, fontWeight: 'bold' },
  itemRow: { flexDirection: 'row', paddingVertical: 4, borderBottomWidth: 0.5, borderBottomColor: '#f0f0f0' },
  itemDesc: { flex: 1, fontSize: 7, color: pdfColors.textDark },
  itemQty: { width: '12%', fontSize: 7, color: pdfColors.textDark, textAlign: 'center' },
  itemRate: { width: '15%', fontSize: 7, color: pdfColors.textDark, textAlign: 'right' },
  itemAmount: { width: '15%', fontSize: 7, color: pdfColors.textDark, textAlign: 'right', fontWeight: 'bold' },
});

interface VoucherDocumentProps {
  bill: IVoucher;
  companyDetails: ICompanyDetails | null;
}

export const VoucherDocument: React.FC<VoucherDocumentProps> = ({ bill, companyDetails }) => {
  registerPdfFonts();
  
  const type = bill.voucherType || (bill as any).documentType;
  const isReceipt = type === 'receipt';
  const voucherTitle = isReceipt ? 'RECEIPT VOUCHER' : 'PAYMENT VOUCHER';
  const partyLabel = isReceipt ? 'Received From' : 'Paid To';
  
  let partyName = '';
  if (isReceipt) {
    partyName = bill.customerName || bill.supplierName || bill.payeeName || (bill as any).vendorName || '';
  } else {
    partyName = bill.supplierName || bill.payeeName || (bill as any).vendorName || bill.customerName || '';
  }

  const connectedInvoiceIds = bill.connectedDocuments?.invoiceIds || [];
  const connectedInvoicesDisplay = connectedInvoiceIds.map((inv: any) => (typeof inv === 'object' && inv?.invoiceNumber) ? inv.invoiceNumber : inv).join(', ');

  const connectedPurchaseIds = bill.connectedDocuments?.purchaseIds || [];
  const connectedPurchasesDisplay = connectedPurchaseIds.map((purch: any) => (typeof purch === 'object' && purch?.referenceNumber) ? purch.referenceNumber : purch).join(', ');

  const connectedExpenseIds = bill.connectedDocuments?.expenseIds || [];
  const connectedExpensesDisplay = connectedExpenseIds.map((exp: any) => (typeof exp === 'object' && exp?.referenceNumber) ? exp.referenceNumber : exp).join(', ');

  const connectedCreditNoteIds = bill.connectedDocuments?.creditNoteIds || [];
  const connectedCreditNotesDisplay = connectedCreditNoteIds.map((cn: any) => (typeof cn === 'object' && cn?.creditNoteNumber) ? cn.creditNoteNumber : null).filter(Boolean).join(', ');

  const connectedDebitNoteIds = bill.connectedDocuments?.debitNoteIds || [];
  const connectedDebitNotesDisplay = connectedDebitNoteIds.map((dn: any) => (typeof dn === 'object' && dn?.debitNoteNumber) ? dn.debitNoteNumber : null).filter(Boolean).join(', ');

  const amount = bill.grandTotal || bill.totalAmount || 0;

  return (
    <Document>
      <Page size="A5" orientation="landscape" style={styles.page}>
        <Text style={styles.watermark}>{isReceipt ? 'RECEIPT' : 'PAYMENT'}</Text>

        {/* Custom padding for A5 */}
        <PDFHeader companyDetails={companyDetails} style={{ padding: '12 20' }} />

        <View style={styles.titleSection}>
          <Text style={styles.voucherTitle}>{voucherTitle}</Text>
          <Text style={styles.voucherNumber}>{bill.invoiceNumber}</Text>
        </View>

        <View style={styles.infoBar}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>DATE:</Text>
            <Text style={styles.infoValue}>{formatDisplayDate(bill.voucherDate)}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>METHOD:</Text>
            <Text style={styles.infoValue}>{bill.paymentMethod}</Text>
          </View>
        </View>

        <View style={styles.content}>
          <View>
            <View style={styles.table}>
              <View style={styles.tableRow}>
                <Text style={styles.tableLabel}>{partyLabel}</Text>
                <Text style={styles.tableValue}>{partyName || 'Walk-in Customer'}</Text>
              </View>
              {connectedInvoiceIds.length > 0 && (
                <View style={styles.tableRow}><Text style={styles.tableLabel}>Agst Invoice(s)</Text><Text style={styles.tableValue}>{connectedInvoicesDisplay}</Text></View>
              )}
              {connectedPurchaseIds.length > 0 && (
                <View style={styles.tableRow}><Text style={styles.tableLabel}>Agst Purchase(s)</Text><Text style={styles.tableValue}>{connectedPurchasesDisplay}</Text></View>
              )}
              {connectedExpenseIds.length > 0 && (
                <View style={styles.tableRow}><Text style={styles.tableLabel}>Agst Expense(s)</Text><Text style={styles.tableValue}>{connectedExpensesDisplay}</Text></View>
              )}
              {connectedCreditNoteIds.length > 0 && connectedCreditNotesDisplay && (
                <View style={styles.tableRow}><Text style={styles.tableLabel}>Agst Credit Note(s)</Text><Text style={styles.tableValue}>{connectedCreditNotesDisplay}</Text></View>
              )}
              {connectedDebitNoteIds.length > 0 && connectedDebitNotesDisplay && (
                <View style={styles.tableRow}><Text style={styles.tableLabel}>Agst Debit Note(s)</Text><Text style={styles.tableValue}>{connectedDebitNotesDisplay}</Text></View>
              )}
              {bill.notes && (
                <View style={styles.tableRow}><Text style={styles.tableLabel}>Remarks</Text><Text style={styles.tableValue}>{bill.notes}</Text></View>
              )}
            </View>

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

          <View style={{ flex: 1 }} />

          <View style={styles.amountBox}>
            <View style={styles.amountWordsSection}>
              <Text style={styles.amountLabel}>The Sum of:</Text>
              <Text style={styles.amountWords}>{numberToWords(amount)} Dirhams Only</Text>
            </View>
            <View style={styles.amountValueSection}>
              <Text style={styles.amountValue}>{formatCurrency(amount)}</Text>
            </View>
          </View>
        </View>

        <PDFFooter companyDetails={companyDetails} style={{ padding: '8 20' }} />
      </Page>
    </Document>
  );
};