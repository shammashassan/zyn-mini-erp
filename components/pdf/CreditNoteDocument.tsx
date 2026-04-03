import React from 'react';
import { Page, Text, Document, View } from '@react-pdf/renderer';
import type { ICreditNote } from '@/models/CreditNote';
import type { ICompanyDetails } from '@/models/CompanyDetails';
import { numberToWords } from '@/lib/numberToWords';

import { commonStyles, registerPdfFonts } from './shared/styles';
import { DocumentHeader } from './shared/DocumentHeader';
import { DocumentTitle } from './shared/DocumentTitle';
import { PartySection } from './shared/PartySection';
import { ItemsTable } from './shared/ItemsTable';
import { buildInvoiceSummary } from './shared/SummaryBlock';
import { BottomSection } from './shared/BottomSection';
import { ReasonBox, InlineNote } from './shared/DocumentSections';
import { DocumentFooter } from './shared/DocumentFooter';

interface PopulatedReturnNote {
  _id: string;
  returnNumber: string;
}

interface CreditNoteDocumentProps {
  creditNote: ICreditNote & {
    connectedDocuments?: {
      returnNoteId?: PopulatedReturnNote | string;
    };
  };
  companyDetails: ICompanyDetails | null;
}

const CREDIT_NOTE_TERMS = [
  'This credit note is issued against returned goods',
  'Credit will be applied to your account within 5 business days',
  'Please retain this document for your records',
];

export const CreditNoteDocument: React.FC<CreditNoteDocumentProps> = ({
  creditNote,
  companyDetails
}) => {
  registerPdfFonts();

  const returnNote = typeof creditNote.connectedDocuments?.returnNoteId === 'object'
    ? creditNote.connectedDocuments.returnNoteId as PopulatedReturnNote
    : null;

  const grossTotal = creditNote.totalAmount || 0;
  const vatAmount = creditNote.vatAmount || 0;
  const discount = creditNote.discount || 0;
  const grandTotal = creditNote.grandTotal || 0;

  const summaryItems = buildInvoiceSummary({ grossTotal, discount, vatAmount, grandTotal });

  const isManualEntry = creditNote.items?.length === 1 && !creditNote.items[0].itemId;

  return (
    <Document>
      <Page size="A4" style={commonStyles.page}>
        <Text style={commonStyles.watermark}>CREDIT NOTE</Text>

        <View>
          <DocumentHeader companyDetails={companyDetails} />

          <DocumentTitle title="CREDIT NOTE" />

          <PartySection
            partyLabel="Party"
            party={creditNote.partySnapshot}
            contact={creditNote.contactSnapshot}
            documentNumber={creditNote.creditNoteNumber}
            documentDate={creditNote.creditDate}
            referenceNumber={returnNote?.returnNumber}
            referenceLabel="Against Sales Return"
          />

          {isManualEntry && creditNote.items[0].description && (
            <ReasonBox title="Description" content={creditNote.items[0].description} />
          )}

          {creditNote.reason && (
            <ReasonBox title="Reason for Credit" content={creditNote.reason} />
          )}

          {!isManualEntry && creditNote.items && creditNote.items.length > 0 && (
            <ItemsTable
              columns={[
                { header: 'Product', field: 'description', width: '40%', align: 'left' },
                { header: 'Qty', field: 'quantity', width: '15%', align: 'center' },
                { header: 'Rate', field: 'rate', width: '20%', align: 'right', format: (v) => `AED ${v?.toFixed(2) || '0.00'}` },
                { header: 'Total', field: 'total', width: '25%', align: 'right', format: (v) => `AED ${v?.toFixed(2) || '0.00'}` },
              ]}
              items={creditNote.items}
            />
          )}

          {creditNote.notes && <InlineNote content={creditNote.notes} />}
        </View>

        <BottomSection
          summaryItems={summaryItems}
          grandTotal={{ label: 'Credit Amount', value: grandTotal }}
          amountInWords={numberToWords(grandTotal)}
          vatInWords={numberToWords(vatAmount)}
          notes={CREDIT_NOTE_TERMS}
          bankDetails={companyDetails?.bankDetails}
          companyName={companyDetails?.companyName}
        />

        <DocumentFooter companyDetails={companyDetails} />
      </Page>
    </Document>
  );
};