// utils/invoiceNumber.ts - UPDATED: Added refund type

import dbConnect from '@/lib/dbConnect';
import Invoice from '@/models/Invoice';
import Quotation from '@/models/Quotation';
import Voucher from '@/models/Voucher';
import DeliveryNote from '@/models/DeliveryNote';
import Purchase from '@/models/Purchase';
import Expense from '@/models/Expense';
import Journal from '@/models/Journal';

// Define the supported document types
type DocumentType = 
  | 'invoice' 
  | 'quotation' 
  | 'receipt' 
  | 'payment'
  | 'refund' // ✅ ADDED
  | 'delivery' 
  | 'journal' 
  | 'purchase' 
  | 'expense';

// Define the prefixes for each document type
const prefixes: Record<DocumentType, string> = {
  invoice: 'INV',
  quotation: 'QT',
  receipt: 'RCP',
  payment: 'PAY',
  refund: 'RFN', // ✅ ADDED
  delivery: 'DLV',
  journal: 'JE',
  purchase: 'PUR',
  expense: 'EXP',
};

/**
 * Generate a unique reference number with retry mechanism
 * Format: PREFIX-YYYYMMDD-SEQUENCE
 * Examples: INV-20251024-0001, QT-20251025-0001, RFN-20251024-0001
 */
export default async function generateInvoiceNumber(
  documentType: DocumentType,
  maxRetries: number = 5
): Promise<string> {
  await dbConnect();

  const prefix = prefixes[documentType] || 'DOC';

  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const searchPattern = `^${prefix}-${datePart}`;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      let count: number;
      let Model: any;
      let query: any = {};

      // Select the correct Model based on document type
      switch (documentType) {
        case 'invoice':
          Model = Invoice;
          query = { invoiceNumber: { $regex: searchPattern } };
          break;
        case 'quotation':
          Model = Quotation;
          query = { invoiceNumber: { $regex: searchPattern } };
          break;
        case 'receipt':
        case 'payment':
        case 'refund': // ✅ ADDED: Refund uses Voucher model
          Model = Voucher;
          query = { invoiceNumber: { $regex: searchPattern } };
          break;
        case 'delivery':
          Model = DeliveryNote;
          query = { invoiceNumber: { $regex: searchPattern } };
          break;
        case 'purchase':
          Model = Purchase;
          query = { referenceNumber: { $regex: searchPattern } };
          break;
        case 'expense':
          Model = Expense;
          query = { referenceNumber: { $regex: searchPattern } };
          break;
        case 'journal':
          Model = Journal;
          query = { journalNumber: { $regex: searchPattern } };
          break;
        default:
          throw new Error(`Unknown document type: ${documentType}`);
      }

      // Count existing documents matching the pattern
      count = await Model.countDocuments(query);

      // Generate next number
      const nextNumber = count + 1 + attempt; 
      const formattedNumber = String(nextNumber).padStart(4, '0');
      const generatedNumber = `${prefix}-${datePart}-${formattedNumber}`;

      // Double-check uniqueness based on the specific field name
      let exists;
      if (documentType === 'journal') {
        exists = await Model.findOne({ journalNumber: generatedNumber });
      } else if (documentType === 'purchase' || documentType === 'expense') {
        exists = await Model.findOne({ referenceNumber: generatedNumber });
      } else {
        exists = await Model.findOne({ invoiceNumber: generatedNumber });
      }

      if (!exists) {
        console.log(`✅ Generated ${documentType} number: ${generatedNumber}`);
        return generatedNumber;
      }

      console.warn(`⚠️ Collision detected for ${generatedNumber}, retrying... (attempt ${attempt + 1})`);
      
      await new Promise(resolve => setTimeout(resolve, Math.random() * 200));

    } catch (error) {
      console.error(`❌ Error generating ${documentType} number:`, error);
      if (attempt === maxRetries - 1) throw error;
    }
  }

  // Fallback: use timestamp suffix if all retries failed
  const timestamp = Date.now().toString().slice(-6);
  const fallbackNumber = `${prefix}-${datePart}-${timestamp}`;
  console.error(`⚠️ Max retries reached, using timestamp fallback: ${fallbackNumber}`);
  return fallbackNumber;
}