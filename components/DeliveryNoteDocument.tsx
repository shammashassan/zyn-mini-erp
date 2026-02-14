// components/DeliveryNoteDocument.tsx - FINAL: Using snapshots for PDF generation

import React from 'react';
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';
import type { IDeliveryNote } from '@/models/DeliveryNote';
import type { ICompanyDetails } from '@/models/CompanyDetails';
import { formatCurrency } from '@/utils/formatters/currency';
import { formatDisplayDate } from '@/utils/formatters/date';

import { commonStyles, registerPdfFonts, pdfColors } from './pdf/styles';
import { PDFHeader } from './pdf/Header';
import { PDFFooter } from './pdf/Footer';
import { TruckIcon } from './pdf/Icons';

const styles = StyleSheet.create({
  content: { padding: '15 25', flexGrow: 1 },

  colDesc: { width: '40%' },
  colQty: { width: '20%', textAlign: 'center' },
  colRate: { width: '20%', textAlign: 'right' },
  colTotal: { width: '20%', textAlign: 'right', fontWeight: 'bold' },

  entityName: { fontSize: 11, fontWeight: 'bold', color: pdfColors.textMain, marginBottom: 2 },
  entityDetail: { fontSize: 8, color: pdfColors.textDark, marginBottom: 1 },
  labelRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 2 },
  inlineLabel: { fontSize: 9, color: pdfColors.primary, marginRight: 6, fontWeight: 'bold' },
  labelOnly: { marginBottom: 4 },
  standAloneLabel: { fontSize: 9, color: pdfColors.primary, fontWeight: 'bold' },
  dateSection: { alignItems: 'flex-end' },
  dateLabel: { fontSize: 7, color: pdfColors.textMuted, marginBottom: 2 },
  dateValue: { fontSize: 10, fontWeight: 'bold', color: pdfColors.primary },

  // Unified Bottom Box
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

interface DeliveryNoteProps {
  bill: IDeliveryNote;
  companyDetails: ICompanyDetails | null;
}

export const DeliveryNoteDocument: React.FC<DeliveryNoteProps> = ({ bill, companyDetails }) => {
  registerPdfFonts();

  const partyName = bill.partySnapshot.displayName;
  const partyAddress = bill.partySnapshot.address;
  const contactName = bill.contactSnapshot?.name;
  const contactPhone = bill.contactSnapshot?.phone;
  const contactEmail = bill.contactSnapshot?.email;
  const contactDesignation = bill.contactSnapshot?.designation;

  const invoiceIds = bill.connectedDocuments?.invoiceIds;
  const firstInvoice = (Array.isArray(invoiceIds) && invoiceIds.length > 0) ? invoiceIds[0] : null;
  const invoiceNumber = (typeof firstInvoice === 'object' && firstInvoice !== null && 'invoiceNumber' in firstInvoice)
    ? (firstInvoice as any).invoiceNumber
    : null;

  const hasAdditionalInfo = contactName || contactPhone || contactEmail ||
    (partyAddress && (partyAddress.street || partyAddress.city || partyAddress.state ||
      partyAddress.postalCode || partyAddress.country));

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
            {hasAdditionalInfo ? (
              <>
                <View style={styles.labelRow}>
                  <Text style={styles.inlineLabel}>Delivered To:</Text>
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
                  <Text style={styles.standAloneLabel}>Delivered To:</Text>
                </View>
                <Text style={styles.entityName}>{partyName}</Text>
              </>
            )}
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
        </View>

        {/* Unified Bottom Box */}
        <View style={styles.unifiedBox}>
          {/* Row 1: Terms & Conditions */}
          <View style={styles.termsRow}>
            <Text style={styles.sectionTitle}>Terms and Conditions</Text>
            <Text style={styles.termsText}>
              • Received the above goods in good order and condition.{'\n'}
              • Please report any discrepancies within 24 hours of receipt.{'\n'}
              • Goods remain the property of the seller until paid in full.
            </Text>
          </View>

          {/* Row 2: Signature */}
          <View style={styles.signatureRow}>
            <View style={styles.signatureCell}>
              <Text style={styles.signatureLabel}>Received By</Text>
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