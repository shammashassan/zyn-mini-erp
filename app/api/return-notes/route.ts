// app/api/return-notes/route.ts - UPDATED: Added returnType filtering
import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import ReturnNote from "@/models/ReturnNote";
import Purchase from "@/models/Purchase";
import Invoice from "@/models/Invoice";
import Item from "@/models/Item";
import DebitNote from "@/models/DebitNote";
import CreditNote from "@/models/CreditNote";
import Party from "@/models/Party";
import Contact from "@/models/Contact";
import StockAdjustment from "@/models/StockAdjustment";
import generateInvoiceNumber from "@/utils/invoiceNumber";
import { requireAuthAndPermission } from "@/lib/auth-utils";
import { extractTableParams, executePaginatedQuery } from "@/lib/query-builders";
import { createPartySnapshot } from "@/utils/partySnapshot";
export async function GET(request: Request) {
    try {
        const { error } = await requireAuthAndPermission({
            returnNote: ["read"],
        });
        if (error) return error;
        await dbConnect();
        const _ensureModels = [DebitNote, CreditNote, Purchase, Invoice, Item, Party, Contact];
        const { searchParams } = new URL(request.url);
        const isServerSide = searchParams.has('page') || searchParams.has('pageSize');
        const startDateParam = searchParams.get('startDate');
        const endDateParam = searchParams.get('endDate');
        const returnTypeParam = searchParams.get('returnType'); // ✅ GET returnType parameter
        if (isServerSide) {
            const { page, pageSize, sorting, filters } = extractTableParams(searchParams);
            const baseFilter: any = { isDeleted: false };
            // ✅ Handle 'partyName' filter for partySnapshot
            const partyFilterIndex = filters.findIndex((f: any) => f.id === 'partyName');
            if (partyFilterIndex !== -1) {
                const partyFilter = filters[partyFilterIndex];
                baseFilter['partySnapshot.displayName'] = { $regex: partyFilter.value, $options: 'i' };
                filters.splice(partyFilterIndex, 1);
            }
            // ✅ ADD returnType filter
            if (returnTypeParam) {
                baseFilter.returnType = returnTypeParam;
            }
            if (startDateParam || endDateParam) {
                baseFilter.returnDate = {};
                if (startDateParam) {
                    baseFilter.returnDate.$gte = new Date(startDateParam);
                }
                if (endDateParam) {
                    const end = new Date(endDateParam);
                    end.setHours(23, 59, 59, 999);
                    baseFilter.returnDate.$lte = end;
                }
            }
            const populate = searchParams.get('populate') === 'true';
            const populateOptions = populate ? [
                {
                    path: 'connectedDocuments.purchaseId',
                    select: 'referenceNumber items inventoryStatus',
                    match: { isDeleted: false }
                },
                {
                    path: 'connectedDocuments.invoiceId',
                    select: 'invoiceNumber items status',
                    match: { isDeleted: false }
                },
                {
                    path: 'connectedDocuments.debitNoteId',
                    select: 'debitNoteNumber status',
                    match: { isDeleted: false }
                },
                {
                    path: 'connectedDocuments.creditNoteId',
                    select: 'creditNoteNumber status',
                    match: { isDeleted: false }
                }
            ] : undefined;
            const result = await executePaginatedQuery(ReturnNote, {
                baseFilter,
                columnFilters: filters,
                sorting,
                page,
                pageSize,
                defaultSort: { returnDate: -1 },
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
            const populate = searchParams.get('populate') === 'true';
            const filter: any = { isDeleted: false };
            const returnTypeParam = searchParams.get('returnType');
            const partyIdParam = searchParams.get('partyId');
            const statusParam = searchParams.get('status');
            const excludeLinked = searchParams.get('excludeLinked') === 'true';
            const includeId = searchParams.get('includeId');
            if (returnTypeParam) {
                filter.returnType = returnTypeParam;
            }
            if (partyIdParam) {
                filter.partyId = partyIdParam;
            }
            if (statusParam) {
                filter.status = statusParam;
            }
            // Handle linked document exclusion with optional inclusion of a specific ID
            if (excludeLinked) {
                let exclusionCriteria = {};
                if (returnTypeParam === 'purchaseReturn') {
                    // Exclude if it has a debit note linked
                    exclusionCriteria = { 'connectedDocuments.debitNoteId': { $exists: false } };
                } else if (returnTypeParam === 'salesReturn') {
                    // Exclude if it has a credit note linked
                    exclusionCriteria = { 'connectedDocuments.creditNoteId': { $exists: false } };
                }
                if (includeId) {
                    // If includeId is provided, we want:
                    // (criteria match) OR (_id === includeId)
                    filter.$or = [
                        exclusionCriteria,
                        { _id: includeId }
                    ];
                } else {
                    // Otherwise just apply the exclusion
                    Object.assign(filter, exclusionCriteria);
                }
            }
            if (startDateParam || endDateParam) {
                filter.returnDate = {};
                if (startDateParam) filter.returnDate.$gte = new Date(startDateParam);
                if (endDateParam) {
                    const toDate = new Date(endDateParam);
                    toDate.setHours(23, 59, 59, 999);
                    filter.returnDate.$lte = toDate;
                }
            }
            let query = ReturnNote.find(filter).sort({ returnDate: -1 });
            if (populate) {
                query = query
                    .populate({
                        path: 'connectedDocuments.purchaseId',
                        select: 'referenceNumber items inventoryStatus',
                        match: { isDeleted: false }
                    })
                    .populate({
                        path: 'connectedDocuments.invoiceId',
                        select: 'invoiceNumber items status',
                        match: { isDeleted: false }
                    })
                    .populate({
                        path: 'connectedDocuments.debitNoteId',
                        select: 'debitNoteNumber status',
                        match: { isDeleted: false }
                    })
                    .populate({
                        path: 'connectedDocuments.creditNoteId',
                        select: 'creditNoteNumber status',
                        match: { isDeleted: false }
                    });
            }
            const returnNotes = await query.exec();
            return NextResponse.json(returnNotes);
        }
    } catch (error) {
        console.error("Failed to fetch return notes:", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { error, session } = await requireAuthAndPermission({
            returnNote: ["create"],
        });
        if (error) return error;
        await dbConnect();
        const user = session.user;
        const {
            returnType = 'purchaseReturn',
            purchaseId,
            invoiceId,
            partyId,
            contactId,
            items,
            reason,
            notes,
            returnDate,
            status = 'pending',
            totalAmount,
            vatAmount,
            grandTotal
        } = body;
        // Validate partyId
        if (!partyId) {
            return NextResponse.json({ error: "Party ID is required" }, { status: 400 });
        }
        // Validate return type
        if (returnType === 'purchaseReturn') {
            if (!purchaseId) {
                return NextResponse.json({ error: "Purchase ID is required for purchase returns" }, { status: 400 });
            }
        } else if (returnType === 'salesReturn') {
            if (!invoiceId) {
                return NextResponse.json({ error: "Invoice ID is required for sales returns" }, { status: 400 });
            }
        } else {
            return NextResponse.json({
                error: "Invalid return type. Must be 'purchaseReturn' or 'salesReturn'"
            }, { status: 400 });
        }
        if (!items || !Array.isArray(items) || items.length === 0) {
            return NextResponse.json({ error: "At least one item is required" }, { status: 400 });
        }
        if (!reason || !reason.trim()) {
            return NextResponse.json({ error: "Return reason is required" }, { status: 400 });
        }
        // Validate against source document
        if (returnType === 'purchaseReturn') {
            const purchase = await Purchase.findById(purchaseId);
            if (!purchase || purchase.isDeleted) {
                return NextResponse.json({ error: "Purchase not found" }, { status: 404 });
            }
            if (purchase.inventoryStatus !== 'received' && purchase.inventoryStatus !== 'partially received') {
                return NextResponse.json({
                    error: "Can only create returns for purchases with 'received' or 'partially received' status"
                }, { status: 400 });
            }
            // Validate return quantities against the source purchase
            for (const returnItem of items) {
                const purchaseItem = purchase.items.find(
                    (pi: any) => pi.itemId?.toString() === returnItem.itemId?.toString()
                );
                if (!purchaseItem) {
                    return NextResponse.json({
                        error: `Item "${returnItem.description}" not found in purchase`
                    }, { status: 400 });
                }
                const receivedQty = purchaseItem.receivedQuantity || 0;
                const alreadyReturned = purchaseItem.returnedQuantity || 0;
                const availableToReturn = receivedQty - alreadyReturned;
                if (returnItem.returnQuantity > availableToReturn) {
                    return NextResponse.json({
                        error: `Cannot return ${returnItem.returnQuantity} units of "${returnItem.description}". ` +
                            `Available to return: ${availableToReturn}`
                    }, { status: 400 });
                }
            }
        } else if (returnType === 'salesReturn') {
            const invoice = await Invoice.findById(invoiceId);
            if (!invoice || invoice.isDeleted) {
                return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
            }
            if (invoice.status !== 'approved') {
                return NextResponse.json({
                    error: "Can only create returns for approved invoices"
                }, { status: 400 });
            }
            // Validate return quantities against source invoice
            for (const returnItem of items) {
                const invoiceItem = invoice.items.find(
                    (ii: any) => ii.itemId?.toString() === returnItem.itemId?.toString()
                );
                if (!invoiceItem) {
                    return NextResponse.json({
                        error: `Item "${returnItem.description}" not found in invoice`
                    }, { status: 400 });
                }
                const invoicedQty = invoiceItem.quantity || 0;
                const alreadyReturned = invoiceItem.returnedQuantity || 0;
                const availableToReturn = invoicedQty - alreadyReturned;
                if (returnItem.returnQuantity > availableToReturn) {
                    return NextResponse.json({
                        error: `Cannot return ${returnItem.returnQuantity} units of "${returnItem.description}". ` +
                            `Available to return: ${availableToReturn}`
                    }, { status: 400 });
                }
            }
        }
        // Generate return number
        const returnNumber = await generateInvoiceNumber('return');
        // Check uniqueness
        const existingReturn = await ReturnNote.findOne({
            returnNumber,
            isDeleted: false
        });
        if (existingReturn) {
            return NextResponse.json({
                error: 'Failed to generate unique return number. Please try again.'
            }, { status: 500 });
        }
        // ✅ Create party and contact snapshots
        const { partySnapshot, contactSnapshot } = await createPartySnapshot(partyId, contactId);
        // Create return note data
        const returnNoteData: any = {
            returnNumber,
            returnType,
            partyId,
            contactId,
            partySnapshot,
            contactSnapshot,
            items,
            returnDate: returnDate || new Date(),
            reason,
            notes,
            status,
            connectedDocuments: {},
            isDeleted: false,
            deletedAt: null,
            deletedBy: null,
            createdBy: user.id,
            updatedBy: user.id,
            actionHistory: [{
                action: 'Created',
                userId: user.id,
                username: user.username || user.name,
                timestamp: new Date(),
            }],
        };
        // Add financial summary fields for both return types
        returnNoteData.totalAmount = totalAmount ?? 0;
        returnNoteData.vatAmount = vatAmount ?? 0;
        returnNoteData.grandTotal = grandTotal ?? 0;

        // Add type-specific fields
        if (returnType === 'purchaseReturn') {
            const purchase = await Purchase.findById(purchaseId);
            returnNoteData.connectedDocuments.purchaseId = purchase._id;
        } else if (returnType === 'salesReturn') {
            const invoice = await Invoice.findById(invoiceId);
            returnNoteData.connectedDocuments.invoiceId = invoice._id;
        }
        const newReturnNote = new ReturnNote(returnNoteData);
        const savedReturnNote = await newReturnNote.save();
        // Update source document
        if (returnType === 'purchaseReturn') {
            const purchase = await Purchase.findById(purchaseId);
            const currentReturnNoteIds = purchase.connectedDocuments?.returnNoteIds || [];
            if (!currentReturnNoteIds.some((rid: any) => rid.toString() === savedReturnNote._id.toString())) {
                currentReturnNoteIds.push(savedReturnNote._id);
                purchase.connectedDocuments = {
                    ...purchase.connectedDocuments,
                    returnNoteIds: currentReturnNoteIds
                };
            }
            // If status is 'approved', process the return immediately
            if (status === 'approved') {
                // Update purchase item returned quantities — match by itemId
                for (const returnItem of items) {
                    const purchaseItemIndex = purchase.items.findIndex(
                        (pi: any) => pi.itemId?.toString() === returnItem.itemId?.toString()
                    );
                    if (purchaseItemIndex !== -1) {
                        const currentReturned = purchase.items[purchaseItemIndex].returnedQuantity || 0;
                        purchase.items[purchaseItemIndex].returnedQuantity = currentReturned + returnItem.returnQuantity;
                    }
                }
                purchase.addAuditEntry(
                    `Return Note ${returnNumber} approved - ${items.length} item(s) returned`,
                    user.id,
                    user.username || user.name
                );
                await purchase.save();

                // Reduce stock via unified Item model
                const { removeStockForPurchaseReturn } = await import("@/utils/inventoryManager");
                await removeStockForPurchaseReturn(
                    savedReturnNote._id,
                    items.map((item: any) => ({
                        itemId: item.itemId?.toString(),
                        itemName: item.description,
                        returnQuantity: item.returnQuantity,
                    })),
                    returnNumber
                );
                console.log(`✅ Purchase Return Note ${returnNumber} approved - stock reduced`);
            } else {
                await purchase.save();
            }
        } else if (returnType === 'salesReturn') {
            const invoice = await Invoice.findById(invoiceId);
            const currentReturnNoteIds = invoice.connectedDocuments?.returnNoteIds || [];
            if (!currentReturnNoteIds.some((rid: any) => rid.toString() === savedReturnNote._id.toString())) {
                currentReturnNoteIds.push(savedReturnNote._id);
                invoice.connectedDocuments = {
                    ...invoice.connectedDocuments,
                    returnNoteIds: currentReturnNoteIds
                };
            }
            if (status === 'approved') {
                // Update invoice returned quantities — match by itemId or description
                for (const returnItem of items) {
                    const invoiceItemIndex = invoice.items.findIndex(
                        (ii: any) => ii.itemId?.toString() === returnItem.itemId?.toString()
                    );
                    if (invoiceItemIndex !== -1) {
                        const currentReturned = invoice.items[invoiceItemIndex].returnedQuantity || 0;
                        invoice.items[invoiceItemIndex].returnedQuantity = currentReturned + returnItem.returnQuantity;
                    }
                }
            }
            invoice.addAuditEntry(
                `Sales Return Note ${returnNumber} created${status === 'approved' ? ' and approved' : ''}`,
                user.id,
                user.username || user.name
            );
            await invoice.save();
            console.log(`✅ Sales Return Note ${returnNumber} linked to invoice${status === 'approved' ? ' - returned quantities updated' : ''}`);
        }
        return NextResponse.json({
            message: 'Return note created successfully',
            returnNote: savedReturnNote
        }, { status: 201 });
    } catch (error: any) {
        console.error('❌ Error in POST /api/return-notes:', error);
        return NextResponse.json({
            error: 'Internal server error',
            details: error.message
        }, { status: 500 });
    }
}