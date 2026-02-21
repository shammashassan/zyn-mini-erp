import React from 'react';
import { Page, Text, Document, View } from '@react-pdf/renderer';
import type { IQuotation } from '@/models/Quotation';
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

interface QuotationDocumentProps {
  bill: IQuotation;
  companyDetails: ICompanyDetails | null;
}

const QUOTATION_TERMS = [
  'The job will be executed post receipt of LPO and 50% advance payment',
  'Balance 50% payment after job completion',
  'Promotional items depend upon stock availability',
  'Validity: This offer is valid for 7 days from the date of issue',
];

export const QuotationDocument: React.FC<QuotationDocumentProps> = ({
  bill,
  companyDetails
}) => {
  registerPdfFonts();

  const grossTotal = bill.totalAmount || 0;
  const vatAmount = bill.vatAmount || 0;
  const discount = bill.discount || 0;
  const grandTotal = bill.grandTotal || 0;

  const summaryItems = buildInvoiceSummary({ grossTotal, discount, vatAmount, grandTotal });

  return (
    <Document>
      <Page size="A4" style={commonStyles.page}>
        <Text style={commonStyles.watermark}>QUOTATION</Text>

        <View>
          <DocumentHeader companyDetails={companyDetails} />

          <DocumentTitle
            title="QUOTATION / PROPOSAL"
          />

          <PartySection
            partyLabel="Quoted For"
            party={bill.partySnapshot}
            contact={bill.contactSnapshot}
            documentNumber={bill.invoiceNumber}
            documentDate={bill.quotationDate}
          />

          <ItemsTable
            columns={InvoiceTableColumns}
            items={bill.items}
          />

          {bill.notes && <InlineNote content={bill.notes} />}
        </View>

        <BottomSection
          summaryItems={summaryItems}
          grandTotal={{ label: 'Grand Total', value: grandTotal }}
          amountInWords={numberToWords(grandTotal)}
          vatInWords={numberToWords(vatAmount)}
          notes={QUOTATION_TERMS}
          bankDetails={companyDetails?.bankDetails}
          companyName={companyDetails?.companyName}
        />

        <DocumentFooter companyDetails={companyDetails} />
      </Page>
    </Document>
  );
};