// components/ReturnNoteDocument.tsx - Return Note PDF (Quantity-Only)

import React from 'react';
import { Page, Text, View, Document, StyleSheet, Font, Image, Svg, Path } from '@react-pdf/renderer';
import path from 'path';
import type { IReturnNote } from '@/models/ReturnNote';
import type { ICompanyDetails } from '@/models/CompanyDetails';
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

  watermark: {
    position: 'absolute',
    top: '35%',
    left: '15%',
    fontSize: 80,
    color: '#f0f0f0',
    opacity: 0.05,
    transform: 'rotate(-45deg)',
    fontWeight: 'bold',
  },

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

  infoBar: {
    backgroundColor: '#e8eaf6',
    padding: '12 25',
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 2,
    borderBottomColor: '#1a237e',
  },
  supplierSection: {
    flex: 1,
  },
  sectionLabel: {
    fontSize: 8,
    color: '#1a237e',
    fontWeight: 'bold',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  supplierName: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 2,
  },
  purchaseRef: {
    fontSize: 8,
    color: '#424242',
    marginBottom: 1,
    fontFamily: 'Courier',
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

  content: {
    padding: '15 25 25 25',
    flexGrow: 1,
  },

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
  descCol: { width: '35%' },
  orderedCol: { width: '15%', textAlign: 'center' },
  receivedCol: { width: '15%', textAlign: 'center' },
  alreadyReturnedCol: { width: '15%', textAlign: 'center' },
  returnedCol: { width: '20%', textAlign: 'center', fontWeight: 'bold', color: '#1a237e' },

  summaryContainer: {
    marginTop: 20,
  },

  totalsBox: {
    backgroundColor: '#e8eaf6',
    border: '1.5 solid #1a237e',
    borderRadius: 4,
    padding: 12,
    marginBottom: 15,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  totalLabel: {
    fontSize: 9,
    color: '#424242',
    fontWeight: 'bold',
  },
  totalValue: {
    fontSize: 10,
    color: '#1a237e',
    fontWeight: 'bold',
  },

  reasonBox: {
    backgroundColor: '#fff3e0',
    border: '1.5 solid #ff6f00',
    borderRadius: 4,
    padding: 12,
    marginBottom: 15,
  },
  reasonTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#ff6f00',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  reasonText: {
    fontSize: 8,
    color: '#424242',
    lineHeight: 1.4,
  },

  notesBox: {
    backgroundColor: '#f5f5f5',
    border: '1 solid #e0e0e0',
    borderRadius: 4,
    padding: 10,
  },
  notesTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#1a237e',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  notesText: {
    fontSize: 8,
    color: '#424242',
    lineHeight: 1.4,
  },

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

interface ReturnNoteDocumentProps {
  returnNote: IReturnNote;
  companyDetails: ICompanyDetails | null;
}

export const ReturnNoteDocument: React.FC<ReturnNoteDocumentProps> = ({ 
  returnNote, 
  companyDetails 
}) => {
  const totalItemsCount = returnNote.items.length;
  const totalReturnedQty = returnNote.items.reduce((sum, item) => sum + item.returnQuantity, 0);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Watermark */}
        <Text style={styles.watermark}>RETURN NOTE</Text>

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
          <Text style={styles.documentTitle}>RETURN NOTE</Text>
          <Text style={styles.documentNumber}>{returnNote.returnNumber}</Text>
        </View>

        {/* Info Bar */}
        <View style={styles.infoBar}>
          <View style={styles.supplierSection}>
            <Text style={styles.sectionLabel}>Supplier:</Text>
            <Text style={styles.supplierName}>{returnNote.supplierName}</Text>
            <Text style={styles.purchaseRef}>Purchase: {returnNote.purchaseReference}</Text>
          </View>
          <View style={styles.dateInfo}>
            <Text style={styles.dateLabel}>Return Date</Text>
            <Text style={styles.dateValue}>{formatDisplayDate(returnNote.returnDate)}</Text>
          </View>
        </View>

        {/* Main Content */}
        <View style={styles.content}>
          {/* Items Table */}
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, styles.descCol]}>Material</Text>
              <Text style={[styles.tableHeaderText, styles.orderedCol]}>Ordered</Text>
              <Text style={[styles.tableHeaderText, styles.receivedCol]}>Received</Text>
              <Text style={[styles.tableHeaderText, styles.alreadyReturnedCol]}>Prev. Returned</Text>
              <Text style={[styles.tableHeaderText, styles.returnedCol]}>Returned Now</Text>
            </View>
            {returnNote.items.map((item, index) => (
              <View style={styles.tableRow} key={index}>
                <Text style={[styles.tableCell, styles.descCol]}>{item.materialName}</Text>
                <Text style={[styles.tableCell, styles.orderedCol]}>{item.orderedQuantity.toFixed(2)}</Text>
                <Text style={[styles.tableCell, styles.receivedCol]}>{item.receivedQuantity.toFixed(2)}</Text>
                <Text style={[styles.tableCell, styles.alreadyReturnedCol]}>
                  {item.returnedQuantity.toFixed(2)}
                </Text>
                <Text style={[styles.tableCell, styles.returnedCol]}>{item.returnQuantity.toFixed(2)}</Text>
              </View>
            ))}
          </View>

          {/* Summary */}
          <View style={styles.summaryContainer}>
            <View style={styles.totalsBox}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total Items:</Text>
                <Text style={styles.totalValue}>{totalItemsCount}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total Quantity Returned:</Text>
                <Text style={styles.totalValue}>{totalReturnedQty.toFixed(2)}</Text>
              </View>
            </View>

            {/* Return Reason */}
            <View style={styles.reasonBox}>
              <Text style={styles.reasonTitle}>Return Reason</Text>
              <Text style={styles.reasonText}>{returnNote.reason}</Text>
            </View>

            {/* Notes (if any) */}
            {returnNote.notes && (
              <View style={styles.notesBox}>
                <Text style={styles.notesTitle}>Additional Notes</Text>
                <Text style={styles.notesText}>{returnNote.notes}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Generated: {formatDateTime(new Date())}
          </Text>
          <Text style={styles.systemNote}>
            This is a system-generated return note
          </Text>
          <Text style={styles.footerText}>
            {companyDetails?.companyName || 'Company Name'} © {new Date().getFullYear()}
          </Text>
        </View>
      </Page>
    </Document>
  );
};