import React from 'react';
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';
import type { IDeliveryNote } from '@/models/DeliveryNote';
import type { ICompanyDetails } from '@/models/CompanyDetails';
import { formatCurrency } from '@/utils/formatters/currency';
import { formatDisplayDate } from '@/utils/formatters/date';

// Shared Components
import { commonStyles, registerPdfFonts, pdfColors } from './pdf/styles';
import { PDFHeader } from './pdf/Header';
import { PDFFooter } from './pdf/Footer';
import { TruckIcon } from './pdf/Icons';

const styles = StyleSheet.create({
  content: { padding: '15 25', flexGrow: 1 },
  
  // Column Widths (Standardized)
  colDesc: { width: '40%' },
  colQty: { width: '20%', textAlign: 'center' },
  colRate: { width: '20%', textAlign: 'right' },
  colTotal: { width: '20%', textAlign: 'right', fontWeight: 'bold' },

  customerName: { fontSize: 11, fontWeight: 'bold', color: pdfColors.textMain, marginBottom: 2 },
  customerDetail: { fontSize: 8, color: pdfColors.textDark, marginBottom: 1 },
  dateSection: { alignItems: 'flex-end' },
  dateLabel: { fontSize: 7, color: pdfColors.textMuted, marginBottom: 2 },
  dateValue: { fontSize: 10, fontWeight: 'bold', color: pdfColors.primary },

  // Layout for Bottom Section
  bottomContainer: {
    marginTop: 20,
    flexDirection: 'row',
    gap: 15,
  },

  // Terms Box
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
  boxContent: {
    fontSize: 8,
    color: pdfColors.textDark,
    lineHeight: 1.4,
  },

  // Notes Box (Right side if terms exist, or full width)
  notesBox: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    border: `1 solid ${pdfColors.border}`,
    borderRadius: 4,
    padding: 10,
  },
  notesTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: pdfColors.primary,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  notesText: {
    fontSize: 8.5,
    color: pdfColors.textDark,
    lineHeight: 1.4,
  },

  // Signature Section (Sticky Bottom)
  signatureSection: {
    position: 'absolute',
    bottom: 80,
    left: 25,
    right: 25,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 15,
  },
  signatureBox: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    border: `1.5 solid ${pdfColors.primary}`,
    borderRadius: 4,
    height: 80,
    padding: 10,
    flexDirection: 'column',
    justifyContent: 'flex-end',
  },
  signatureLabel: {
    fontSize: 7,
    color: pdfColors.primary,
    fontWeight: 'bold',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
});

interface DeliveryNoteProps {
  bill: IDeliveryNote;
  companyDetails: ICompanyDetails | null;
}

export const DeliveryNoteDocument: React.FC<DeliveryNoteProps> = ({ bill, companyDetails }) => {
  registerPdfFonts();

  const invoiceIds = bill.connectedDocuments?.invoiceIds;
  const firstInvoice = (Array.isArray(invoiceIds) && invoiceIds.length > 0) ? invoiceIds[0] : null;
  const invoiceNumber = (typeof firstInvoice === 'object' && firstInvoice !== null && 'invoiceNumber' in firstInvoice)
    ? (firstInvoice as any).invoiceNumber
    : null;

  return (
    <Document>
      <Page size="A4" style={commonStyles.page}>
        <Text style={commonStyles.watermark}>DELIVERY</Text>

        <PDFHeader companyDetails={companyDetails} />

        <View style={commonStyles.titleSection}>
          <View style={commonStyles.documentTitle}>
            <TruckIcon />
            <Text>DELIVERY NOTE</Text>
          </View>
          <Text style={commonStyles.documentNumber}>{bill.invoiceNumber}</Text>
        </View>

        <View style={commonStyles.infoBar}>
          <View style={{ flex: 1 }}>
            <Text style={commonStyles.sectionLabel}>Delivered To:</Text>
            <Text style={styles.customerName}>{bill.customerName}</Text>
            {bill.customerPhone && <Text style={styles.customerDetail}>{bill.customerPhone}</Text>}
            {bill.customerEmail && <Text style={styles.customerDetail}>{bill.customerEmail}</Text>}
          </View>
          <View style={styles.dateSection}>
            <Text style={styles.dateLabel}>Delivery Date</Text>
            <Text style={styles.dateValue}>{formatDisplayDate(bill.deliveryDate)}</Text>
            {invoiceNumber && (
              <>
                <Text style={[styles.dateLabel, { marginTop: 8 }]}>Against Invoice</Text>
                <Text style={styles.dateValue}>{invoiceNumber}</Text>
              </>
            )}
          </View>
        </View>

        <View style={styles.content}>
          <View style={commonStyles.table}>
            <View style={commonStyles.tableHeader}>
              <Text style={[commonStyles.tableHeaderText, styles.colDesc]}>Description</Text>
              <Text style={[commonStyles.tableHeaderText, styles.colQty]}>Quantity</Text>
              <Text style={[commonStyles.tableHeaderText, styles.colRate]}>Rate</Text>
              <Text style={[commonStyles.tableHeaderText, styles.colTotal]}>Total</Text>
            </View>
            {bill.items.map((item, index) => (
              <View style={commonStyles.tableRow} key={index}>
                <Text style={[commonStyles.tableCell, styles.colDesc]}>{item.description}</Text>
                <Text style={[commonStyles.tableCell, styles.colQty]}>{item.quantity}</Text>
                <Text style={[commonStyles.tableCell, styles.colRate]}>{formatCurrency(item.rate || 0)}</Text>
                <Text style={[commonStyles.tableCell, styles.colTotal]}>{formatCurrency(item.total || 0)}</Text>
              </View>
            ))}
          </View>

          {/* Bottom Section: Terms & Notes */}
          <View style={styles.bottomContainer}>
            <View style={styles.termsBox}>
              <Text style={styles.boxTitle}>Terms & Conditions</Text>
              <Text style={styles.boxContent}>
                • Received the above goods in good order and condition.{'\n'}
                • Please report any discrepancies within 24 hours of receipt.{'\n'}
                • Goods remain the property of the seller until paid in full.
              </Text>
            </View>

            {bill.notes ? (
              <View style={styles.notesBox}>
                <Text style={styles.notesTitle}>Delivery Notes</Text>
                <Text style={styles.notesText}>{bill.notes}</Text>
              </View>
            ) : (
              <View style={{ flex: 1 }} />
            )}
          </View>
        </View>

        <View style={styles.signatureSection}>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLabel}>Received By{'\n'}(Name, Signature & Date)</Text>
          </View>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLabel}>Delivered By{'\n'}(Name, Signature & Date)</Text>
          </View>
        </View>

        <PDFFooter companyDetails={companyDetails} />
      </Page>
    </Document>
  );
};