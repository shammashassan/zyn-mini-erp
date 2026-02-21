import React from 'react';
import { Page, Text, Document, View } from '@react-pdf/renderer';
import type { IDeliveryNote } from '@/models/DeliveryNote';
import type { ICompanyDetails } from '@/models/CompanyDetails';

import { commonStyles, registerPdfFonts } from './shared/styles';
import { DocumentHeader } from './shared/DocumentHeader';
import { DocumentTitle } from './shared/DocumentTitle';
import { PartySection } from './shared/PartySection';
import { ItemsTable, InvoiceTableColumns } from './shared/ItemsTable';
import { NotesSection, SignatureSection, InlineNote } from './shared/DocumentSections';
import { DocumentFooter } from './shared/DocumentFooter';

interface DeliveryNoteProps {
  bill: IDeliveryNote;
  companyDetails: ICompanyDetails | null;
}

const DELIVERY_TERMS = [
  'Received the above goods in good order and condition',
  'Please report any discrepancies within 24 hours of receipt',
  'Goods remain the property of the seller until paid in full',
];

export const DeliveryNoteDocument: React.FC<DeliveryNoteProps> = ({
  bill,
  companyDetails
}) => {
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

        <View>
          <DocumentHeader companyDetails={companyDetails} />

          <DocumentTitle
            title="DELIVERY NOTE"
          />

          <PartySection
            partyLabel="Delivered To"
            party={bill.partySnapshot}
            contact={bill.contactSnapshot}
            documentNumber={bill.invoiceNumber}
            documentDate={bill.deliveryDate}
            referenceNumber={invoiceNumber}
            referenceLabel="Against Invoice"
          />

          <ItemsTable
            columns={InvoiceTableColumns}
            items={bill.items}
          />

          {bill.notes && <InlineNote content={bill.notes} />}
        </View>

        <View style={commonStyles.bottomSection}>
          <NotesSection
            notes={DELIVERY_TERMS}
            compact={false}
          />

          <SignatureSection
            leftLabel="Received By"
            companyName={companyDetails?.companyName}
          />
        </View>

        <DocumentFooter companyDetails={companyDetails} />
      </Page>
    </Document>
  );
};