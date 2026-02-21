import React from 'react';
import { Page, Text, Document, View } from '@react-pdf/renderer';
import type { IReturnNote } from '@/models/ReturnNote';
import type { ICompanyDetails } from '@/models/CompanyDetails';
import { formatCurrency } from '@/utils/formatters/currency';

import { commonStyles, registerPdfFonts } from './shared/styles';
import { DocumentHeader } from './shared/DocumentHeader';
import { DocumentTitle } from './shared/DocumentTitle';
import { PartySection } from './shared/PartySection';
import { ItemsTable, SalesReturnTableColumns, PurchaseReturnTableColumns } from './shared/ItemsTable';
import { NotesSection, SignatureSection, ReasonBox, InlineNote } from './shared/DocumentSections';
import { DocumentFooter } from './shared/DocumentFooter';

interface PopulatedPurchase {
  _id: string;
  referenceNumber: string;
}

interface PopulatedInvoice {
  _id: string;
  invoiceNumber: string;
}

interface ReturnNoteDocumentProps {
  returnNote: IReturnNote & {
    connectedDocuments?: {
      purchaseId?: PopulatedPurchase | string;
      invoiceId?: PopulatedInvoice | string;
    };
  };
  companyDetails: ICompanyDetails | null;
}

const SALES_RETURN_TERMS = [
  'Goods are subject to inspection and approval',
  'Credit Note will be issued upon successful verification',
  'Items must be in original packaging',
];

const PURCHASE_RETURN_TERMS = [
  'Goods returned to supplier for credit/replacement',
  'Debit Note will be issued against this return',
  'Subject to supplier acceptance',
];

export const ReturnNoteDocument: React.FC<ReturnNoteDocumentProps> = ({
  returnNote,
  companyDetails
}) => {
  registerPdfFonts();

  const isPurchaseReturn = returnNote.returnType === 'purchaseReturn';
  const isSalesReturn = returnNote.returnType === 'salesReturn';

  const purchase = typeof returnNote.connectedDocuments?.purchaseId === 'object'
    ? returnNote.connectedDocuments.purchaseId as PopulatedPurchase
    : null;
  const invoice = typeof returnNote.connectedDocuments?.invoiceId === 'object'
    ? returnNote.connectedDocuments.invoiceId as PopulatedInvoice
    : null;

  const documentRef = purchase?.referenceNumber || invoice?.invoiceNumber;
  const documentLabel = isPurchaseReturn ? 'Purchase' : 'Invoice';
  const entityLabel = isPurchaseReturn ? 'Supplier' : 'Customer';

  const totalReturnedQty = returnNote.items.reduce((sum, item) => sum + item.returnQuantity, 0);
  const grandTotal = returnNote.grandTotal ?? returnNote.items.reduce((sum, item) => sum + (item.total || 0), 0);

  const terms = isSalesReturn ? SALES_RETURN_TERMS : PURCHASE_RETURN_TERMS;
  const leftSigLabel = isSalesReturn ? 'Returned By (Customer)' : 'Returned By (Authorized)';
  const rightSigLabel = isSalesReturn ? 'Received By (Authorized)' : 'Received By (Supplier)';

  return (
    <Document>
      <Page size="A4" style={commonStyles.page}>
        <Text style={commonStyles.watermark}>RETURN NOTE</Text>

        <View>
          <DocumentHeader companyDetails={companyDetails} />

          <DocumentTitle
            title={isPurchaseReturn ? 'PURCHASE RETURN NOTE' : 'SALES RETURN NOTE'}
          />

          <PartySection
            partyLabel={entityLabel}
            party={returnNote.partySnapshot}
            contact={returnNote.contactSnapshot}
            documentNumber={returnNote.returnNumber}
            documentDate={returnNote.returnDate}
            referenceNumber={documentRef}
            referenceLabel={`Against ${documentLabel}`}
          />

          {returnNote.reason && (
            <ReasonBox title="Reason for Return" content={returnNote.reason} />
          )}

          <ItemsTable
            columns={isPurchaseReturn ? PurchaseReturnTableColumns : SalesReturnTableColumns}
            items={returnNote.items}
          />

          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 12 }}>
            <View style={{ width: '40%', minWidth: 200 }}>
              <View style={commonStyles.summaryRow}>
                <Text style={commonStyles.summaryLabel}>Total Items</Text>
                <Text style={commonStyles.summaryValue}>{returnNote.items.length}</Text>
              </View>
              <View style={commonStyles.summaryRow}>
                <Text style={commonStyles.summaryLabel}>Total Quantity Returned</Text>
                <Text style={commonStyles.summaryValue}>{totalReturnedQty.toFixed(2)}</Text>
              </View>
              <View style={commonStyles.grandTotalRow}>
                <Text style={commonStyles.grandTotalLabel}>Total Amount</Text>
                <Text style={commonStyles.grandTotalValue}>{formatCurrency(grandTotal)}</Text>
              </View>
            </View>
          </View>

          {returnNote.notes && <InlineNote content={returnNote.notes} />}
        </View>

        <View style={commonStyles.bottomSection}>
          <NotesSection notes={terms} compact={false} />

          <SignatureSection
            leftLabel={leftSigLabel}
            rightLabel={rightSigLabel}
          />
        </View>

        <DocumentFooter companyDetails={companyDetails} />
      </Page>
    </Document>
  );
};