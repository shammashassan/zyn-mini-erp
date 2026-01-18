// app/api/vouchers/trash/restore/route.ts

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Voucher from "@/models/Voucher";
import Purchase from "@/models/Purchase";
import Expense from "@/models/Expense";
import Invoice from "@/models/Invoice";
import DebitNote from "@/models/DebitNote";
import CreditNote from "@/models/CreditNote";
import { restore } from "@/utils/softDelete";
import { getVoidedJournalsForReference, createJournalWithDate } from "@/utils/journalManager";
import { formatCurrency } from "@/utils/formatters/currency";
import { requireAuthAndPermission, validateRequiredFields } from "@/lib/auth-utils";

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();

    const { error: validationError } = validateRequiredFields(body, ["id"]);
    if (validationError) return validationError;

    const { id } = body;

    const voucherToRestore = await Voucher.findById(id).setOptions({ includeDeleted: true });

    if (!voucherToRestore) {
      return NextResponse.json({ error: "Voucher not found" }, { status: 404 });
    }

    const { error, session } = await requireAuthAndPermission({
      voucher: ["restore"],
    });
    if (error) return error;

    const user = session.user;

    if (!voucherToRestore.isDeleted) {
      return NextResponse.json({
        error: "Voucher is not deleted"
      }, { status: 400 });
    }

    const deletedAt = voucherToRestore.deletedAt;

    console.log(`🔍 Validating restoration of ${voucherToRestore.voucherType} voucher ${voucherToRestore.invoiceNumber}`);

    const restorationBlocked: string[] = [];
    const restorationWarnings: string[] = [];

    if (voucherToRestore.allocations && voucherToRestore.allocations.length > 0) {
      console.log(`📊 Checking ${voucherToRestore.allocations.length} allocation(s)...`);

      for (const allocation of voucherToRestore.allocations) {
        if (allocation.documentType === 'invoice') {
          const invoice = await Invoice.findById(allocation.documentId);

          if (!invoice || invoice.isDeleted) {
            restorationWarnings.push(
              `Invoice ${allocation.documentId} no longer exists or is deleted. ` +
              `Allocation of ${formatCurrency(allocation.amount)} will be skipped.`
            );
            continue;
          }

          // ✅ RECEIPT: Check if allocation would cause overpayment
          if (voucherToRestore.voucherType === 'receipt') {
            const currentAllocated = invoice.getTotalAllocated();
            const wouldBeAllocated = currentAllocated + allocation.amount;

            console.log(`📋 Invoice ${invoice.invoiceNumber}:`);
            console.log(`   Current Allocated: ${formatCurrency(currentAllocated)}`);
            console.log(`   Would Allocate: ${formatCurrency(allocation.amount)}`);
            console.log(`   Total Would Be: ${formatCurrency(wouldBeAllocated)}`);
            console.log(`   Invoice Total: ${formatCurrency(invoice.grandTotal)}`);

            if (wouldBeAllocated > invoice.grandTotal) {
              restorationBlocked.push(
                `Cannot restore: Allocation of ${formatCurrency(allocation.amount)} ` +
                `to invoice ${invoice.invoiceNumber} would exceed its total. ` +
                `Currently allocated: ${formatCurrency(currentAllocated)}, ` +
                `Invoice total: ${formatCurrency(invoice.grandTotal)}, ` +
                `Available: ${formatCurrency(invoice.grandTotal - currentAllocated)}`
              );
            } else {
              console.log(`   ✅ Valid: Has room for ${formatCurrency(invoice.grandTotal - currentAllocated)}`);
            }
          }
        }

        // ✅ PAYMENT VOUCHER - SAME VALIDATION AS RECEIPT
        else if (allocation.documentType === 'purchase') {
          const purchase = await Purchase.findById(allocation.documentId);

          if (!purchase || purchase.isDeleted) {
            restorationWarnings.push(
              `Purchase ${allocation.documentId} no longer exists or is deleted. ` +
              `Allocation of ${formatCurrency(allocation.amount)} will be skipped.`
            );
            continue;
          }

          const currentAllocated = purchase.getTotalAllocated();
          const wouldBeAllocated = currentAllocated + allocation.amount;

          console.log(`📦 Purchase ${purchase.referenceNumber}:`);
          console.log(`   Current Allocated: ${formatCurrency(currentAllocated)}`);
          console.log(`   Would Allocate: ${formatCurrency(allocation.amount)}`);
          console.log(`   Total Would Be: ${formatCurrency(wouldBeAllocated)}`);
          console.log(`   Purchase Total: ${formatCurrency(purchase.grandTotal)}`);

          if (wouldBeAllocated > purchase.grandTotal) {
            restorationBlocked.push(
              `Cannot restore: Allocation of ${formatCurrency(allocation.amount)} ` +
              `to purchase ${purchase.referenceNumber} would exceed its total. ` +
              `Currently allocated: ${formatCurrency(currentAllocated)}, ` +
              `Purchase total: ${formatCurrency(purchase.grandTotal)}, ` +
              `Available: ${formatCurrency(purchase.grandTotal - currentAllocated)}`
            );
          } else {
            console.log(`   ✅ Valid: Has room for ${formatCurrency(purchase.grandTotal - currentAllocated)}`);
          }
        }

        else if (allocation.documentType === 'expense') {
          const expense = await Expense.findById(allocation.documentId);

          if (!expense || expense.isDeleted) {
            restorationWarnings.push(
              `Expense ${allocation.documentId} no longer exists or is deleted. ` +
              `Allocation of ${formatCurrency(allocation.amount)} will be skipped.`
            );
            continue;
          }

          const currentAllocated = expense.getTotalAllocated();
          const wouldBeAllocated = currentAllocated + allocation.amount;

          console.log(`💰 Expense ${expense.referenceNumber}:`);
          console.log(`   Current Allocated: ${formatCurrency(currentAllocated)}`);
          console.log(`   Would Allocate: ${formatCurrency(allocation.amount)}`);
          console.log(`   Total Would Be: ${formatCurrency(wouldBeAllocated)}`);
          console.log(`   Expense Amount: ${formatCurrency(expense.amount)}`);

          if (wouldBeAllocated > expense.amount) {
            restorationBlocked.push(
              `Cannot restore: Allocation of ${formatCurrency(allocation.amount)} ` +
              `to expense ${expense.referenceNumber} would exceed its amount. ` +
              `Currently allocated: ${formatCurrency(currentAllocated)}, ` +
              `Expense amount: ${formatCurrency(expense.amount)}, ` +
              `Available: ${formatCurrency(expense.amount - currentAllocated)}`
            );
          } else {
            console.log(`   ✅ Valid: Has room for ${formatCurrency(expense.amount - currentAllocated)}`);
          }
        }

        else if (allocation.documentType === 'debitNote') {
          const debitNote = await DebitNote.findById(allocation.documentId);

          if (!debitNote || debitNote.isDeleted) {
            restorationWarnings.push(
              `Debit Note ${allocation.documentId} no longer exists or is deleted. ` +
              `Allocation of ${formatCurrency(allocation.amount)} will be skipped.`
            );
            continue;
          }

          const currentAllocated = debitNote.getTotalAllocated();
          const wouldBeAllocated = currentAllocated + allocation.amount;

          console.log(`📝 Debit Note ${debitNote.debitNoteNumber}:`);
          console.log(`   Current Allocated: ${formatCurrency(currentAllocated)}`);
          console.log(`   Would Allocate: ${formatCurrency(allocation.amount)}`);
          console.log(`   Total Would Be: ${formatCurrency(wouldBeAllocated)}`);
          console.log(`   Debit Note Total: ${formatCurrency(debitNote.grandTotal)}`);

          if (wouldBeAllocated > debitNote.grandTotal) {
            restorationBlocked.push(
              `Cannot restore: Allocation of ${formatCurrency(allocation.amount)} ` +
              `to debit note ${debitNote.debitNoteNumber} would exceed its total. ` +
              `Currently allocated: ${formatCurrency(currentAllocated)}, ` +
              `Debit note total: ${formatCurrency(debitNote.grandTotal)}, ` +
              `Available: ${formatCurrency(debitNote.grandTotal - currentAllocated)}`
            );
          } else {
            console.log(`   ✅ Valid: Has room for ${formatCurrency(debitNote.grandTotal - currentAllocated)}`);
          }
        }

        else if (allocation.documentType === 'creditNote') {
          const creditNote = await CreditNote.findById(allocation.documentId);

          if (!creditNote || creditNote.isDeleted) {
            restorationWarnings.push(
              `Credit Note ${allocation.documentId} no longer exists or is deleted. ` +
              `Allocation of ${formatCurrency(allocation.amount)} will be skipped.`
            );
            continue;
          }

          const currentAllocated = creditNote.getTotalAllocated();
          const wouldBeAllocated = currentAllocated + allocation.amount;

          console.log(`💳 Credit Note ${creditNote.creditNoteNumber}:`);
          console.log(`   Current Allocated: ${formatCurrency(currentAllocated)}`);
          console.log(`   Would Allocate: ${formatCurrency(allocation.amount)}`);
          console.log(`   Total Would Be: ${formatCurrency(wouldBeAllocated)}`);
          console.log(`   Credit Note Total: ${formatCurrency(creditNote.grandTotal)}`);

          if (wouldBeAllocated > creditNote.grandTotal) {
            restorationBlocked.push(
              `Cannot restore: Allocation of ${formatCurrency(allocation.amount)} ` +
              `to credit note ${creditNote.creditNoteNumber} would exceed its total. ` +
              `Currently allocated: ${formatCurrency(currentAllocated)}, ` +
              `Credit note total: ${formatCurrency(creditNote.grandTotal)}, ` +
              `Available: ${formatCurrency(creditNote.grandTotal - currentAllocated)}`
            );
          } else {
            console.log(`   ✅ Valid: Has room for ${formatCurrency(creditNote.grandTotal - currentAllocated)}`);
          }
        }
      }
    }

    if (restorationBlocked.length > 0) {
      console.log(`❌ Restoration BLOCKED due to overpayment risk`);
      return NextResponse.json({
        error: 'Cannot restore voucher',
        reasons: restorationBlocked,
        warnings: restorationWarnings
      }, { status: 400 });
    }

    const voidedJournals = await getVoidedJournalsForReference(id);

    const eligibleJournals = deletedAt
      ? voidedJournals.filter(journal => {
        const voidAction = journal.actionHistory?.find((action: any) =>
          action.action && action.action.includes('Voided')
        );

        if (!voidAction) return false;

        const voidTime = new Date(voidAction.timestamp).getTime();
        const deleteTime = new Date(deletedAt).getTime();
        const timeDiff = Math.abs(voidTime - deleteTime);

        return timeDiff < 60000;
      })
      : voidedJournals;

    let journalsToRecreate: any[] = eligibleJournals;
    console.log(`📋 ${voucherToRestore.voucherType}: Found ${voidedJournals.length} voided journal(s), ${journalsToRecreate.length} to recreate`);

    console.log(`♻️ Restoring ${voucherToRestore.voucherType} voucher ${voucherToRestore.invoiceNumber}...`);
    const restoredVoucher = await restore(
      Voucher,
      id,
      user?.id || null,
      user?.username || user?.name || null
    );

    if (!restoredVoucher) {
      return NextResponse.json({ error: "Voucher not found" }, { status: 404 });
    }

    console.log(`✅ Voucher restored: ${restoredVoucher.invoiceNumber}`);

    const reconnectionResults: string[] = [];

    if (restoredVoucher.allocations && restoredVoucher.allocations.length > 0) {
      console.log(`🔗 Reapplying ${restoredVoucher.allocations.length} allocation(s)...`);

      for (const allocation of restoredVoucher.allocations) {
        try {
          if (allocation.documentType === 'invoice') {
            const invoice = await Invoice.findById(allocation.documentId);

            if (!invoice || invoice.isDeleted) {
              reconnectionResults.push(`Skipped invoice ${allocation.documentId} (deleted or not found)`);
              continue;
            }

            // ✅ RECEIPT
            if (restoredVoucher.voucherType === 'receipt') {
              invoice.allocateReceipt(restoredVoucher._id, allocation.amount);

              const currentReceiptIds = invoice.connectedDocuments?.receiptIds || [];
              if (!currentReceiptIds.some((rid: any) => rid.toString() === id)) {
                currentReceiptIds.push(id);
                invoice.connectedDocuments = invoice.connectedDocuments || { receiptIds: [] };
                invoice.connectedDocuments.receiptIds = currentReceiptIds;
              }

              invoice.addAuditEntry(
                `Receipt voucher ${restoredVoucher.invoiceNumber} restored - allocated: ${formatCurrency(allocation.amount)}`,
                user?.id || null,
                user?.username || 'System'
              );

              await invoice.save();

              reconnectionResults.push(
                `Allocated ${formatCurrency(allocation.amount)} to invoice ${invoice.invoiceNumber}`
              );

              console.log(`✅ Reapplied allocation to invoice ${invoice.invoiceNumber}`);
            }
          }

          // ✅ PAYMENT VOUCHER - SAME AS RECEIPT
          else if (allocation.documentType === 'purchase') {
            const purchase = await Purchase.findById(allocation.documentId);

            if (!purchase || purchase.isDeleted) {
              reconnectionResults.push(`Skipped purchase ${allocation.documentId} (deleted or not found)`);
              continue;
            }

            purchase.allocatePayment(restoredVoucher._id, allocation.amount);

            const currentPaymentIds = purchase.connectedDocuments?.paymentIds || [];
            if (!currentPaymentIds.some((pid: any) => pid.toString() === id)) {
              currentPaymentIds.push(id);
              purchase.connectedDocuments = purchase.connectedDocuments || { paymentIds: [] };
              purchase.connectedDocuments.paymentIds = currentPaymentIds;
            }

            purchase.addAuditEntry(
              `Payment voucher ${restoredVoucher.invoiceNumber} restored - allocated: ${formatCurrency(allocation.amount)}`,
              user?.id || null,
              user?.username || 'System'
            );

            await purchase.save();

            reconnectionResults.push(
              `Allocated ${formatCurrency(allocation.amount)} to purchase ${purchase.referenceNumber}`
            );

            console.log(`✅ Reapplied allocation to purchase ${purchase.referenceNumber}`);
          }

          else if (allocation.documentType === 'expense') {
            const expense = await Expense.findById(allocation.documentId);

            if (!expense || expense.isDeleted) {
              reconnectionResults.push(`Skipped expense ${allocation.documentId} (deleted or not found)`);
              continue;
            }

            expense.allocatePayment(restoredVoucher._id, allocation.amount);

            const currentPaymentIds = expense.connectedDocuments?.paymentIds || [];
            if (!currentPaymentIds.some((pid: any) => pid.toString() === id)) {
              currentPaymentIds.push(id);
              expense.connectedDocuments = expense.connectedDocuments || { paymentIds: [] };
              expense.connectedDocuments.paymentIds = currentPaymentIds;
            }

            expense.addAuditEntry(
              `Payment voucher ${restoredVoucher.invoiceNumber} restored - allocated: ${formatCurrency(allocation.amount)}`,
              user?.id || null,
              user?.username || 'System'
            );

            await expense.save();

            reconnectionResults.push(
              `Allocated ${formatCurrency(allocation.amount)} to expense ${expense.referenceNumber}`
            );

            console.log(`✅ Reapplied allocation to expense ${expense.referenceNumber}`);
          }

          else if (allocation.documentType === 'debitNote') {
            const debitNote = await DebitNote.findById(allocation.documentId);

            if (!debitNote || debitNote.isDeleted) {
              reconnectionResults.push(`Skipped debit note ${allocation.documentId} (deleted or not found)`);
              continue;
            }

            debitNote.allocateReceipt(restoredVoucher._id, allocation.amount);

            const currentReceiptIds = debitNote.connectedDocuments?.receiptIds || [];
            if (!currentReceiptIds.some((rid: any) => rid.toString() === id)) {
              currentReceiptIds.push(id);
              debitNote.connectedDocuments = debitNote.connectedDocuments || { receiptIds: [] };
              debitNote.connectedDocuments.receiptIds = currentReceiptIds;
            }

            debitNote.addAuditEntry(
              `Receipt voucher ${restoredVoucher.invoiceNumber} restored - allocated: ${formatCurrency(allocation.amount)}`,
              user?.id || null,
              user?.username || 'System'
            );

            await debitNote.save();

            reconnectionResults.push(
              `Allocated ${formatCurrency(allocation.amount)} to debit note ${debitNote.debitNoteNumber}`
            );

            console.log(`✅ Reapplied allocation to debit note ${debitNote.debitNoteNumber}`);
          }

          else if (allocation.documentType === 'creditNote') {
            const creditNote = await CreditNote.findById(allocation.documentId);

            if (!creditNote || creditNote.isDeleted) {
              reconnectionResults.push(`Skipped credit note ${allocation.documentId} (deleted or not found)`);
              continue;
            }

            creditNote.allocatePayment(restoredVoucher._id, allocation.amount);

            const currentPaymentIds = creditNote.connectedDocuments?.paymentIds || [];
            if (!currentPaymentIds.some((pid: any) => pid.toString() === id)) {
              currentPaymentIds.push(id);
              creditNote.connectedDocuments = creditNote.connectedDocuments || { paymentIds: [] };
              creditNote.connectedDocuments.paymentIds = currentPaymentIds;
            }

            creditNote.addAuditEntry(
              `Payment voucher ${restoredVoucher.invoiceNumber} restored - allocated: ${formatCurrency(allocation.amount)}`,
              user?.id || null,
              user?.username || 'System'
            );

            await creditNote.save();

            reconnectionResults.push(
              `Allocated ${formatCurrency(allocation.amount)} to credit note ${creditNote.creditNoteNumber}`
            );

            console.log(`✅ Reapplied allocation to credit note ${creditNote.creditNoteNumber}`);
          }
        } catch (allocationError: any) {
          console.error(`Failed to reapply allocation:`, allocationError);
          reconnectionResults.push(
            `Failed: ${allocationError.message || 'Unknown error'}`
          );
        }
      }
    }

    if (journalsToRecreate.length > 0) {
      console.log(`📄 Recreating ${journalsToRecreate.length} journal(s)...`);

      for (const voidedJournal of journalsToRecreate) {
        const journalData = {
          referenceType: voidedJournal.referenceType,
          referenceId: voidedJournal.referenceId,
          referenceNumber: voidedJournal.referenceNumber,
          narration: `${voidedJournal.narration} (Recreated after restoration)`,
          entries: voidedJournal.entries,
          totalDebit: voidedJournal.totalDebit,
          totalCredit: voidedJournal.totalCredit,
          partyType: voidedJournal.partyType,
          partyId: voidedJournal.partyId,
          partyName: voidedJournal.partyName,
          itemType: voidedJournal.itemType,
          itemId: voidedJournal.itemId,
          itemName: voidedJournal.itemName,
        };

        await createJournalWithDate(
          journalData,
          voidedJournal.entryDate,
          user?.id || null,
          user?.username || user?.name || null
        );
      }

      console.log(`✅ Recreated ${journalsToRecreate.length} journal entries`);
    }

    let message = `Voucher restored successfully`;
    if (journalsToRecreate.length > 0) {
      message += ` with ${journalsToRecreate.length} journal(s) recreated`;
    }
    if (reconnectionResults.length > 0) {
      message += ` and ${reconnectionResults.length} allocation(s) reapplied`;
    }

    return NextResponse.json({
      message,
      voucher: restoredVoucher,
      journalsRecreated: journalsToRecreate.length,
      allocationsReapplied: reconnectionResults,
      warnings: restorationWarnings
    });
  } catch (error) {
    console.error("Failed to restore voucher:", error);
    return NextResponse.json({
      error: "Server error",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}