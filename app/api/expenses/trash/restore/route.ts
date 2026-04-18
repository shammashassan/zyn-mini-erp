// app/api/expenses/trash/restore/route.ts - UPDATED with payment validation

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Expense from "@/models/Expense";
import { restore } from "@/utils/softDelete";
import { getUserInfo } from "@/lib/auth-helpers";
import { getVoidedJournalsForReference, createJournalWithDate } from "@/utils/journalManager";
import { requireAuthAndPermission, validateRequiredFields } from "@/lib/auth-utils";
import { formatCurrency } from "@/utils/formatters/currency";

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { id } = body;

    const { error: validationError } = validateRequiredFields(body, ["id"]);
    if (validationError) return validationError;

    const { error, session } = await requireAuthAndPermission({
      expense: ["restore"],
    });
    if (error) return error;

    const user = await getUserInfo();

    const expenseToRestore = await Expense.findById(id).setOptions({ includeDeleted: true });

    if (!expenseToRestore) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    if (!expenseToRestore.isDeleted) {
      return NextResponse.json({
        error: "Expense is not deleted"
      }, { status: 400 });
    }

    console.log(`📋 Validating restoration of expense ${expenseToRestore.referenceNumber}`);

    const restorationBlocked: string[] = [];
    const restorationWarnings: string[] = [];

    // ✅ Validate payment allocations
    if (expenseToRestore.paymentAllocations && expenseToRestore.paymentAllocations.length > 0) {
      console.log(`📊 Checking ${expenseToRestore.paymentAllocations.length} payment allocation(s)...`);

      const Voucher = (await import('@/models/Voucher')).default;

      for (const allocation of expenseToRestore.paymentAllocations) {
        const voucher = await Voucher.findById(allocation.voucherId);

        if (!voucher || voucher.isDeleted) {
          restorationWarnings.push(
            `Payment voucher ${allocation.voucherId} no longer exists or is deleted. ` +
            `Allocation of ${formatCurrency(allocation.allocatedAmount)} will be skipped.`
          );
          continue;
        }

        // Check if re-allocation would cause issues
        const currentAllocated = expenseToRestore.getTotalAllocated();
        const wouldBeAllocated = currentAllocated; // Since we're restoring existing allocations

        console.log(`💰 Expense ${expenseToRestore.referenceNumber}:`);
        console.log(`   Would restore allocation: ${formatCurrency(allocation.allocatedAmount)}`);
        console.log(`   Expense Total: ${formatCurrency(expenseToRestore.amount)}`);

        if (wouldBeAllocated > expenseToRestore.amount) {
          restorationBlocked.push(
            `Cannot restore: Allocation of ${formatCurrency(allocation.allocatedAmount)} ` +
            `would exceed expense total. ` +
            `Expense amount: ${formatCurrency(expenseToRestore.amount)}`
          );
        } else {
          console.log(`   ✅ Valid: Within expense amount`);
        }
      }
    }

    if (restorationBlocked.length > 0) {
      console.log(`❌ Restoration BLOCKED due to allocation conflicts`);
      return NextResponse.json({
        error: 'Cannot restore expense',
        reasons: restorationBlocked,
        warnings: restorationWarnings
      }, { status: 400 });
    }

    const deletedAt = expenseToRestore.deletedAt;

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

    let journalsToRecreate: any[] = [];
    if (eligibleJournals.length > 0) {
      const mostRecentJournal = eligibleJournals.sort((a, b) => {
        const aVoidAction = a.actionHistory?.find((action: any) =>
          action.action && action.action.includes('Voided')
        );
        const bVoidAction = b.actionHistory?.find((action: any) =>
          action.action && action.action.includes('Voided')
        );

        const aTime = aVoidAction ? new Date(aVoidAction.timestamp).getTime() : 0;
        const bTime = bVoidAction ? new Date(bVoidAction.timestamp).getTime() : 0;

        return bTime - aTime;
      })[0];

      journalsToRecreate = [mostRecentJournal];
    }

    console.log(`📋 Found ${voidedJournals.length} voided journal(s), ${journalsToRecreate.length} to recreate`);

    console.log(`♻️ Restoring expense ${expenseToRestore.referenceNumber}...`);
    const restoredExpense = await restore(
      Expense,
      id,
      user?.id || null,
      user?.username || user?.name || null
    );

    if (!restoredExpense) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    console.log(`✅ Expense restored: ${restoredExpense.referenceNumber}`);

    // ✅ Reapply payment allocations
    const reconnectionResults: string[] = [];

    if (restoredExpense.paymentAllocations && restoredExpense.paymentAllocations.length > 0) {
      console.log(`🔗 Reapplying ${restoredExpense.paymentAllocations.length} payment allocation(s)...`);

      const Voucher = (await import('@/models/Voucher')).default;

      for (const allocation of restoredExpense.paymentAllocations) {
        try {
          const voucher = await Voucher.findById(allocation.voucherId);

          if (!voucher || voucher.isDeleted) {
            reconnectionResults.push(`Skipped voucher ${allocation.voucherId} (deleted or not found)`);
            continue;
          }

          // Re-add allocation to voucher
          const existingAllocationIndex = voucher.allocations.findIndex(
            (alloc: any) => alloc.documentId.toString() === restoredExpense._id.toString()
          );

          if (existingAllocationIndex === -1) {
            voucher.allocations.push({
              documentId: restoredExpense._id,
              documentType: 'expense',
              amount: allocation.allocatedAmount,
              createdAt: new Date()
            });
          }

          // Re-add to connected documents
          const currentExpenseIds = voucher.connectedDocuments?.expenseIds || [];
          if (!currentExpenseIds.some((eid: any) => eid.toString() === id)) {
            currentExpenseIds.push(id);
            voucher.connectedDocuments = voucher.connectedDocuments || { expenseIds: [] };
            voucher.connectedDocuments.expenseIds = currentExpenseIds;
          }

          voucher.addAuditEntry(
            `Expense ${restoredExpense.referenceNumber} restored - allocated: ${formatCurrency(allocation.allocatedAmount)}`,
            user?.id || null,
            user?.username || 'System'
          );

          await voucher.save();

          reconnectionResults.push(
            `Allocated ${formatCurrency(allocation.allocatedAmount)} to voucher ${voucher.invoiceNumber}`
          );

          console.log(`✅ Reapplied allocation to voucher ${voucher.invoiceNumber}`);
        } catch (allocationError: any) {
          console.error(`Failed to reapply allocation:`, allocationError);
          reconnectionResults.push(
            `Failed: ${allocationError.message || 'Unknown error'}`
          );
        }
      }
    }

    // Recreate journals
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
          itemName: voidedJournal.itemName,
        };

        await createJournalWithDate(
          journalData,
          voidedJournal.entryDate,
          user.id,
          user.username || user.name
        );
      }

      console.log(`✅ Recreated ${journalsToRecreate.length} journal entries`);
    }

    let message = `Expense restored successfully`;
    if (journalsToRecreate.length > 0) {
      message += ` with ${journalsToRecreate.length} journal(s) recreated`;
    }
    if (reconnectionResults.length > 0) {
      message += ` and ${reconnectionResults.length} payment allocation(s) reapplied`;
    }

    return NextResponse.json({
      message,
      expense: restoredExpense,
      journalsRecreated: journalsToRecreate.length,
      allocationsReapplied: reconnectionResults,
      warnings: restorationWarnings
    });
  } catch (error) {
    console.error("Failed to restore expense:", error);
    return NextResponse.json({
      error: "Server error",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}