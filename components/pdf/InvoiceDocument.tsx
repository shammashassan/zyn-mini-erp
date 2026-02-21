import React from 'react';
import { Page, Text, Document, View } from '@react-pdf/renderer';
import type { IInvoice } from '@/models/Invoice';
import type { ICompanyDetails } from '@/models/CompanyDetails';
import { numberToWords } from '@/lib/numberToWords';

import { commonStyles, registerPdfFonts } from './shared/styles';
import { DocumentHeader } from './shared/DocumentHeader';
import { DocumentTitle } from './shared/DocumentTitle';
import { PartySection } from './shared/PartySection';
import { ItemsTable, InvoiceTableColumns } from './shared/ItemsTable';
import { buildInvoiceSummary } from './shared/SummaryBlock';
import { BottomSection } from './shared/BottomSection';
import { InlineNote } from './shared/DocumentSections';
import { DocumentFooter } from './shared/DocumentFooter';

interface InvoiceDocumentProps {
  bill: IInvoice;
  type: string;
  companyDetails: ICompanyDetails | null;
}

const DEFAULT_TERMS = [
  'Payment is due within 30 days of invoice date',
  'Late payments may incur additional charges',
  'Please include invoice number with payment',
];

export const InvoiceDocument: React.FC<InvoiceDocumentProps> = ({
  bill,
  type,
  companyDetails
}) => {
  registerPdfFonts();

  const documentTitle = type.toUpperCase().replace(/_/g, ' ');

  const grossTotal = bill.totalAmount || 0;
  const vatAmount = bill.vatAmount || 0;
  const discount = bill.discount || 0;
  const grandTotal = bill.grandTotal || 0;

  const summaryItems = buildInvoiceSummary({ grossTotal, discount, vatAmount, grandTotal });

  return (
    <Document>
      <Page size="A4" style={commonStyles.page}>
        <Text style={commonStyles.watermark}>INVOICE</Text>

        <View>
          <DocumentHeader companyDetails={companyDetails} />

          <DocumentTitle title={documentTitle} />

          <PartySection
            partyLabel="Bill To"
            party={bill.partySnapshot}
            contact={bill.contactSnapshot}
            documentNumber={bill.invoiceNumber}
            documentDate={bill.invoiceDate}
          />

          <ItemsTable columns={InvoiceTableColumns} items={bill.items} />

          {bill.notes && <InlineNote content={bill.notes} />}
        </View>

        <BottomSection
          summaryItems={summaryItems}
          grandTotal={{ label: 'Grand Total', value: grandTotal }}
          amountInWords={numberToWords(grandTotal)}
          vatInWords={numberToWords(vatAmount)}
          notes={DEFAULT_TERMS}
          bankDetails={companyDetails?.bankDetails}
          companyName={companyDetails?.companyName}
        />

        <DocumentFooter companyDetails={companyDetails} />
      </Page>
    </Document>
  );
};