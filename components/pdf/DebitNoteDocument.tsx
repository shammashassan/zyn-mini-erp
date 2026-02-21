import React from 'react';
import { Page, Text, Document, View } from '@react-pdf/renderer';
import type { IDebitNote } from '@/models/DebitNote';
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

interface DebitNoteDocumentProps {
  debitNote: IDebitNote & {
    connectedDocuments?: {
      returnNoteId?: PopulatedReturnNote | string;
    };
  };
  companyDetails: ICompanyDetails | null;
}

const DEBIT_NOTE_TERMS = [
  'This debit note is issued against returned materials',
  'Amount will be adjusted in your account within 5 business days',
  'Please retain this document for your records',
];

export const DebitNoteDocument: React.FC<DebitNoteDocumentProps> = ({
  debitNote,
  companyDetails
}) => {
  registerPdfFonts();

  const returnNote = typeof debitNote.connectedDocuments?.returnNoteId === 'object'
    ? debitNote.connectedDocuments.returnNoteId as PopulatedReturnNote
    : null;

  const grossTotal = debitNote.totalAmount || 0;
  const vatAmount = debitNote.vatAmount || 0;
  const discount = debitNote.discount || 0;
  const grandTotal = debitNote.grandTotal || 0;

  const summaryItems = buildInvoiceSummary({ grossTotal, discount, vatAmount, grandTotal });

  const isManualEntry = debitNote.items?.length === 1 && !debitNote.items[0].materialId;

  return (
    <Document>
      <Page size="A4" style={commonStyles.page}>
        <Text style={commonStyles.watermark}>DEBIT NOTE</Text>

        <View>
          <DocumentHeader companyDetails={companyDetails} />

          <DocumentTitle title="DEBIT NOTE" />

          <PartySection
            partyLabel="Party"
            party={debitNote.partySnapshot}
            contact={debitNote.contactSnapshot}
            documentNumber={debitNote.debitNoteNumber}
            documentDate={debitNote.debitDate}
            referenceNumber={returnNote?.returnNumber}
            referenceLabel="Against Purchase Return"
          />

          {isManualEntry && debitNote.items[0].materialName && (
            <ReasonBox title="Description" content={debitNote.items[0].materialName} />
          )}

          {debitNote.reason && (
            <ReasonBox title="Reason for Debit" content={debitNote.reason} />
          )}

          {!isManualEntry && debitNote.items && debitNote.items.length > 0 && (
            <ItemsTable
              columns={[
                { header: 'Material', field: 'materialName', width: '40%', align: 'left' },
                { header: 'Qty', field: 'quantity', width: '15%', align: 'center' },
                { header: 'Unit Cost', field: 'unitCost', width: '20%', align: 'right', format: (v) => `AED ${v?.toFixed(2) || '0.00'}` },
                { header: 'Total', field: 'total', width: '25%', align: 'right', format: (v) => `AED ${v?.toFixed(2) || '0.00'}` },
              ]}
              items={debitNote.items}
            />
          )}

          {debitNote.notes && <InlineNote content={debitNote.notes} />}
        </View>

        <BottomSection
          summaryItems={summaryItems}
          grandTotal={{ label: 'Debit Amount', value: grandTotal }}
          amountInWords={numberToWords(grandTotal)}
          vatInWords={numberToWords(vatAmount)}
          notes={DEBIT_NOTE_TERMS}
          bankDetails={companyDetails?.bankDetails}
          companyName={companyDetails?.companyName}
        />

        <DocumentFooter companyDetails={companyDetails} />
      </Page>
    </Document>
  );
};