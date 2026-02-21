// components/pdf/VoucherDocument.tsx - Using party snapshots for PDF generation

import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';
import type { IVoucher } from '@/models/Voucher';
import type { ICompanyDetails } from '@/models/CompanyDetails';
import { numberToWords } from '@/lib/numberToWords';
import { formatCurrency } from '@/utils/formatters/currency';
import { formatDisplayDate, formatDateTime } from '@/utils/formatters/date';

import { commonStyles, registerPdfFonts, pdfColors } from './shared/styles';
import { MapPinIcon, PhoneIcon, MailIcon } from './shared/Icons';

// Only styles that are truly unique to the A5-landscape voucher layout
const styles = StyleSheet.create({
  page: {
    fontFamily: 'Roboto',
    fontSize: 8,
    padding: 0,
    backgroundColor: pdfColors.white,
    position: 'relative',
    flexDirection: 'column',
  },

  watermark: {
    position: 'absolute',
    top: '40%',
    left: '25%',
    fontSize: 60,
    color: '#f0f0f0',
    opacity: 0.06,
    transform: 'rotate(-45deg)',
    fontWeight: 'bold',
  },

  // Compact header / footer sized for A5 (cannot reuse absolute-positioned commonStyles versions)
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '12 20',
    borderBottomWidth: 1,
    borderBottomColor: pdfColors.border,
  },
  headerLogo: {
    width: 48,
    height: 48,
    objectFit: 'contain',
  },
  headerCompanyInfo: {
    alignItems: 'flex-end',
    gap: 4,
  },
  headerCompanyDetail: {
    fontSize: 7,
    color: pdfColors.textDark,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  signatureSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 10,
  },
  signatureBox: {
    width: '42%',
  },
  signatureLine: {
    borderTopWidth: 1,
    borderTopColor: pdfColors.border,
    marginBottom: 4,
    marginTop: 48,
  },
  signatureLabel: {
    fontSize: 7,
    color: pdfColors.textMuted,
    textAlign: 'center',
  },

  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8 20',
    borderTopWidth: 0.5,
    borderTopColor: pdfColors.border,
    backgroundColor: pdfColors.secondary,
  },

  // ── TITLE BAR: same light-blue bg + primary text as commonStyles.tableHeader ──
  titleSection: {
    backgroundColor: pdfColors.secondary,     // #e8eaf6 — identical to tableHeader bg
    paddingVertical: 8,
    paddingHorizontal: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: pdfColors.border,
  },
  voucherTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: pdfColors.primary,                 // #1a237e — identical to tableHeaderText color
    letterSpacing: 1.5,
  },
  voucherNumber: {
    fontSize: 11,
    fontWeight: 'bold',
    color: pdfColors.primary,
  },

  // Thin info bar below title
  infoBar: {
    backgroundColor: pdfColors.white,
    paddingVertical: 6,
    paddingHorizontal: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 0.5,
    borderBottomColor: pdfColors.border,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoLabel: {
    fontSize: 7.5,
    fontWeight: 'bold',
    color: pdfColors.textMuted,
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: 7.5,
    color: pdfColors.textDark,
    fontWeight: 'bold',
  },

  content: {
    padding: '10 15 0 15',
    flexGrow: 1,
    flexDirection: 'column',
  },

  // Key-value rows for party / reference data
  kvRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderBottomWidth: 0.5,
    borderBottomColor: pdfColors.border,
    paddingVertical: 5,
  },
  kvLabel: {
    width: '25%',
    fontSize: 7,
    color: pdfColors.primary,
    fontWeight: 'bold',
    paddingTop: 1,
  },
  kvValue: {
    fontSize: 7.5,
    color: pdfColors.textMain,
  },
  kvStack: {
    flex: 1,
    flexDirection: 'column',
  },
  kvContact: {
    fontSize: 6.5,
    color: pdfColors.textMuted,
    marginTop: 1,
  },

  // Particulars table rows
  particularsTitle: {
    fontSize: 8,
    fontWeight: 'bold',
    color: pdfColors.primary,
    marginTop: 8,
    marginBottom: 4,
    paddingBottom: 2,
    borderBottomWidth: 1.5,
    borderBottomColor: pdfColors.primary,
  },
  itemRow: {
    flexDirection: 'row',
    paddingVertical: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: pdfColors.border,
  },
  itemDesc: { flex: 1, fontSize: 7, color: pdfColors.textDark },
  itemQty: { width: '12%', fontSize: 7, color: pdfColors.textDark, textAlign: 'center' },
  itemRate: { width: '15%', fontSize: 7, color: pdfColors.textDark, textAlign: 'right' },
  itemAmount: { width: '15%', fontSize: 7, color: pdfColors.textDark, textAlign: 'right', fontWeight: 'bold' },

  // Amount box
  amountBox: {
    backgroundColor: pdfColors.secondary,
    borderWidth: 1.5,
    borderColor: pdfColors.primary,
    borderRadius: 4,
    padding: '15 12',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  amountWordsSection: {
    flex: 1,
    marginRight: 15,
    justifyContent: 'center',
  },
  amountValueSection: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    minWidth: '30%',
    borderLeftWidth: 1,
    borderLeftColor: '#c5cae9',
    paddingLeft: 12,
  },
  amountLabel: {
    fontSize: 6.5,
    color: pdfColors.primary,
    fontWeight: 'bold',
    marginBottom: 3,
    textTransform: 'uppercase',
  },
  amountWords: {
    fontSize: 7.5,
    color: pdfColors.textDark,
    backgroundColor: pdfColors.white,
    padding: '5 8',
    borderRadius: 3,
    borderWidth: 0.5,
    borderColor: pdfColors.border,
  },
  amountValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: pdfColors.primary,
  },
});

interface VoucherDocumentProps {
  bill: IVoucher & {
    partySnapshot?: {
      displayName: string;
      address?: {
        street?: string; city?: string; district?: string;
        state?: string; country?: string; postalCode?: string;
      };
      taxIdentifiers?: { vatNumber?: string };
    };
    contactSnapshot?: {
      name: string; phone?: string; email?: string; designation?: string;
    };
  };
  companyDetails: ICompanyDetails | null;
}

export const VoucherDocument: React.FC<VoucherDocumentProps> = ({ bill, companyDetails }) => {
  registerPdfFonts();

  const type = bill.voucherType || (bill as any).documentType;
  const isReceipt = type === 'receipt';
  const voucherTitle = isReceipt ? 'Receipt Voucher' : 'Payment Voucher';
  const partyLabel = isReceipt ? 'Received From' : 'Paid To';

  let partyName = 'Walk-in Customer';
  let contactName: string | null = null;

  if (bill.partySnapshot) partyName = bill.partySnapshot.displayName;
  else if ((bill as any).payeeName) partyName = (bill as any).payeeName;
  else if ((bill as any).vendorName) partyName = (bill as any).vendorName;

  if (bill.contactSnapshot) contactName = bill.contactSnapshot.name;

  const connected = bill.connectedDocuments;
  const invoicesDisplay = (connected?.invoiceIds || []).map((x: any) => typeof x === 'object' ? x?.invoiceNumber : x).filter(Boolean).join(', ');
  const purchasesDisplay = (connected?.purchaseIds || []).map((x: any) => typeof x === 'object' ? x?.referenceNumber : x).filter(Boolean).join(', ');
  const expensesDisplay = (connected?.expenseIds || []).map((x: any) => typeof x === 'object' ? x?.referenceNumber : x).filter(Boolean).join(', ');
  const creditNotesDisplay = (connected?.creditNoteIds || []).map((x: any) => typeof x === 'object' ? x?.creditNoteNumber : null).filter(Boolean).join(', ');
  const debitNotesDisplay = (connected?.debitNoteIds || []).map((x: any) => typeof x === 'object' ? x?.debitNoteNumber : null).filter(Boolean).join(', ');

  const amount = bill.grandTotal || bill.totalAmount || 0;

  return (
    <Document>
      <Page size="A5" orientation="landscape" style={styles.page}>
        <Text style={styles.watermark}>{isReceipt ? 'RECEIPT' : 'PAYMENT'}</Text>

        {/* ── HEADER ── */}
        <View style={styles.header}>
          {companyDetails?.logoUrl
            ? <Image style={styles.headerLogo} src={companyDetails.logoUrl} />
            : <View style={{ width: 48, height: 48 }} />
          }
          <View style={styles.headerCompanyInfo}>
            {companyDetails?.address && (
              <View style={styles.headerCompanyDetail}>
                <MapPinIcon size={7} /><Text>{companyDetails.address}</Text>
              </View>
            )}
            {companyDetails?.contactNumber && (
              <View style={styles.headerCompanyDetail}>
                <PhoneIcon size={7} />
                <Text>{companyDetails.contactNumber}{companyDetails.telephone && ` / ${companyDetails.telephone}`}</Text>
              </View>
            )}
            {companyDetails?.email && (
              <View style={styles.headerCompanyDetail}>
                <MailIcon size={7} /><Text>{companyDetails.email}</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── TITLE BAR (light blue — same palette as tableHeader) ── */}
        <View style={styles.titleSection}>
          <Text style={styles.voucherTitle}>{voucherTitle}</Text>
          <Text style={styles.voucherNumber}>{bill.invoiceNumber}</Text>
        </View>

        {/* ── INFO BAR ── */}
        <View style={styles.infoBar}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Date:</Text>
            <Text style={styles.infoValue}>{formatDisplayDate(bill.voucherDate)}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Payment Method:</Text>
            <Text style={styles.infoValue}>{bill.paymentMethod}</Text>
          </View>
        </View>

        {/* ── CONTENT ── */}
        <View style={styles.content}>

          {/* Party */}
          <View style={styles.kvRow}>
            <Text style={styles.kvLabel}>{partyLabel}</Text>
            <View style={styles.kvStack}>
              <Text style={styles.kvValue}>{partyName}</Text>
              {contactName && <Text style={styles.kvContact}>{contactName}</Text>}
            </View>
          </View>

          {/* Connected references */}
          {invoicesDisplay && <View style={styles.kvRow}><Text style={styles.kvLabel}>Agst Invoice(s)</Text>    <Text style={styles.kvValue}>{invoicesDisplay}</Text></View>}
          {purchasesDisplay && <View style={styles.kvRow}><Text style={styles.kvLabel}>Agst Purchase(s)</Text>  <Text style={styles.kvValue}>{purchasesDisplay}</Text></View>}
          {expensesDisplay && <View style={styles.kvRow}><Text style={styles.kvLabel}>Agst Expense(s)</Text>   <Text style={styles.kvValue}>{expensesDisplay}</Text></View>}
          {creditNotesDisplay && <View style={styles.kvRow}><Text style={styles.kvLabel}>Agst Credit Note(s)</Text><Text style={styles.kvValue}>{creditNotesDisplay}</Text></View>}
          {debitNotesDisplay && <View style={styles.kvRow}><Text style={styles.kvLabel}>Agst Debit Note(s)</Text> <Text style={styles.kvValue}>{debitNotesDisplay}</Text></View>}
          {bill.notes && <View style={styles.kvRow}><Text style={styles.kvLabel}>Remarks</Text>           <Text style={styles.kvValue}>{bill.notes}</Text></View>}

          {/* Particulars table — header reuses commonStyles.tableHeader / tableHeaderText */}
          {bill.items && bill.items.length > 0 && (
            <View style={{ marginTop: 8 }}>
              <Text style={styles.particularsTitle}>PARTICULARS</Text>
              <View style={[commonStyles.tableHeader, { paddingHorizontal: 0 }]}>
                <Text style={[commonStyles.tableHeaderText, { flex: 1 }]}>Description</Text>
                <Text style={[commonStyles.tableHeaderText, { width: '12%', textAlign: 'center' }]}>Qty</Text>
                <Text style={[commonStyles.tableHeaderText, { width: '15%', textAlign: 'right' }]}>Rate</Text>
                <Text style={[commonStyles.tableHeaderText, { width: '15%', textAlign: 'right' }]}>Amount</Text>
              </View>
              {bill.items.map((item: any, i: number) => (
                <View key={i} style={[styles.itemRow, i % 2 === 1 ? commonStyles.tableRowAlt : {}]}>
                  <Text style={styles.itemDesc}>{item.description}</Text>
                  <Text style={styles.itemQty}>{item.quantity}</Text>
                  <Text style={styles.itemRate}>{formatCurrency(item.rate)}</Text>
                  <Text style={styles.itemAmount}>{formatCurrency(item.total)}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={{ flex: 1 }} />

          {/* ── AMOUNT BOX ── */}
          <View style={styles.amountBox}>
            <View style={styles.amountWordsSection}>
              <Text style={styles.amountLabel}>The Sum of:</Text>
              <Text style={styles.amountWords}>{numberToWords(amount)}</Text>
            </View>
            <View style={styles.amountValueSection}>
              <Text style={styles.amountValue}>{formatCurrency(amount)}</Text>
            </View>
          </View>
        </View>

        {/* ── SIGNATURE ── */}
        <View style={styles.signatureSection}>
          <View style={styles.signatureBox}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>
              {isReceipt ? 'Paid By' : 'Received By'}
            </Text>
          </View>
          <View style={styles.signatureBox}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>
              {companyDetails?.companyName ? `For ${companyDetails.companyName}` : 'Authorized Signatory'}
            </Text>
          </View>
        </View>

        {/* ── FOOTER ── */}
        <View style={styles.footer}>
          <Text style={commonStyles.footerText}>Generated: {formatDateTime(new Date())}</Text>
          <Text style={commonStyles.footerText}>
            This is a system-generated document and is valid without signature
          </Text>
          <Text style={commonStyles.footerText}>
            {companyDetails?.companyName || 'Company Name'} {'\u00A9'} {new Date().getFullYear()}
          </Text>
        </View>
      </Page>
    </Document>
  );
};