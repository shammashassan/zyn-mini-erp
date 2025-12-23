// app/api/vouchers/[id]/route.ts - COMPLETE: Added Refund Support

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Voucher from "@/models/Voucher";
import Purchase from "@/models/Purchase";
import Invoice from "@/models/Invoice";
import { softDelete } from "@/utils/softDelete";
import { voidJournalsForReference } from '@/utils/journalManager';
import { requireAuthAndPermission } from "@/lib/auth-utils";
import { formatCurrency } from "@/utils/formatters/currency";

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
      
      for (const allocation of voucher.allocations) {
        if (allocation.documentType === 'invoice') {
          const invoice = await Invoice.findById(allocation.documentId);
          
          if (invoice && !invoice.isDeleted) {
            // ✅ RECEIPT VOUCHER
            if (voucher.voucherType === 'receipt') {
              console.log(`💰 Deallocating ${formatCurrency(allocation.amount)} from invoice ${invoice.invoiceNumber}`);
              
              if (typeof invoice.deallocateReceipt === 'function') {
                const removedAmount = invoice.deallocateReceipt(voucher._id);
                
                invoice.addAuditEntry(
                  'Receipt Voucher Deleted',
                  user.id,
                  user.username || user.name,
                  [{
                    field: 'Deallocated Amount',
                    oldValue: formatCurrency(removedAmount),
                    newValue: formatCurrency(0)
                  }]
                );
              } else {
                console.log('⚠️ Using fallback deallocation (old model)');
                
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
                
                invoice.addAuditEntry(
                  'Receipt Voucher Deleted',
                  user.id,
                  user.username || user.name
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
            
            // ✅ REFUND VOUCHER
            else if (voucher.voucherType === 'refund') {
              console.log(`💰 Deallocating refund ${formatCurrency(allocation.amount)} from invoice ${invoice.invoiceNumber}`);
              
              const oldStatus = invoice.status;
              if (typeof invoice.deallocateRefund === 'function') {
                const removedAmount = invoice.deallocateRefund(voucher._id);
                
                invoice.status = 'approved';
                
                invoice.addAuditEntry(
                  'Refund Voucher Deleted',
                  user.id,
                  user.username || user.name,
                  [{
                    field: 'Deallocated Refund Amount',
                    oldValue: formatCurrency(removedAmount),
                    newValue: formatCurrency(0)
                  }]
                );
              }
              
              const updatedRefundIds = (invoice.connectedDocuments?.refundIds || [])
                .filter((rid: any) => rid.toString() !== id);
              
              invoice.connectedDocuments = {
                ...invoice.connectedDocuments,
                refundIds: updatedRefundIds
              };
              
              await invoice.save();
              console.log(`✅ Invoice ${invoice.invoiceNumber} restored to approved`);

              if (oldStatus === 'cancelled' && invoice.status === 'approved') {
                console.log(`📄 Restoring invoice journal due to refund deletion (${oldStatus} → approved)`);
                const { handleInvoiceStatusChange } = await import('@/utils/journalAutoCreate');
                await handleInvoiceStatusChange(
                  invoice.toObject(),
                  oldStatus,
                  'approved',
                  user.id,
                  user.username || user.name
                );
              }
            }
          }
        } else if (allocation.documentType === 'purchase') {
          const purchase = await Purchase.findById(allocation.documentId);
          
          if (purchase && !purchase.isDeleted) {
            console.log(`💰 Deallocating ${formatCurrency(allocation.amount)} from purchase ${purchase.referenceNumber}`);
            
            if (typeof purchase.deallocatePayment === 'function') {
              const removedAmount = purchase.deallocatePayment(voucher._id);
              
              purchase.addAuditEntry(
                'Payment Voucher Deleted',
                user.id,
                user.username || user.name,
                [{
                  field: 'Deallocated Amount',
                  oldValue: formatCurrency(removedAmount),
                  newValue: formatCurrency(0)
                }]
              );
            } else {
              console.log('⚠️ Using fallback deallocation (old model)');
              
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
              
              purchase.addAuditEntry(
                'Payment Voucher Deleted',
                user.id,
                user.username || user.name
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
          // ✅ NEW: Handle expense deallocation
          const Expense = (await import('@/models/Expense')).default;
          const expense = await Expense.findById(allocation.documentId);
          
          if (expense && !expense.isDeleted) {
            console.log(`💰 Deallocating ${formatCurrency(allocation.amount)} from expense ${expense.referenceNumber}`);
            
            if (typeof expense.deallocatePayment === 'function') {
              const removedAmount = expense.deallocatePayment(voucher._id);
              
              expense.addAuditEntry(
                'Payment Voucher Deleted',
                user.id,
                user.username || user.name,
                [{
                  field: 'Deallocated Amount',
                  oldValue: formatCurrency(removedAmount),
                  newValue: formatCurrency(0)
                }]
              );
            } else {
              console.log('⚠️ Using fallback deallocation (old model)');
              
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
              
              expense.addAuditEntry(
                'Payment Voucher Deleted',
                user.id,
                user.username || user.name
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
      }
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
            for (const receiptId of updatedReceiptIds) {
              try {
                const receipt = await Voucher.findById(receiptId);
                if (receipt && !receipt.isDeleted) {
                  newPaidAmount += receipt.grandTotal;
                }
              } catch (err) {
                console.error(`Failed to fetch receipt ${receiptId}:`, err);
              }
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
            for (const paymentId of updatedPaymentIds) {
              try {
                const payment = await Voucher.findById(paymentId);
                if (payment && !payment.isDeleted) {
                  newPaidAmount += payment.grandTotal;
                }
              } catch (err) {
                console.error(`Failed to fetch payment ${paymentId}:`, err);
              }
            }
            
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
                oldValue: purchase.paidAmount + voucher.grandTotal,
                newValue: newPaidAmount
              }]
            );
            
            await purchase.save();
            console.log(`✅ Purchase ${purchase.referenceNumber} updated - paidAmount: ${formatCurrency(newPaidAmount)}`);
          }
        }
      }
      
      // ✅ NEW: Handle old system expenses
      if (voucher.voucherType === 'payment' && voucher.connectedDocuments?.expenseIds) {
        const Expense = (await import('@/models/Expense')).default;
        
        for (const expenseId of voucher.connectedDocuments.expenseIds) {
          const expense = await Expense.findById(expenseId);
          
          if (expense && !expense.isDeleted) {
            console.log(`💰 Removing payment from expense ${expense.referenceNumber}`);
            
            const updatedPaymentIds = (expense.connectedDocuments?.paymentIds || [])
              .filter((pid: any) => pid.toString() !== id);
            
            let newPaidAmount = 0;
            for (const paymentId of updatedPaymentIds) {
              try {
                const payment = await Voucher.findById(paymentId);
                if (payment && !payment.isDeleted) {
                  newPaidAmount += payment.grandTotal;
                }
              } catch (err) {
                console.error(`Failed to fetch payment ${paymentId}:`, err);
              }
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
    }
    
    // Void all related journals when soft deleting
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