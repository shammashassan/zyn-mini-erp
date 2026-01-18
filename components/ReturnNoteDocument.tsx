import React from 'react';
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';
import type { IReturnNote } from '@/models/ReturnNote';
import type { ICompanyDetails } from '@/models/CompanyDetails';
import { formatDisplayDate } from '@/utils/formatters/date';
import { formatCurrency } from '@/utils/formatters/currency';

// Shared Components
import { commonStyles, registerPdfFonts, pdfColors } from './pdf/styles';
import { PDFHeader } from './pdf/Header';
import { PDFFooter } from './pdf/Footer';

const styles = StyleSheet.create({
  content: { padding: '15 25 25 25', flexGrow: 1 },
  
  entityName: { fontSize: 11, fontWeight: 'bold', color: pdfColors.textMain, marginBottom: 2 },
  dateInfo: { alignItems: 'flex-end' },
  dateLabel: { fontSize: 7, color: pdfColors.textMuted, marginBottom: 2 },
  dateValue: { fontSize: 10, fontWeight: 'bold', color: pdfColors.primary },

  // Equal Column Widths for Purchase Return (5 columns = 20% each)
  col5_20: { width: '20%', textAlign: 'center' },
  col5_20_left: { width: '20%', textAlign: 'left' },
  col5_20_right: { width: '20%', textAlign: 'right' },

  // Equal Column Widths for Sales Return (4 columns = 25% each)
  col4_25: { width: '25%', textAlign: 'center' },
  col4_25_left: { width: '25%', textAlign: 'left' },
  col4_25_right: { width: '25%', textAlign: 'right' },
  
  // Specific styling for readability
  headerText: { fontWeight: 'bold', color: pdfColors.white },
  headerTextAccent: { fontWeight: 'bold', color: pdfColors.accent },
  
  textBold: { fontWeight: 'bold', color: pdfColors.primary },

  // Reason Box (Blue Style)
  reasonBox: {
    backgroundColor: pdfColors.secondary,
    border: `1.5 solid ${pdfColors.primary}`,
    borderRadius: 4,
    padding: 10,
    marginBottom: 15,
  },
  reasonLabel: { fontSize: 8, color: pdfColors.primary, fontWeight: 'bold', marginBottom: 4, textTransform: 'uppercase' },
  reasonText: { fontSize: 8.5, color: pdfColors.textDark, lineHeight: 1.4 },

  // Layout for Bottom Section (Terms left, Totals right)
  summaryContainer: { 
    marginTop: 20, 
    flexDirection: 'row', 
    justifyContent: 'space-between',
    gap: 20,
  },
  leftColumn: {
    flex: 1,
    flexDirection: 'column',
    gap: 10,
  },
  
  // Totals Box
  totalsBox: {
    width: '40%',
    backgroundColor: pdfColors.white,
    border: `1.5 solid ${pdfColors.primary}`,
    borderRadius: 4,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
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
    alignItems: 'center',
    marginTop: 'auto', // This pushes the row to the bottom if container has height
  },
  totalLabel: { fontSize: 8.5, color: pdfColors.textDark },
  totalValue: { fontSize: 8.5, color: pdfColors.textDark, fontWeight: 'bold' },
  grandTotalLabel: { fontSize: 10, fontWeight: 'bold', color: pdfColors.white },
  grandTotalValue: { fontSize: 11, fontWeight: 'bold', color: pdfColors.accent },

  // Terms & Notes Styling
  termsBox: { 
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
    textTransform: 'uppercase' 
  },
  boxContent: { 
    fontSize: 8, 
    color: pdfColors.textDark, 
    lineHeight: 1.4 
  },
  notesBox: { 
    backgroundColor: '#f5f5f5', 
    border: `1 solid ${pdfColors.border}`, 
    borderRadius: 4, 
    padding: 10 
  },
  notesTitle: { 
    fontSize: 9, 
    fontWeight: 'bold', 
    color: pdfColors.primary, 
    marginBottom: 6, 
    textTransform: 'uppercase' 
  },
  notesText: { 
    fontSize: 8, 
    color: pdfColors.textDark, 
    lineHeight: 1.4 
  },

  // Signatures (Stick to bottom)
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
    textTransform: 'uppercase' 
  },
});

interface PopulatedPurchase { _id: string; referenceNumber: string; supplierName?: string; }
interface PopulatedInvoice { _id: string; invoiceNumber: string; customerName?: string; }

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
  
  // Calculate Grand Total safely (use stored value or calculate on fly for older records)
  const calculateTotal = () => {
    if (returnNote.grandTotal !== undefined && returnNote.grandTotal !== null) {
      return returnNote.grandTotal;
    }
    return returnNote.items.reduce((sum, item) => sum + (item.total || 0), 0);
  };
  const grandTotal = calculateTotal();

  const isPurchaseReturn = returnNote.returnType === 'purchaseReturn';
  const isSalesReturn = returnNote.returnType === 'salesReturn';
  const entityName = isPurchaseReturn ? returnNote.supplierName : returnNote.customerName;

  const purchase = typeof returnNote.connectedDocuments?.purchaseId === 'object' ? returnNote.connectedDocuments.purchaseId as PopulatedPurchase : null;
  const invoice = typeof returnNote.connectedDocuments?.invoiceId === 'object' ? returnNote.connectedDocuments.invoiceId as PopulatedInvoice : null;

  const documentRef = purchase?.referenceNumber || invoice?.invoiceNumber;
  const entityLabel = isPurchaseReturn ? 'Supplier' : 'Customer';
  const documentLabel = isPurchaseReturn ? 'Purchase' : 'Invoice';

  // Dynamic Content Logic
  let termsList = [
    "Goods returned are subject to inspection.",
    "Please retain this document for your records."
  ];

  let leftSigLabel = "Returned By\n(Name, Signature & Date)";
  let rightSigLabel = "Received By\n(Name, Signature & Date)";

  if (isSalesReturn) {
    termsList = [
        "Goods are subject to inspection and approval.",
        "Credit Note issued upon successful verification.",
        "Items must be in original packaging."
    ];
    leftSigLabel = "Returned By (Customer)\n(Name, Signature & Date)";
    rightSigLabel = "Received By (Authorized)\n(Name, Signature & Date)";
  } else if (isPurchaseReturn) {
     termsList = [
        "Goods returned to supplier for credit/replacement.",
        "Debit Note issued against this return.",
        "Subject to supplier acceptance."
    ];
    leftSigLabel = "Returned By (Authorized)\n(Name, Signature & Date)";
    rightSigLabel = "Received By (Supplier)\n(Name, Signature & Date)";
  }

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
            <Text style={commonStyles.sectionLabel}>{entityLabel}:</Text>
            <Text style={styles.entityName}>{entityName}</Text>
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
          
          {/* Reason Box */}
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

          {/* New Horizontal Layout for Terms & Totals */}
          <View style={styles.summaryContainer}>
            
            {/* Left Column: Terms & Notes */}
            <View style={styles.leftColumn}>
              <View style={styles.termsBox}>
                <Text style={styles.boxTitle}>Terms & Conditions</Text>
                <Text style={styles.boxContent}>
                  {termsList.map((term, i) => `• ${term}\n`).join('')}
                </Text>
              </View>

              {returnNote.notes && (
                <View style={styles.notesBox}>
                  <Text style={styles.notesTitle}>Additional Notes</Text>
                  <Text style={styles.notesText}>{returnNote.notes}</Text>
                </View>
              )}
            </View>

            {/* Right Column: Totals */}
            <View style={styles.totalsBox}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total Items</Text>
                <Text style={styles.totalValue}>{totalItemsCount}</Text>
              </View>
              
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total Amount</Text>
                <Text style={styles.totalValue}>{formatCurrency(grandTotal)}</Text>
              </View>
              
              {/* Spacer ensures the grand total row is pushed to bottom */}
              <View style={{ flex: 1 }} />

              <View style={styles.grandTotalRow}>
                <Text style={styles.grandTotalLabel}>Total Quantity Returned</Text>
                <Text style={styles.grandTotalValue}>{totalReturnedQty.toFixed(2)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Signatures - Sticky at Bottom */}
        <View style={styles.signatureSection}>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLabel}>{leftSigLabel}</Text>
          </View>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLabel}>{rightSigLabel}</Text>
          </View>
        </View>

        <PDFFooter companyDetails={companyDetails} />
      </Page>
    </Document>
  );
};