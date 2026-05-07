// app/api/vouchers/[id]/route.ts - PUT and DELETE operations

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Voucher from "@/models/Voucher";
import Purchase from "@/models/Purchase";
import Expense from "@/models/Expense";
import Invoice from "@/models/Invoice";
import DebitNote from "@/models/DebitNote";
import CreditNote from "@/models/CreditNote";
import { softDelete } from "@/utils/softDelete";
import { voidJournalsForReference } from '@/utils/journalManager';
import { requireAuthAndPermission } from "@/lib/auth-utils";
import { formatCurrency } from "@/utils/formatters/currency";
import { createPartySnapshot } from "@/utils/partySnapshot";

interface RequestContext {
  params: Promise<{
    id: string;
  }>
}

export async function GET(request: Request, context: RequestContext) {
  try {
    await dbConnect();
    const { id } = await context.params;

    const { error } = await requireAuthAndPermission({
      voucher: ["read"],
    });
    if (error) return error;

    const voucherQuery = Voucher.findById(id);
    const includeDeleted = request.headers.get('X-Include-Deleted') === 'true';
    if (includeDeleted) {
      voucherQuery.setOptions({ includeDeleted: true });
    }
    const voucher = await voucherQuery;

    if (!voucher) {
      return NextResponse.json({ error: "Voucher not found" }, { status: 404 });
    }

    if (voucher.isDeleted && !includeDeleted) {
      return NextResponse.json({
        error: "This voucher has been deleted"
      }, { status: 410 });
    }

    return NextResponse.json(voucher);
  } catch (error) {
    const params = await context.params;
    console.error(`❌ Failed to fetch voucher ${params.id}:`, error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

function detectChanges(oldVoucher: any, newData: any) {
  const changes: Array<{ field: string; oldValue: any; newValue: any }> = [];
  const fieldsToTrack = ['grandTotal', 'paymentMethod', 'notes'];

  for (const field of fieldsToTrack) {
    if (newData[field] !== undefined && oldVoucher[field] !== newData[field]) {
      changes.push({
        field,
        oldValue: oldVoucher[field],
        newValue: newData[field],
      });
    }
  }

  return changes;
}

export async function PUT(request: Request, context: RequestContext) {
  try {
    await dbConnect();
    const { id } = await context.params;
    const body = await request.json();

    const { error, session } = await requireAuthAndPermission({
      voucher: ["update"],
    });
    if (error) return error;

    const user = session.user;

    const currentVoucher = await Voucher.findById(id);
    if (!currentVoucher) {
      return NextResponse.json({ error: "Voucher not found" }, { status: 404 });
    }

    if (currentVoucher.isDeleted) {
      return NextResponse.json({
        error: "Cannot update a deleted voucher. Please restore it first."
      }, { status: 400 });
    }

    // ✅ Handle party/contact changes - update snapshots
    if (body.partyId && body.partyId !== currentVoucher.partyId?.toString()) {
      console.log(`🔄 Party changed for voucher ${id}, updating snapshots`);

      const { partySnapshot, contactSnapshot } = await createPartySnapshot(
        body.partyId,
        body.contactId
      );

      body.partySnapshot = partySnapshot;
      body.contactSnapshot = contactSnapshot;

      console.log(`   Old Party: ${currentVoucher.partySnapshot?.displayName || 'None'}`);
      console.log(`   New Party: ${partySnapshot.displayName}`);
    }
    // ✅ If only contact changed (same party)
    else if (body.contactId && body.contactId !== currentVoucher.contactId?.toString()) {
      console.log(`🔄 Contact changed for voucher ${id}, updating contact snapshot`);

      if (currentVoucher.partyId) {
        const { contactSnapshot } = await createPartySnapshot(
          currentVoucher.partyId.toString(),
          body.contactId
        );

        body.contactSnapshot = contactSnapshot;
      }
    }

    const changes = detectChanges(currentVoucher.toObject(), body);

    currentVoucher.addAuditEntry(
      'Updated',
      user.id,
      user.username || user.name,
      changes.length > 0 ? changes : undefined
    );

    currentVoucher.set({
      ...body,
      updatedBy: user.id,
    });

    await currentVoucher.save();

    console.log(`✅ Voucher ${id} updated successfully`);

    return NextResponse.json(currentVoucher);
  } catch (error) {
    const params = await context.params;
    console.error(`❌ Failed to update voucher ${params.id}:`, error);
    return NextResponse.json({ error: "Failed to update voucher" }, { status: 400 });
  }
}

export async function DELETE(request: Request, context: RequestContext) {
  try {
    await dbConnect();
    const { id } = await context.params;

    const { error, session } = await requireAuthAndPermission({
      voucher: ["soft_delete"],
    });
    if (error) return error;

    const user = session.user;

    const voucher = await Voucher.findById(id);

    if (!voucher) {
      return NextResponse.json({ error: "Voucher not found" }, { status: 404 });
    }

    console.log(`🔴 DELETE /api/vouchers/${id}`);

    const hasNewAllocationSystem = voucher.allocations && voucher.allocations.length > 0;

    if (hasNewAllocationSystem) {
      // ===== NEW SYSTEM: Use allocations =====
      console.log(`📉 Removing ${voucher.allocations.length} allocation(s)...`);

      await Promise.all(voucher.allocations.map(async (allocation: any) => {
        if (allocation.documentType === 'invoice') {
          const invoice = await Invoice.findById(allocation.documentId);

          if (invoice && !invoice.isDeleted) {
            if (voucher.voucherType === 'receipt') {
              console.log(`💰 Deallocating ${formatCurrency(allocation.amount)} from invoice ${invoice.invoiceNumber}`);

              if (typeof invoice.deallocateReceipt === 'function') {
                // 📊 Get current total BEFORE deallocation
                const oldTotal = invoice.getTotalAllocated();

                const removedAmount = invoice.deallocateReceipt(voucher._id);

                // 📊 Calculate new total AFTER deallocation
                const newTotal = oldTotal - removedAmount;

                // ✅ Add audit entry showing cumulative progression
                invoice.addAuditEntry(
                  'Receipt Voucher Deleted',
                  user.id,
                  user.username || user.name,
                  [{
                    field: 'Total Received',
                    oldValue: formatCurrency(oldTotal),
                    newValue: formatCurrency(newTotal)
                  }]
                );
              } else {
                console.log('⚠️ Using fallback deallocation (old model)');

                // 📊 Get current total BEFORE deallocation
                const oldTotal = invoice.paidAmount || 0;

                if (invoice.receiptAllocations) {
                  const index = invoice.receiptAllocations.findIndex(
                    (alloc: any) => alloc.voucherId.toString() === voucher._id.toString()
                  );

                  if (index !== -1) {
                    invoice.receiptAllocations.splice(index, 1);
                  }
                }

                if (invoice.receiptAllocations && invoice.receiptAllocations.length > 0) {
                  invoice.paidAmount = invoice.receiptAllocations.reduce(
                    (sum: number, alloc: any) => sum + alloc.allocatedAmount,
                    0
                  );
                } else {
                  invoice.paidAmount = 0;
                }

                // 📊 Calculate new total AFTER deallocation
                const newTotal = invoice.paidAmount;

                // ✅ Add audit entry showing cumulative progression
                invoice.addAuditEntry(
                  'Receipt Voucher Deleted',
                  user.id,
                  user.username || user.name,
                  [{
                    field: 'Total Received',
                    oldValue: formatCurrency(oldTotal),
                    newValue: formatCurrency(newTotal)
                  }]
                );
              }

              const updatedReceiptIds = (invoice.connectedDocuments?.receiptIds || [])
                .filter((rid: any) => rid.toString() !== id);

              invoice.connectedDocuments = {
                ...invoice.connectedDocuments,
                receiptIds: updatedReceiptIds
              };

              await invoice.save();
              console.log(`✅ Invoice ${invoice.invoiceNumber} updated`);
            }
          }
        } else if (allocation.documentType === 'purchase') {
          const purchase = await Purchase.findById(allocation.documentId);

          if (purchase && !purchase.isDeleted) {
            console.log(`💰 Deallocating ${formatCurrency(allocation.amount)} from purchase ${purchase.referenceNumber}`);

            if (typeof purchase.deallocatePayment === 'function') {
              // 📊 Get current total BEFORE deallocation
              const oldTotal = purchase.getTotalAllocated();

              const removedAmount = purchase.deallocatePayment(voucher._id);

              // 📊 Calculate new total AFTER deallocation
              const newTotal = oldTotal - removedAmount;

              // ✅ Add audit entry showing cumulative progression
              purchase.addAuditEntry(
                'Payment Voucher Deleted',
                user.id,
                user.username || user.name,
                [{
                  field: 'Total Paid',
                  oldValue: formatCurrency(oldTotal),
                  newValue: formatCurrency(newTotal)
                }]
              );
            } else {
              console.log('⚠️ Using fallback deallocation (old model)');

              // 📊 Get current total BEFORE deallocation
              const oldTotal = purchase.paidAmount || 0;

              if (purchase.paymentAllocations) {
                const index = purchase.paymentAllocations.findIndex(
                  (alloc: any) => alloc.voucherId.toString() === voucher._id.toString()
                );

                if (index !== -1) {
                  purchase.paymentAllocations.splice(index, 1);
                }
              }

              if (purchase.paymentAllocations && purchase.paymentAllocations.length > 0) {
                purchase.paidAmount = purchase.paymentAllocations.reduce(
                  (sum: number, alloc: any) => sum + alloc.allocatedAmount,
                  0
                );
              } else {
                purchase.paidAmount = 0;
              }

              // 📊 Calculate new total AFTER deallocation
              const newTotal = purchase.paidAmount;

              // ✅ Add audit entry showing cumulative progression
              purchase.addAuditEntry(
                'Payment Voucher Deleted',
                user.id,
                user.username || user.name,
                [{
                  field: 'Total Paid',
                  oldValue: formatCurrency(oldTotal),
                  newValue: formatCurrency(newTotal)
                }]
              );
            }

            const updatedPaymentIds = (purchase.connectedDocuments?.paymentIds || [])
              .filter((pid: any) => pid.toString() !== id);

            purchase.connectedDocuments = {
              ...purchase.connectedDocuments,
              paymentIds: updatedPaymentIds
            };

            await purchase.save();
            console.log(`✅ Purchase ${purchase.referenceNumber} updated`);
          }
        } else if (allocation.documentType === 'expense') {
          const expense = await Expense.findById(allocation.documentId);

          if (expense && !expense.isDeleted) {
            console.log(`💰 Deallocating ${formatCurrency(allocation.amount)} from expense ${expense.referenceNumber}`);

            if (typeof expense.deallocatePayment === 'function') {
              // 📊 Get current total BEFORE deallocation
              const oldTotal = expense.getTotalAllocated();

              const removedAmount = expense.deallocatePayment(voucher._id);

              // 📊 Calculate new total AFTER deallocation
              const newTotal = oldTotal - removedAmount;

              // ✅ Add audit entry showing cumulative progression
              expense.addAuditEntry(
                'Payment Voucher Deleted',
                user.id,
                user.username || user.name,
                [{
                  field: 'Total Paid',
                  oldValue: formatCurrency(oldTotal),
                  newValue: formatCurrency(newTotal)
                }]
              );
            } else {
              console.log('⚠️ Using fallback deallocation (old model)');

              // 📊 Get current total BEFORE deallocation
              const oldTotal = expense.paidAmount || 0;

              if (expense.paymentAllocations) {
                const index = expense.paymentAllocations.findIndex(
                  (alloc: any) => alloc.voucherId.toString() === voucher._id.toString()
                );

                if (index !== -1) {
                  expense.paymentAllocations.splice(index, 1);
                }
              }

              if (expense.paymentAllocations && expense.paymentAllocations.length > 0) {
                expense.paidAmount = expense.paymentAllocations.reduce(
                  (sum: number, alloc: any) => sum + alloc.allocatedAmount,
                  0
                );
              } else {
                expense.paidAmount = 0;
              }

              // 📊 Calculate new total AFTER deallocation
              const newTotal = expense.paidAmount;

              // ✅ Add audit entry showing cumulative progression
              expense.addAuditEntry(
                'Payment Voucher Deleted',
                user.id,
                user.username || user.name,
                [{
                  field: 'Total Paid',
                  oldValue: formatCurrency(oldTotal),
                  newValue: formatCurrency(newTotal)
                }]
              );
            }

            const updatedPaymentIds = (expense.connectedDocuments?.paymentIds || [])
              .filter((pid: any) => pid.toString() !== id);

            expense.connectedDocuments = {
              ...expense.connectedDocuments,
              paymentIds: updatedPaymentIds
            };

            await expense.save();
            console.log(`✅ Expense ${expense.referenceNumber} updated`);
          }
        }
        else if (allocation.documentType === 'debitNote') {
          const debitNote = await DebitNote.findById(allocation.documentId);

          if (debitNote && !debitNote.isDeleted) {
            console.log(`💰 Deallocating ${formatCurrency(allocation.amount)} from debit note ${debitNote.debitNoteNumber}`);

            if (typeof debitNote.deallocateReceipt === 'function') {
              // 📊 Get current total BEFORE deallocation
              const oldTotal = debitNote.getTotalAllocated();

              const removedAmount = debitNote.deallocateReceipt(voucher._id);

              // 📊 Calculate new total AFTER deallocation
              const newTotal = oldTotal - removedAmount;

              // ✅ Add audit entry showing cumulative progression
              debitNote.addAuditEntry(
                'Receipt Voucher Deleted',
                user.id,
                user.username || user.name,
                [{
                  field: 'Total Received',
                  oldValue: formatCurrency(oldTotal),
                  newValue: formatCurrency(newTotal)
                }]
              );
            } else {
              console.log('⚠️ Using fallback deallocation (old model)');

              // 📊 Get current total BEFORE deallocation
              const oldTotal = debitNote.receivedAmount || 0;

              if (debitNote.receiptAllocations) {
                const index = debitNote.receiptAllocations.findIndex(
                  (alloc: any) => alloc.voucherId.toString() === voucher._id.toString()
                );

                if (index !== -1) {
                  debitNote.receiptAllocations.splice(index, 1);
                }
              }

              if (debitNote.receiptAllocations && debitNote.receiptAllocations.length > 0) {
                debitNote.receivedAmount = debitNote.receiptAllocations.reduce(
                  (sum: number, alloc: any) => sum + alloc.allocatedAmount,
                  0
                );
              } else {
                debitNote.receivedAmount = 0;
              }

              // 📊 Calculate new total AFTER deallocation
              const newTotal = debitNote.receivedAmount;

              // ✅ Add audit entry showing cumulative progression
              debitNote.addAuditEntry(
                'Receipt Voucher Deleted',
                user.id,
                user.username || user.name,
                [{
                  field: 'Total Received',
                  oldValue: formatCurrency(oldTotal),
                  newValue: formatCurrency(newTotal)
                }]
              );
            }

            const updatedReceiptIds = (debitNote.connectedDocuments?.receiptIds || [])
              .filter((rid: any) => rid.toString() !== id);

            debitNote.connectedDocuments = {
              ...debitNote.connectedDocuments,
              receiptIds: updatedReceiptIds
            };

            await debitNote.save();
            console.log(`✅ Debit Note ${debitNote.debitNoteNumber} updated`);
          }
        }
        else if (allocation.documentType === 'creditNote') {
          const creditNote = await CreditNote.findById(allocation.documentId);

          if (creditNote && !creditNote.isDeleted) {
            console.log(`💰 Deallocating ${formatCurrency(allocation.amount)} from credit note ${creditNote.creditNoteNumber}`);

            if (typeof creditNote.deallocatePayment === 'function') {
              // 📊 Get current total BEFORE deallocation
              const oldTotal = creditNote.getTotalAllocated();

              const removedAmount = creditNote.deallocatePayment(voucher._id);

              // 📊 Calculate new total AFTER deallocation
              const newTotal = oldTotal - removedAmount;

              // ✅ Add audit entry showing cumulative progression
              creditNote.addAuditEntry(
                'Payment Voucher Deleted',
                user.id,
                user.username || user.name,
                [{
                  field: 'Total Paid',
                  oldValue: formatCurrency(oldTotal),
                  newValue: formatCurrency(newTotal)
                }]
              );
            } else {
              console.log('⚠️ Using fallback deallocation (old model)');

              // 📊 Get current total BEFORE deallocation
              const oldTotal = creditNote.paidAmount || 0;

              if (creditNote.paymentAllocations) {
                const index = creditNote.paymentAllocations.findIndex(
                  (alloc: any) => alloc.voucherId.toString() === voucher._id.toString()
                );

                if (index !== -1) {
                  creditNote.paymentAllocations.splice(index, 1);
                }
              }

              if (creditNote.paymentAllocations && creditNote.paymentAllocations.length > 0) {
                creditNote.paidAmount = creditNote.paymentAllocations.reduce(
                  (sum: number, alloc: any) => sum + alloc.allocatedAmount,
                  0
                );
              } else {
                creditNote.paidAmount = 0;
              }

              // 📊 Calculate new total AFTER deallocation
              const newTotal = creditNote.paidAmount;

              // ✅ Add audit entry showing cumulative progression
              creditNote.addAuditEntry(
                'Payment Voucher Deleted',
                user.id,
                user.username || user.name,
                [{
                  field: 'Total Paid',
                  oldValue: formatCurrency(oldTotal),
                  newValue: formatCurrency(newTotal)
                }]
              );
            }

            const updatedPaymentIds = (creditNote.connectedDocuments?.paymentIds || [])
              .filter((pid: any) => pid.toString() !== id);

            creditNote.connectedDocuments = {
              ...creditNote.connectedDocuments,
              paymentIds: updatedPaymentIds
            };

            await creditNote.save();
            console.log(`✅ Credit Note ${creditNote.creditNoteNumber} updated`);
          }
        }
      }));
    } else {
      // ===== OLD SYSTEM: Use connectedDocuments =====
      console.log('⚠️ Using old system (no allocations stored)');

      if (voucher.voucherType === 'receipt' && voucher.connectedDocuments?.invoiceIds) {
        for (const invoiceId of voucher.connectedDocuments.invoiceIds) {
          const invoice = await Invoice.findById(invoiceId);

          if (invoice && !invoice.isDeleted) {
            console.log(`💰 Removing receipt from invoice ${invoice.invoiceNumber}`);

            const updatedReceiptIds = (invoice.connectedDocuments?.receiptIds || [])
              .filter((rid: any) => rid.toString() !== id);

            let newPaidAmount = 0;
            try {
              const receipts = await Voucher.find({ _id: { $in: updatedReceiptIds }, isDeleted: { $ne: true } }).select("grandTotal").lean();
              newPaidAmount = receipts.reduce((sum: number, r: any) => sum + r.grandTotal, 0);
            } catch (err) {
              console.error(`Failed to batch fetch receipts for updated ids:`, err);
            }

            const oldPaidAmount = invoice.paidAmount;

            invoice.paidAmount = newPaidAmount;
            invoice.connectedDocuments = {
              ...invoice.connectedDocuments,
              receiptIds: updatedReceiptIds
            };

            invoice.addAuditEntry(
              'Receipt Voucher Deleted',
              user.id,
              user.username || user.name,
              [{
                field: 'paidAmount',
                oldValue: oldPaidAmount,
                newValue: newPaidAmount
              }]
            );

            await invoice.save();
            console.log(`✅ Invoice ${invoice.invoiceNumber} updated - paidAmount: ${formatCurrency(newPaidAmount)}`);
          }
        }
      }

      if (voucher.voucherType === 'payment' && voucher.connectedDocuments?.purchaseIds) {
        for (const purchaseId of voucher.connectedDocuments.purchaseIds) {
          const purchase = await Purchase.findById(purchaseId);

          if (purchase && !purchase.isDeleted) {
            console.log(`💰 Removing payment from purchase ${purchase.referenceNumber}`);

            const updatedPaymentIds = (purchase.connectedDocuments?.paymentIds || [])
              .filter((pid: any) => pid.toString() !== id);

            let newPaidAmount = 0;
            try {
              const payments = await Voucher.find({ _id: { $in: updatedPaymentIds }, isDeleted: { $ne: true } }).select("grandTotal").lean();
              newPaidAmount = payments.reduce((sum: number, p: any) => sum + p.grandTotal, 0);
            } catch (err) {
              console.error(`Failed to batch fetch payments for updated ids:`, err);
            }

            const oldPaidAmount = purchase.paidAmount;

            purchase.paidAmount = newPaidAmount;
            purchase.connectedDocuments = {
              ...purchase.connectedDocuments,
              paymentIds: updatedPaymentIds
            };

            purchase.addAuditEntry(
              'Payment Voucher Deleted',
              user.id,
              user.username || user.name,
              [{
                field: 'paidAmount',
                oldValue: oldPaidAmount,
                newValue: newPaidAmount
              }]
            );

            await purchase.save();
            console.log(`✅ Purchase ${purchase.referenceNumber} updated - paidAmount: ${formatCurrency(newPaidAmount)}`);
          }
        }
      }

      if (voucher.voucherType === 'payment' && voucher.connectedDocuments?.expenseIds) {
        for (const expenseId of voucher.connectedDocuments.expenseIds) {
          const expense = await Expense.findById(expenseId);

          if (expense && !expense.isDeleted) {
            console.log(`💰 Removing payment from expense ${expense.referenceNumber}`);

            const updatedPaymentIds = (expense.connectedDocuments?.paymentIds || [])
              .filter((pid: any) => pid.toString() !== id);

            let newPaidAmount = 0;
            try {
              const payments = await Voucher.find({ _id: { $in: updatedPaymentIds }, isDeleted: { $ne: true } }).select("grandTotal").lean();
              newPaidAmount = payments.reduce((sum: number, p: any) => sum + p.grandTotal, 0);
            } catch (err) {
              console.error(`Failed to batch fetch payments for updated ids:`, err);
            }

            expense.paidAmount = newPaidAmount;
            expense.connectedDocuments = {
              ...expense.connectedDocuments,
              paymentIds: updatedPaymentIds
            };

            expense.addAuditEntry(
              'Payment Voucher Deleted',
              user.id,
              user.username || user.name,
              [{
                field: 'paidAmount',
                oldValue: expense.paidAmount + voucher.grandTotal,
                newValue: newPaidAmount
              }]
            );

            await expense.save();
            console.log(`✅ Expense ${expense.referenceNumber} updated - paidAmount: ${formatCurrency(newPaidAmount)}`);
          }
        }
      }

      if (voucher.voucherType === 'receipt' && voucher.connectedDocuments?.debitNoteIds) {
        for (const debitNoteId of voucher.connectedDocuments.debitNoteIds) {
          const debitNote = await DebitNote.findById(debitNoteId);

          if (debitNote && !debitNote.isDeleted) {
            console.log(`💰 Removing receipt from debit note ${debitNote.debitNoteNumber}`);

            const updatedReceiptIds = (debitNote.connectedDocuments?.receiptIds || [])
              .filter((rid: any) => rid.toString() !== id);

            let newReceivedAmount = 0;
            try {
              const receipts = await Voucher.find({ _id: { $in: updatedReceiptIds }, isDeleted: { $ne: true } }).select("grandTotal").lean();
              newReceivedAmount = receipts.reduce((sum: number, r: any) => sum + r.grandTotal, 0);
            } catch (err) {
              console.error(`Failed to batch fetch receipts for updated ids:`, err);
            }

            debitNote.receivedAmount = newReceivedAmount;
            debitNote.connectedDocuments = {
              ...debitNote.connectedDocuments,
              receiptIds: updatedReceiptIds
            };

            debitNote.addAuditEntry(
              'Receipt Voucher Deleted',
              user.id,
              user.username || user.name,
              [{
                field: 'receivedAmount',
                oldValue: debitNote.receivedAmount + voucher.grandTotal,
                newValue: newReceivedAmount
              }]
            );

            await debitNote.save();
            console.log(`✅ Debit Note ${debitNote.debitNoteNumber} updated - receivedAmount: ${formatCurrency(newReceivedAmount)}`);
          }
        }
      }

      if (voucher.voucherType === 'payment' && voucher.connectedDocuments?.creditNoteIds) {
        for (const creditNoteId of voucher.connectedDocuments.creditNoteIds) {
          const creditNote = await CreditNote.findById(creditNoteId);

          if (creditNote && !creditNote.isDeleted) {
            console.log(`💰 Removing payment from credit note ${creditNote.creditNoteNumber}`);

            const updatedPaymentIds = (creditNote.connectedDocuments?.paymentIds || [])
              .filter((pid: any) => pid.toString() !== id);

            let newPaidAmount = 0;
            try {
              const payments = await Voucher.find({ _id: { $in: updatedPaymentIds }, isDeleted: { $ne: true } }).select("grandTotal").lean();
              newPaidAmount = payments.reduce((sum: number, p: any) => sum + p.grandTotal, 0);
            } catch (err) {
              console.error(`Failed to batch fetch payments for updated ids:`, err);
            }

            creditNote.paidAmount = newPaidAmount;
            creditNote.connectedDocuments = {
              ...creditNote.connectedDocuments,
              paymentIds: updatedPaymentIds
            };

            creditNote.addAuditEntry(
              'Payment Voucher Deleted',
              user.id,
              user.username || user.name,
              [{
                field: 'paidAmount',
                oldValue: creditNote.paidAmount + voucher.grandTotal,
                newValue: newPaidAmount
              }]
            );

            await creditNote.save();
            console.log(`✅ Credit Note ${creditNote.creditNoteNumber} updated - paidAmount: ${formatCurrency(newPaidAmount)}`);
          }
        }
      }
    }

    await voidJournalsForReference(
      voucher._id,
      user.id,
      user.username || user.name,
      `${voucher.voucherType} voucher soft deleted`
    );

    voucher.addAuditEntry(
      'Soft Deleted',
      user.id,
      user.username || user.name
    );

    await voucher.save();

    console.log(`Deleting ${voucher.voucherType} voucher ${voucher.invoiceNumber}`);

    const deletedVoucher = await softDelete(Voucher, id, user.id, user.username || user.name);

    console.log(`✅ Successfully soft deleted ${voucher.voucherType} voucher ${voucher.invoiceNumber}`);

    return NextResponse.json({
      message: "Voucher soft deleted successfully",
      voucher: deletedVoucher
    });
  } catch (error) {
    const params = await context.params;
    console.error(`❌ Failed to delete voucher ${params.id}:`, error);
    return NextResponse.json({
      error: "Server error",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}