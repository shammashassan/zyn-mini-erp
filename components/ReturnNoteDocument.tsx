import React from 'react';
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';
import type { IReturnNote } from '@/models/ReturnNote';
import type { ICompanyDetails } from '@/models/CompanyDetails';
import { formatDisplayDate } from '@/utils/formatters/date';
import { formatCurrency } from '@/utils/formatters/currency';

import { commonStyles, registerPdfFonts, pdfColors } from './pdf/styles';
import { PDFHeader } from './pdf/Header';
import { PDFFooter } from './pdf/Footer';

const styles = StyleSheet.create({
  content: { padding: '15 25 25 25', flexGrow: 1 },

  entityName: { fontSize: 11, fontWeight: 'bold', color: pdfColors.textMain, marginBottom: 2 },
  entityDetail: { fontSize: 8, color: pdfColors.textDark, marginBottom: 1 },
  labelRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 2 },
  inlineLabel: { fontSize: 9, color: pdfColors.primary, marginRight: 6, fontWeight: 'bold' },
  labelOnly: { marginBottom: 4 },
  standAloneLabel: { fontSize: 9, color: pdfColors.primary, fontWeight: 'bold' },
  dateInfo: { alignItems: 'flex-end' },
  dateLabel: { fontSize: 7, color: pdfColors.textMuted, marginBottom: 2 },
  dateValue: { fontSize: 10, fontWeight: 'bold', color: pdfColors.primary },

  col5_20: { width: '20%', textAlign: 'center' },
  col5_20_left: { width: '20%', textAlign: 'left' },
  col5_20_right: { width: '20%', textAlign: 'right' },
  col4_25: { width: '25%', textAlign: 'center' },
  col4_25_left: { width: '25%', textAlign: 'left' },
  col4_25_right: { width: '25%', textAlign: 'right' },

  headerText: { fontWeight: 'bold', color: pdfColors.white },
  headerTextAccent: { fontWeight: 'bold', color: pdfColors.accent },
  textBold: { fontWeight: 'bold', color: pdfColors.primary },

  reasonBox: {
    backgroundColor: pdfColors.secondary,
    border: `1.5 solid ${pdfColors.primary}`,
    borderRadius: 4,
    padding: 12,
    marginBottom: 15,
  },
  reasonLabel: { fontSize: 8, color: pdfColors.primary, fontWeight: 'bold', marginBottom: 4, textTransform: 'uppercase' },
  reasonText: { fontSize: 8.5, color: pdfColors.textDark, lineHeight: 1.4 },

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

  row1: {
    flexDirection: 'row',
    borderBottomWidth: 1.5,
    borderBottomColor: pdfColors.primary,
  },
  termsSection: {
    flex: 1,
    padding: 10,
    borderRightWidth: 1.5,
    borderRightColor: pdfColors.primary,
  },
  summarySection: {
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

interface PopulatedPurchase { _id: string; referenceNumber: string; }
interface PopulatedInvoice { _id: string; invoiceNumber: string; }

interface ReturnNoteDocumentProps {
  returnNote: IReturnNote & {
    connectedDocuments?: {
      purchaseId?: PopulatedPurchase | string;
      invoiceId?: PopulatedInvoice | string;
    };
  };
  companyDetails: ICompanyDetails | null;
}

export const ReturnNoteDocument: React.FC<ReturnNoteDocumentProps> = ({ returnNote, companyDetails }) => {
  registerPdfFonts();

  const totalItemsCount = returnNote.items.length;
  const totalReturnedQty = returnNote.items.reduce((sum, item) => sum + item.returnQuantity, 0);

  const calculateTotal = () => {
    if (returnNote.grandTotal !== undefined && returnNote.grandTotal !== null) {
      return returnNote.grandTotal;
    }
    return returnNote.items.reduce((sum, item) => sum + (item.total || 0), 0);
  };
  const grandTotal = calculateTotal();

  const isPurchaseReturn = returnNote.returnType === 'purchaseReturn';
  const isSalesReturn = returnNote.returnType === 'salesReturn';

  const partyName = returnNote.partySnapshot.displayName;
  const partyAddress = returnNote.partySnapshot.address;
  const contactName = returnNote.contactSnapshot?.name;
  const contactDesignation = returnNote.contactSnapshot?.designation;
  const contactPhone = returnNote.contactSnapshot?.phone;
  const contactEmail = returnNote.contactSnapshot?.email;

  const purchase = typeof returnNote.connectedDocuments?.purchaseId === 'object' ? returnNote.connectedDocuments.purchaseId as PopulatedPurchase : null;
  const invoice = typeof returnNote.connectedDocuments?.invoiceId === 'object' ? returnNote.connectedDocuments.invoiceId as PopulatedInvoice : null;

  const documentRef = purchase?.referenceNumber || invoice?.invoiceNumber;
  const entityLabel = isPurchaseReturn ? 'Supplier' : 'Customer';
  const documentLabel = isPurchaseReturn ? 'Purchase' : 'Invoice';

  let termsList = [
    "Goods returned are subject to inspection.",
    "Please retain this document for your records."
  ];

  let leftSigLabel = "Returned By";
  let rightSigLabel = "Received By";

  if (isSalesReturn) {
    termsList = [
      "Goods are subject to inspection and approval.",
      "Credit Note issued upon successful verification.",
      "Items must be in original packaging."
    ];
    leftSigLabel = "Returned By (Customer)";
    rightSigLabel = "Received By (Authorized)";
  } else if (isPurchaseReturn) {
    termsList = [
      "Goods returned to supplier for credit/replacement.",
      "Debit Note issued against this return.",
      "Subject to supplier acceptance."
    ];
    leftSigLabel = "Returned By (Authorized)";
    rightSigLabel = "Received By (Supplier)";
  }

  const hasAdditionalInfo = contactName || contactPhone || contactEmail ||
    (partyAddress && (partyAddress.street || partyAddress.city || partyAddress.state ||
      partyAddress.postalCode || partyAddress.country));

  return (
    <Document>
      <Page size="A4" style={commonStyles.page}>
        <Text style={commonStyles.watermark}>RETURN NOTE</Text>
        <PDFHeader companyDetails={companyDetails} />

        <View style={commonStyles.titleSection}>
          <Text style={commonStyles.documentTitle}>
            {isPurchaseReturn ? 'PURCHASE RETURN NOTE' : 'SALES RETURN NOTE'}
          </Text>
          <Text style={commonStyles.documentNumber}>{returnNote.returnNumber}</Text>
        </View>

        <View style={commonStyles.infoBar}>
          <View style={{ flex: 1 }}>
            {hasAdditionalInfo ? (
              <>
                <View style={styles.labelRow}>
                  <Text style={styles.inlineLabel}>{entityLabel}:</Text>
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
                  <Text style={styles.standAloneLabel}>{entityLabel}:</Text>
                </View>
                <Text style={styles.entityName}>{partyName}</Text>
              </>
            )}
          </View>
          <View style={styles.dateInfo}>
            <Text style={styles.dateLabel}>Return Date</Text>
            <Text style={styles.dateValue}>{formatDisplayDate(returnNote.returnDate)}</Text>
            {documentRef && (
              <>
                <Text style={[styles.dateLabel, { marginTop: 8 }]}>Against {documentLabel}</Text>
                <Text style={styles.dateValue}>{documentRef}</Text>
              </>
            )}
          </View>
        </View>

        <View style={styles.content}>
          {returnNote.reason && (
            <View style={styles.reasonBox}>
              <Text style={styles.reasonLabel}>Reason:</Text>
              <Text style={styles.reasonText}>{returnNote.reason}</Text>
            </View>
          )}

          <View style={commonStyles.table}>
            {isPurchaseReturn && (
              <>
                <View style={commonStyles.tableHeader}>
                  <Text style={[commonStyles.tableHeaderText, styles.col5_20_left, styles.headerText]}>Material</Text>
                  <Text style={[commonStyles.tableHeaderText, styles.col5_20, styles.headerText]}>Ordered</Text>
                  <Text style={[commonStyles.tableHeaderText, styles.col5_20, styles.headerText]}>Received</Text>
                  <Text style={[commonStyles.tableHeaderText, styles.col5_20, styles.headerTextAccent]}>Returned</Text>
                  <Text style={[commonStyles.tableHeaderText, styles.col5_20_right, styles.headerTextAccent]}>Total</Text>
                </View>
                {returnNote.items.map((item, index) => (
                  <View style={commonStyles.tableRow} key={index}>
                    <Text style={[commonStyles.tableCell, styles.col5_20_left]}>{item.materialName || 'Unknown'}</Text>
                    <Text style={[commonStyles.tableCell, styles.col5_20]}>{item.orderedQuantity ? item.orderedQuantity.toFixed(2) : '0.00'}</Text>
                    <Text style={[commonStyles.tableCell, styles.col5_20]}>{item.receivedQuantity ? item.receivedQuantity.toFixed(2) : '0.00'}</Text>
                    <Text style={[commonStyles.tableCell, styles.col5_20, styles.textBold]}>{item.returnQuantity.toFixed(2)}</Text>
                    <Text style={[commonStyles.tableCell, styles.col5_20_right, styles.textBold]}>{formatCurrency(item.total || 0)}</Text>
                  </View>
                ))}
              </>
            )}

            {isSalesReturn && (
              <>
                <View style={commonStyles.tableHeader}>
                  <Text style={[commonStyles.tableHeaderText, styles.col4_25_left, styles.headerText]}>Product</Text>
                  <Text style={[commonStyles.tableHeaderText, styles.col4_25, styles.headerText]}>Quantity</Text>
                  <Text style={[commonStyles.tableHeaderText, styles.col4_25, styles.headerText]}>Rate</Text>
                  <Text style={[commonStyles.tableHeaderText, styles.col4_25_right, styles.headerTextAccent]}>Total</Text>
                </View>
                {returnNote.items.map((item, index) => (
                  <View style={commonStyles.tableRow} key={index}>
                    <Text style={[commonStyles.tableCell, styles.col4_25_left]}>{item.productName || 'Unknown'}</Text>
                    <Text style={[commonStyles.tableCell, styles.col4_25]}>{item.returnQuantity.toFixed(2)}</Text>
                    <Text style={[commonStyles.tableCell, styles.col4_25]}>{item.rate ? formatCurrency(item.rate) : '0.00'}</Text>
                    <Text style={[commonStyles.tableCell, styles.col4_25_right, styles.textBold]}>{item.total ? formatCurrency(item.total) : '0.00'}</Text>
                  </View>
                ))}
              </>
            )}
          </View>
        </View>

        {/* Unified Bottom Box */}
        <View style={styles.unifiedBox}>
          {/* Row 1: Terms & Conditions (left) | Summary (right) */}
          <View style={styles.row1}>
            <View style={styles.termsSection}>
              <Text style={styles.sectionTitle}>Terms and Conditions</Text>
              <Text style={styles.termsText}>
                {termsList.map((term, i) => `• ${term}\n`).join('')}
              </Text>
            </View>
            <View style={styles.summarySection}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total Items</Text>
                <Text style={styles.summaryValue}>{totalItemsCount}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total Amount</Text>
                <Text style={styles.summaryValue}>{formatCurrency(grandTotal)}</Text>
              </View>
              <View style={styles.grandTotalRow}>
                <Text style={styles.grandTotalLabel}>Qty Returned</Text>
                <Text style={styles.grandTotalValue}>{totalReturnedQty.toFixed(2)}</Text>
              </View>
            </View>
          </View>

          {/* Row 2: Signature */}
          <View style={styles.signatureRow}>
            <View style={styles.signatureCell}>
              <Text style={styles.signatureLabel}>{leftSigLabel}</Text>
            </View>
            <View style={styles.signatureDivider} />
            <View style={styles.signatureCell}>
              <Text style={styles.signatureLabel}>{rightSigLabel}</Text>
            </View>
          </View>
        </View>

        <PDFFooter companyDetails={companyDetails} />
      </Page>
    </Document>
  );
};