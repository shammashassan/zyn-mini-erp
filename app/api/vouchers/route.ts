// app/api/vouchers/route.ts - UPDATED: Support all party types for all voucher types

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Voucher from "@/models/Voucher";
import Customer from "@/models/Customer";
import Supplier from "@/models/Supplier";
import Payee from "@/models/Payee";
import Purchase from "@/models/Purchase";
import Invoice from "@/models/Invoice";
import generateInvoiceNumber from "@/utils/invoiceNumber";
import { createJournalForVoucher, createJournalForRefund } from '@/utils/journalAutoCreate';
import { requireAuthAndPermission } from "@/lib/auth-utils";
import { formatCurrency } from "@/utils/formatters/currency";
import { extractTableParams, executePaginatedQuery } from "@/lib/query-builders";

export async function GET(request: Request) {
  try {
    const { error } = await requireAuthAndPermission({
      voucher: ["read"],
    });
    if (error) return error;

    await dbConnect();

    const { searchParams } = new URL(request.url);
    
    const isServerSide = searchParams.has('page') || searchParams.has('pageSize');

    const startDateParam = searchParams.get('startDate') || searchParams.get('from');
    const endDateParam = searchParams.get('endDate') || searchParams.get('to');
    
    if (isServerSide) {
      const { page, pageSize, sorting, filters } = extractTableParams(searchParams);
      
      console.log('📊 Server-side voucher request:', { page, pageSize, sorting, filters, startDateParam, endDateParam });

      const baseFilter: any = { isDeleted: false };
      
      if (startDateParam || endDateParam) {
        baseFilter.createdAt = {};
        if (startDateParam) {
          baseFilter.createdAt.$gte = new Date(startDateParam);
        }
        if (endDateParam) {
          const end = new Date(endDateParam);
          end.setHours(23, 59, 59, 999);
          baseFilter.createdAt.$lte = end;
        }
      }

      const partyFilterIndex = filters.findIndex((f: any) => f.id === 'partyName');
      if (partyFilterIndex !== -1) {
        const partyFilter = filters[partyFilterIndex];
        const searchRegex = { $regex: partyFilter.value, $options: 'i' };
        
        baseFilter.$or = [
          { customerName: searchRegex },
          { supplierName: searchRegex },
          { payeeName: searchRegex },
          { vendorName: searchRegex }
        ];

        filters.splice(partyFilterIndex, 1);
      }

      const voucherType = searchParams.get('voucherType');
      if (voucherType) {
        baseFilter.voucherType = voucherType;
      }

      const populate = searchParams.get('populate') === 'true';

      const populateOptions = populate ? [
        {
          path: 'connectedDocuments.invoiceIds',
          select: 'invoiceNumber grandTotal status isDeleted',
          match: { isDeleted: false }
        },
        {
          path: 'connectedDocuments.purchaseIds',
          select: 'referenceNumber totalAmount status paymentStatus isDeleted',
          match: { isDeleted: false }
        },
        {
          path: 'connectedDocuments.expenseIds',
          select: 'referenceNumber amount status paymentStatus isDeleted',
          match: { isDeleted: false }
        },
        { path: 'payeeId', select: 'name type', match: { isDeleted: false } },
        { path: 'customerId', select: 'name email phone', match: { isDeleted: false } },
        { path: 'supplierId', select: 'name email', match: { isDeleted: false } }
      ] : undefined;

      const result = await executePaginatedQuery(Voucher, {
        baseFilter,
        columnFilters: filters,
        sorting,
        page,
        pageSize,
        defaultSort: { createdAt: -1 },
        populate: populateOptions,
      });

      return NextResponse.json({
        data: result.data,
        pageCount: result.pageCount,
        totalCount: result.totalCount,
        currentPage: result.currentPage,
        pageSize: result.pageSize,
      });
    } else {
      const voucherType = searchParams.get('voucherType');
      const limit = searchParams.get('limit');
      const customerName = searchParams.get('customerName');
      const supplierName = searchParams.get('supplierName');
      const payeeName = searchParams.get('payeeName');
      const populate = searchParams.get('populate') === 'true';

      const filter: any = { isDeleted: false };
      if (voucherType) filter.voucherType = voucherType;
      if (customerName) filter.customerName = customerName;
      if (supplierName) filter.supplierName = supplierName;
      if (payeeName) filter.payeeName = payeeName;

      if (startDateParam || endDateParam) {
        filter.createdAt = {};
        if (startDateParam) filter.createdAt.$gte = new Date(startDateParam);
        if (endDateParam) {
          const toDate = new Date(endDateParam);
          toDate.setHours(23, 59, 59, 999);
          filter.createdAt.$lte = toDate;
        }
      }

      let query = Voucher.find(filter).sort({ createdAt: -1 });

      if (populate) {
        query = query
          .populate({
            path: 'connectedDocuments.invoiceIds',
            select: 'invoiceNumber grandTotal status isDeleted',
            match: { isDeleted: false }
          })
          .populate({
            path: 'connectedDocuments.purchaseIds',
            select: 'referenceNumber totalAmount status paymentStatus isDeleted',
            match: { isDeleted: false }
          })
          .populate({
            path: 'connectedDocuments.expenseIds',
            select: 'referenceNumber amount status paymentStatus isDeleted',
            match: { isDeleted: false }
          })
          .populate('payeeId', 'name type')
          .populate('customerId', 'name email phone')
          .populate('supplierId', 'name email');
      }

      if (limit) {
        const parsedLimit = parseInt(limit, 10);
        if (!isNaN(parsedLimit)) {
          query = query.limit(parsedLimit);
        }
      }

      const vouchers = await query.exec();

      return NextResponse.json(vouchers);
    }
  } catch (error) {
    console.error('Error fetching vouchers:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const { error, session } = await requireAuthAndPermission({
      voucher: ["create"],
    });
    if (error) return error;

    await dbConnect();
    const user = session.user;

    const {
      voucherType,
      customerName,
      supplierName,
      payeeName,
      payeeId,
      vendorName,
      customerPhone,
      customerEmail,
      items,
      paymentMethod,
      notes,
      createdAt,
      updatedAt,
      connectedDocuments,
      totalAmount: customTotalAmount,
      grandTotal: customGrandTotal,
      skipAutoCreation
    } = body;

    // ✅ UPDATED: Validation - Any voucher type can have any party type
    if (!voucherType || !['receipt', 'payment', 'refund'].includes(voucherType)) {
      return NextResponse.json({
        error: 'Valid voucherType (receipt, payment, or refund) is required'
      }, { status: 400 });
    }

    if (!customerName && !supplierName && !payeeName && !vendorName) {
      return NextResponse.json({
        error: 'A valid party (Customer, Supplier, Payee, or Vendor) is required'
      }, { status: 400 });
    }

    if (!Array.isArray(items)) {
      return NextResponse.json({ 
        error: 'Items array is required' 
      }, { status: 400 });
    }

    if (!paymentMethod) {
      return NextResponse.json({
        error: 'Payment method is required for vouchers'
      }, { status: 400 });
    }

    // ✅ UPDATED: Upsert/lookup for all party types
    let resolvedCustomerId = null;
    let resolvedSupplierId = null;
    let resolvedPayeeId = null;

    if (!skipAutoCreation) {
      if (customerName) {
        const customerDoc = await Customer.findOneAndUpdate(
          { name: customerName },
          { $set: { phone: customerPhone, email: customerEmail } },
          { upsert: true, new: true }
        );
        resolvedCustomerId = customerDoc._id;
      }

      if (supplierName) {
        const supplierDoc = await Supplier.findOneAndUpdate(
          { name: supplierName },
          {},
          { upsert: true, new: true }
        );
        resolvedSupplierId = supplierDoc._id;
      }

      if (payeeName && payeeId) {
        const payeeDoc = await Payee.findById(payeeId);
        if (payeeDoc) {
          resolvedPayeeId = payeeDoc._id;
        }
      }
    } else {
      if (customerName) {
        const existing = await Customer.findOne({ name: customerName });
        if (existing) resolvedCustomerId = existing._id;
      }
      if (supplierName) {
        const existing = await Supplier.findOne({ name: supplierName });
        if (existing) resolvedSupplierId = existing._id;
      }
      if (payeeName && payeeId) {
        const existing = await Payee.findById(payeeId);
        if (existing) resolvedPayeeId = existing._id;
      }
    }

    const finalTotalAmount = customTotalAmount !== undefined ? customTotalAmount : (customGrandTotal || 0);
    const finalGrandTotal = customGrandTotal !== undefined ? customGrandTotal : (customTotalAmount || 0);

    const invoiceNumber = await generateInvoiceNumber(voucherType);

    const existingVoucher = await Voucher.findOne({
      invoiceNumber,
      isDeleted: false
    });

    if (existingVoucher) {
      return NextResponse.json({
        error: 'Failed to generate unique voucher number. Please try again.',
        details: 'Voucher number collision detected'
      }, { status: 500 });
    }

    const allocations: any[] = [];
    let connectedIds: any = {};
    
    // ✅ Logic for Receipt, Payment, Refund allocations (unchanged)
    if (voucherType === 'receipt' && connectedDocuments?.invoiceIds) {
      const invoiceIds = connectedDocuments.invoiceIds;
      if (invoiceIds.length > 0) {
        const invoices = await Invoice.find({ _id: { $in: invoiceIds }, isDeleted: false });
        if (invoices.length === invoiceIds.length) {
          if (invoiceIds.length === 1) {
            const invoice = invoices[0];
            if (invoice.canAllocate(finalGrandTotal)) {
              allocations.push({ documentId: invoice._id, documentType: 'invoice', amount: finalGrandTotal, createdAt: new Date() });
            }
          } else {
            const totalRemaining = invoices.reduce((sum, inv) => sum + (inv.grandTotal - inv.getTotalAllocated()), 0);
            if (totalRemaining >= finalGrandTotal) {
              let remaining = finalGrandTotal;
              for (let i = 0; i < invoices.length; i++) {
                const invoice = invoices[i];
                const invoiceRemaining = invoice.grandTotal - invoice.getTotalAllocated();
                let allocationAmount = (i === invoices.length - 1) ? remaining : Math.min(Math.round(finalGrandTotal * (invoiceRemaining / totalRemaining) * 100) / 100, invoiceRemaining, remaining);
                if (allocationAmount > 0) {
                  allocations.push({ documentId: invoice._id, documentType: 'invoice', amount: allocationAmount, createdAt: new Date() });
                  remaining -= allocationAmount;
                }
              }
            }
          }
        }
      }
      connectedIds = { invoiceIds };
    }
    
    if (voucherType === 'payment' && connectedDocuments?.purchaseIds) {
       const purchaseIds = connectedDocuments.purchaseIds;
       if (purchaseIds.length > 0) {
         const purchases = await Purchase.find({ _id: { $in: purchaseIds }, isDeleted: false });
         if (purchases.length === purchaseIds.length) {
             if (purchaseIds.length === 1) {
                const purchase = purchases[0];
                if (purchase.canAllocate(finalGrandTotal)) {
                   allocations.push({ documentId: purchase._id, documentType: 'purchase', amount: finalGrandTotal, createdAt: new Date() });
                }
             } else {
                let remaining = finalGrandTotal;
                const totalRemaining = purchases.reduce((sum, p) => sum + (p.grandTotal - p.getTotalAllocated()), 0);
                if (totalRemaining >= finalGrandTotal) {
                    for(let i=0; i<purchases.length; i++){
                        const p = purchases[i];
                        const pRem = p.grandTotal - p.getTotalAllocated();
                        let amt = (i === purchases.length - 1) ? remaining : Math.min(Math.round(finalGrandTotal * (pRem / totalRemaining) * 100) / 100, pRem, remaining);
                        if(amt > 0) {
                            allocations.push({ documentId: p._id, documentType: 'purchase', amount: amt, createdAt: new Date() });
                            remaining -= amt;
                        }
                    }
                }
             }
         }
       }
       connectedIds = { purchaseIds };
    }

    if (voucherType === 'payment' && connectedDocuments?.expenseIds) {
        const expenseIds = connectedDocuments.expenseIds;
        if(expenseIds.length > 0) {
            const Expense = (await import('@/models/Expense')).default;
            const expenses = await Expense.find({ _id: { $in: expenseIds }, isDeleted: false });
             if (expenses.length === expenseIds.length) {
                if (expenseIds.length === 1) {
                    const exp = expenses[0];
                    if (exp.canAllocate(finalGrandTotal)) {
                        allocations.push({ documentId: exp._id, documentType: 'expense', amount: finalGrandTotal, createdAt: new Date() });
                    }
                } else {
                     let remaining = finalGrandTotal;
                     const totalRemaining = expenses.reduce((sum, e) => sum + (e.amount - e.getTotalAllocated()), 0);
                     if (totalRemaining >= finalGrandTotal) {
                        for(let i=0; i<expenses.length; i++){
                            const e = expenses[i];
                            const eRem = e.amount - e.getTotalAllocated();
                            let amt = (i === expenses.length - 1) ? remaining : Math.min(Math.round(finalGrandTotal * (eRem / totalRemaining) * 100) / 100, eRem, remaining);
                            if(amt > 0) {
                                allocations.push({ documentId: e._id, documentType: 'expense', amount: amt, createdAt: new Date() });
                                remaining -= amt;
                            }
                        }
                     }
                }
             }
        }
        connectedIds = { expenseIds };
    }

    if (voucherType === 'refund' && connectedDocuments?.invoiceIds) {
        const invoiceIds = connectedDocuments.invoiceIds;
        if (invoiceIds.length > 0) {
            const invoices = await Invoice.find({ _id: { $in: invoiceIds }, isDeleted: false });
             if (invoices.length === invoiceIds.length) {
                if (invoiceIds.length === 1) {
                    const inv = invoices[0];
                    if (inv.canRefund(finalGrandTotal)) {
                         allocations.push({ documentId: inv._id, documentType: 'invoice', amount: finalGrandTotal, createdAt: new Date() });
                    }
                } else {
                    let remaining = finalGrandTotal;
                    const totalPaid = invoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
                    if (totalPaid >= finalGrandTotal) {
                         for(let i=0; i<invoices.length; i++) {
                             const inv = invoices[i];
                             const maxRefund = inv.paidAmount - inv.getTotalRefunded();
                             let amt = (i === invoices.length - 1) ? remaining : Math.min(Math.round(finalGrandTotal * (inv.paidAmount / totalPaid) * 100) / 100, maxRefund, remaining);
                             if (amt > 0) {
                                 allocations.push({ documentId: inv._id, documentType: 'invoice', amount: amt, createdAt: new Date() });
                                 remaining -= amt;
                             }
                         }
                    }
                }
             }
        }
        connectedIds = { invoiceIds };
    }

    const voucherData: any = {
      invoiceNumber,
      voucherType,
      customerName: customerName || undefined,
      customerId: resolvedCustomerId || undefined,
      supplierName: supplierName || undefined,
      supplierId: resolvedSupplierId || undefined,
      payeeName: payeeName || undefined,
      payeeId: resolvedPayeeId || payeeId || undefined,
      vendorName: vendorName || undefined,
      customerPhone,
      customerEmail,
      items,
      notes,
      totalAmount: finalTotalAmount,
      grandTotal: finalGrandTotal,
      paymentMethod,
      allocations,
      isDeleted: false,
      deletedAt: null,
      deletedBy: null,
      createdBy: user.id,
      updatedBy: user.id,
      connectedDocuments: connectedIds,
      actionHistory: [{
        action: 'Created',
        userId: user.id,
        username: user.username || user.name,
        timestamp: new Date(),
      }],
    };

    if (createdAt) voucherData.createdAt = new Date(createdAt);
    if (updatedAt) voucherData.updatedAt = new Date(updatedAt);

    const newVoucher = new Voucher(voucherData);

    try {
      if (createdAt || updatedAt) {
        await newVoucher.save({ timestamps: false });
        if (createdAt) newVoucher.createdAt = new Date(createdAt);
        if (updatedAt) newVoucher.updatedAt = new Date(updatedAt);
        await newVoucher.save({ timestamps: false });
      } else {
        await newVoucher.save();
      }

      // Apply Allocations to Documents
       if (voucherType === 'receipt' && allocations.length > 0) {
        for (const allocation of allocations) {
          const invoice = await Invoice.findById(allocation.documentId);
          if (invoice && !invoice.isDeleted) {
            invoice.allocateReceipt(newVoucher._id, allocation.amount);
            const currentReceiptIds = invoice.connectedDocuments?.receiptIds || [];
            if (!currentReceiptIds.some((rid: any) => rid.toString() === newVoucher._id.toString())) {
              currentReceiptIds.push(newVoucher._id);
              invoice.connectedDocuments = invoice.connectedDocuments || { receiptIds: [] };
              invoice.connectedDocuments.receiptIds = currentReceiptIds;
            }
            await invoice.save();
          }
        }
      }

      if (voucherType === 'payment' && allocations.length > 0) {
        for (const allocation of allocations) {
          if (allocation.documentType === 'purchase') {
            const purchase = await Purchase.findById(allocation.documentId);
            if (purchase && !purchase.isDeleted) {
              purchase.allocatePayment(newVoucher._id, allocation.amount);
              const currentPaymentIds = purchase.connectedDocuments?.paymentIds || [];
              if (!currentPaymentIds.some((pid: any) => pid.toString() === newVoucher._id.toString())) {
                currentPaymentIds.push(newVoucher._id);
                purchase.connectedDocuments = purchase.connectedDocuments || { paymentIds: [] };
                purchase.connectedDocuments.paymentIds = currentPaymentIds;
              }
              await purchase.save();
            }
          } else if (allocation.documentType === 'expense') {
             const Expense = (await import('@/models/Expense')).default;
             const expense = await Expense.findById(allocation.documentId);
             if (expense && !expense.isDeleted) {
               expense.allocatePayment(newVoucher._id, allocation.amount);
               const currentIds = expense.connectedDocuments?.paymentIds || [];
               if (!currentIds.some((id: any) => id.toString() === newVoucher._id.toString())) {
                  currentIds.push(newVoucher._id);
                  expense.connectedDocuments = expense.connectedDocuments || { paymentIds: [] };
                  expense.connectedDocuments.paymentIds = currentIds;
               }
               await expense.save();
             }
          }
        }
      }

      if (voucherType === 'refund' && allocations.length > 0) {
         for (const allocation of allocations) {
            const invoice = await Invoice.findById(allocation.documentId);
            if (invoice && !invoice.isDeleted) {
               invoice.allocateRefund(newVoucher._id, allocation.amount);
               const currentIds = invoice.connectedDocuments?.refundIds || [];
               if (!currentIds.some((id: any) => id.toString() === newVoucher._id.toString())) {
                  currentIds.push(newVoucher._id);
                  invoice.connectedDocuments = invoice.connectedDocuments || { refundIds: [] };
                  invoice.connectedDocuments.refundIds = currentIds;
               }
               invoice.status = 'cancelled';
               await invoice.save();

               const { handleInvoiceStatusChange } = await import('@/utils/journalAutoCreate');
               await handleInvoiceStatusChange(
                invoice.toObject(),
                'approved',
                'cancelled',
                user.id,
                user.username || user.name
               );
            }
         }
      }

      try {
        if (voucherType === 'refund') {
          await createJournalForRefund(newVoucher.toObject(), user.id, user.username || user.name);
        } else {
          await createJournalForVoucher(newVoucher.toObject(), user.id, user.username || user.name);
        }
      } catch (journalError) {
        console.error('Failed to create journal entry:', journalError);
      }

      return NextResponse.json({
        message: 'Voucher saved',
        voucher: newVoucher,
        allocations: allocations.map(a => ({
          documentId: a.documentId,
          documentType: a.documentType,
          amount: a.amount
        }))
      }, { status: 201 });

    } catch (saveError: any) {
      if (saveError.code === 11000 && saveError.keyPattern?.invoiceNumber) {
        return NextResponse.json({
          error: 'Duplicate voucher number detected. Please try again.',
          details: saveError.message
        }, { status: 500 });
      }
      throw saveError;
    }

  } catch (error: any) {
    console.error('❌ Error in POST /api/vouchers:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}