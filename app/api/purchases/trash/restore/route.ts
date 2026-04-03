// app/api/purchases/trash/restore/route.ts - COMPLETE with Three Statuses

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Purchase from "@/models/Purchase";
import { restore } from "@/utils/softDelete";
import { getVoidedJournalsForReference, createJournalWithDate } from "@/utils/journalManager";
import { getUserInfo } from "@/lib/auth-helpers";
import { requireAuthAndPermission, validateRequiredFields } from "@/lib/auth-utils";
import { addStockForPurchase } from "@/utils/inventoryManager";

/**
 * Helper to get actual received quantity for an item based on inventory status
 */
function getReceivedQuantity(item: any, inventoryStatus: string): number {
  if (inventoryStatus === 'received') {
    return item.quantity;
  } else if (inventoryStatus === 'partially received') {
    return item.receivedQuantity || 0;
  }
  return 0;
}

/**
 * POST - Restore a soft-deleted purchase and recreate ONLY the most recent journal
 */
export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { id } = body;

    // Validate required fields
    const { error: validationError } = validateRequiredFields(body, ["id"]);
    if (validationError) return validationError;

    // Check authentication and permission
    const { error, session } = await requireAuthAndPermission({
      purchase: ["restore"],
    });

    if (error) return error;

    const user = await getUserInfo();

    // Get the purchase before restoring to re-add stock
    const purchaseToRestore = await Purchase.findById(id).setOptions({ includeDeleted: true });
    if (!purchaseToRestore) {
      return NextResponse.json({ error: "Purchase not found" }, { status: 404 });
    }

    if (!purchaseToRestore.isDeleted) {
      return NextResponse.json({
        error: "Purchase is not deleted"
      }, { status: 400 });
    }

    console.log(`👤 Restoring purchase as user:`, {
      id: user.id,
      username: user.username,
      name: user.name
    });

    // Get the deletion timestamp
    const deletedAt = purchaseToRestore.deletedAt;

    // Get voided journals for this purchase
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

    // 🔥 Only recreate the MOST RECENT journal
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

    // ✅ UPDATED: Re-add stock based on inventoryStatus
    if (purchaseToRestore.inventoryStatus === 'received' || purchaseToRestore.inventoryStatus === 'partially received') {
      console.log(`📦 Re-adding stock for ${purchaseToRestore.inventoryStatus} purchase`);

      const itemsWithQty = purchaseToRestore.items
        .map((item: any) => ({
          itemId: item.itemId?.toString(),
          itemName: item.description,
          quantity: getReceivedQuantity(item, purchaseToRestore.inventoryStatus)
        }))
        .filter((item: any) => item.quantity > 0 && item.itemId);

      const reason = purchaseToRestore.inventoryStatus === 'received'
        ? 'Purchase restored (fully received)'
        : 'Purchase restored (partially received)';

      await addStockForPurchase(
        purchaseToRestore._id,
        itemsWithQty,
        reason
      );

      console.log(`✅ Stock re-added for ${itemsWithQty.length} material(s)`);
    }

    // Restore the purchase
    const restoredPurchase = await restore(
      Purchase,
      id,
      user.id,
      user.username || user.name || null
    );

    if (!restoredPurchase) {
      return NextResponse.json({ error: "Purchase not found" }, { status: 404 });
    }

    // Recreate ONLY the most recent journal
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
          user?.id || null,
          user?.username || user?.name || null
        );
      }

      console.log(`✅ Recreated ${journalsToRecreate.length} journal entries`);
    }

    return NextResponse.json({
      message: `Purchase restored successfully${journalsToRecreate.length > 0 ? ` with ${journalsToRecreate.length} journal(s) recreated` : ''}`,
      purchase: restoredPurchase,
      journalsRecreated: journalsToRecreate.length
    });
  } catch (error) {
    console.error("Failed to restore purchase:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}