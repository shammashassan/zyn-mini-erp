// app/api/invoices/trash/restore/route.ts

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Invoice from "@/models/Invoice";
import { restore } from "@/utils/softDelete";
import { getVoidedJournalsForReference, createJournalWithDate } from "@/utils/journalManager";
import { requireAuthAndPermission, validateRequiredFields } from "@/lib/auth-utils";
import { deductStockForInvoice } from "@/utils/inventoryManager";

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();

    const { error: validationError } = validateRequiredFields(body, ["id"]);
    if (validationError) return validationError;

    const { id } = body;

    // Get the invoice before restoring to check permission
    const invoiceToRestore = await Invoice.findById(id).setOptions({ includeDeleted: true });

    if (!invoiceToRestore) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Permission Check
    const { error, session } = await requireAuthAndPermission({
      invoice: ["restore"],
    });
    if (error) return error;

    const user = session.user;

    if (!invoiceToRestore.isDeleted) {
      return NextResponse.json({
        error: "Invoice is not deleted"
      }, { status: 400 });
    }

    const deletedAt = invoiceToRestore.deletedAt;

    // Get all voided journals for this invoice
    const voidedJournals = await getVoidedJournalsForReference(id);

    // Filter journals: only those voided within 1 minute of document deletion
    const eligibleJournals = deletedAt
      ? voidedJournals.filter(journal => {
        const voidAction = journal.actionHistory?.find((action: any) =>
          action.action && action.action.includes('Voided')
        );

        if (!voidAction) return false;

        const voidTime = new Date(voidAction.timestamp).getTime();
        const deleteTime = new Date(deletedAt).getTime();
        const timeDiff = Math.abs(voidTime - deleteTime);

        return timeDiff < 60000; // 60 seconds
      })
      : voidedJournals;

    // For invoices, recreate the most recent eligible journal
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
    console.log(`📋 Invoice: Found ${voidedJournals.length} voided journal(s), ${journalsToRecreate.length} to recreate`);

    // ✅ STOCK DEDUCTION: Deduct stock if invoice was approved
    if (invoiceToRestore.status === 'approved') {
      try {
        await deductStockForInvoice(
          invoiceToRestore._id,
          invoiceToRestore.items
        );
      } catch (stockError: any) {
        return NextResponse.json({
          error: `Cannot restore invoice: ${stockError.message}`
        }, { status: 400 });
      }
    }


    // Restore the invoice
    const restoredInvoice = await restore(
      Invoice,
      id,
      user?.id || null,
      user?.username || user?.name || null
    );

    if (!restoredInvoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Recreate journals
    if (journalsToRecreate.length > 0) {

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
    }

    let message = `Invoice restored successfully`;
    if (journalsToRecreate.length > 0) {
      message += ` with ${journalsToRecreate.length} journal(s) recreated`;
    }

    return NextResponse.json({
      message,
      invoice: restoredInvoice,
      journalsRecreated: journalsToRecreate.length
    });
  } catch (error) {
    console.error("Failed to restore invoice:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}