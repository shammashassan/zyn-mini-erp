// utils/partySnapshot.ts - Helper for creating party and contact snapshots

import Party from '@/models/Party';
import Contact from '@/models/Contact';
import Payee from '@/models/Payee';

export interface PartySnapshot {
    displayName: string;
    address?: {
        street?: string;
        city?: string;
        district?: string;
        state?: string;
        country?: string;
        postalCode?: string;
    };
    taxIdentifiers?: {
        vatNumber?: string;
    };
}

export interface ContactSnapshot {
    name: string;
    phone?: string;
    email?: string;
    designation?: string;
}

export interface PayeeSnapshot {
    name: string;
    type?: string;
    email?: string;
    phone?: string;
    address?: string;
}

/**
 * Creates immutable snapshots of Party and Contact for document creation.
 * 
 * Snapshots preserve the exact state of party/contact data at the moment
 * of document creation, providing legal/historical truth that won't change
 * even if the party or contact is later modified or deleted.
 * 
 * @param partyId - MongoDB ObjectId of the Party
 * @param contactId - Optional MongoDB ObjectId of the Contact
 * @returns Object containing partySnapshot and optional contactSnapshot
 * @throws Error if Party is not found
 */
export async function createPartySnapshot(
    partyId: string,
    contactId?: string
): Promise<{
    partySnapshot: PartySnapshot;
    contactSnapshot?: ContactSnapshot;
}> {
    // Fetch Party
    const party = await Party.findById(partyId);
    if (!party) {
        throw new Error(`Party not found with id: ${partyId}`);
    }

    // Create Party Snapshot
    const partySnapshot: PartySnapshot = {
        displayName: party.company || party.name || 'Unknown',
    };

    // Add address if any address fields exist
    if (party.address || party.city || party.district || party.state || party.country || party.postalCode) {
        partySnapshot.address = {
            street: party.address,
            city: party.city,
            district: party.district,
            state: party.state,
            country: party.country,
            postalCode: party.postalCode,
        };
    }

    // Add tax identifiers if they exist
    if (party.vatNumber) {
        partySnapshot.taxIdentifiers = {
            vatNumber: party.vatNumber,
        };
    }

    // Create Contact Snapshot (if contactId provided)
    let contactSnapshot: ContactSnapshot | undefined;

    if (contactId) {
        const contact = await Contact.findById(contactId);
        if (contact) {
            contactSnapshot = {
                name: contact.name,
                phone: contact.phone,
                email: contact.email,
                designation: contact.designation,
            };
        } else {
            console.warn(`Contact not found with id: ${contactId}`);
        }
    }

    return { partySnapshot, contactSnapshot };
}

/**
 * Helper to get display data from either snapshot or live party/contact.
 * Uses snapshot as primary source (legal truth), with fallback to live data.
 * 
 * @param document - Any document with partySnapshot, contactSnapshot, and populated references
 * @returns Formatted display data for UI
 */
export function getPartyDisplayData(document: any) {
    // Primary: Use snapshot (immutable legal truth)
    const displayName = document.partySnapshot?.displayName
        // Fallback: Try populated party reference
        || document.partyId?.company
        || document.partyId?.name
        || 'Unknown';

    const displayPhone = document.contactSnapshot?.phone
        || document.contactId?.phone
        || document.partyId?.phone
        || '';

    const displayEmail = document.contactSnapshot?.email
        || document.contactId?.email
        || document.partyId?.email
        || '';

    const displayAddress = document.partySnapshot?.address
        ? formatAddress(document.partySnapshot.address)
        : document.partyId?.address
            ? formatAddress({
                street: document.partyId.address,
                city: document.partyId.city,
                district: document.partyId.district,
                state: document.partyId.state,
                country: document.partyId.country,
                postalCode: document.partyId.postalCode,
            })
            : '';

    const displayVAT = document.partySnapshot?.taxIdentifiers?.vatNumber
        || document.partyId?.vatNumber
        || '';

    const contactName = document.contactSnapshot?.name
        || document.contactId?.name
        || '';

    const contactDesignation = document.contactSnapshot?.designation
        || document.contactId?.designation
        || '';

    return {
        displayName,
        displayPhone,
        displayEmail,
        displayAddress,
        displayVAT,
        contactName,
        contactDesignation,
    };
}

/**
 * Format address object into a readable string
 */
function formatAddress(address: PartySnapshot['address']): string {
    if (!address) return '';

    const parts = [
        address.street,
        address.city,
        address.district,
        address.state,
        address.country,
        address.postalCode,
    ].filter(Boolean);

    return parts.join(', ');
}

/**
 * Check if party data has changed since snapshot was created
 * Useful for showing "data changed" warnings in UI
 */
export async function hasPartyChangedSinceSnapshot(
    partyId: string,
    partySnapshot: PartySnapshot
): Promise<boolean> {
    const party = await Party.findById(partyId);
    if (!party) return true; // Party deleted = changed

    const currentDisplayName = party.company || party.name || 'Unknown';
    if (currentDisplayName !== partySnapshot.displayName) {
        return true;
    }

    // Check if VAT number changed
    if (party.vatNumber !== partySnapshot.taxIdentifiers?.vatNumber) {
        return true;
    }

    return false;
}

/**
 * Creates immutable snapshot of Payee for expense creation.
 * 
 * Snapshots preserve the exact state of payee data at the moment
 * of expense creation, providing legal/historical truth that won't change
 * even if the payee is later modified or deleted.
 * 
 * @param payeeId - MongoDB ObjectId of the Payee
 * @returns PayeeSnapshot object or null if not applicable
 * @throws Error if Payee is not found
 */
export async function createPayeeSnapshot(
    payeeId?: string
): Promise<PayeeSnapshot | null> {
    if (!payeeId) {
        return null;
    }

    // Fetch Payee
    const payee = await Payee.findById(payeeId);
    if (!payee) {
        throw new Error(`Payee not found with id: ${payeeId}`);
    }

    // Create Payee Snapshot
    const payeeSnapshot: PayeeSnapshot = {
        name: payee.name,
    };

    // Add optional fields if they exist
    if (payee.type) {
        payeeSnapshot.type = payee.type;
    }
    if (payee.email) {
        payeeSnapshot.email = payee.email;
    }
    if (payee.phone) {
        payeeSnapshot.phone = payee.phone;
    }
    if (payee.address) {
        payeeSnapshot.address = payee.address;
    }

    return payeeSnapshot;
}

/**
 * Helper to get display data from either snapshot or live payee.
 * Uses snapshot as primary source (legal truth), with fallback to live data.
 * 
 * @param expense - Any expense document with payeeSnapshot and populated references
 * @returns Formatted display data for UI
 */
export function getPayeeDisplayData(expense: any) {
    // Primary: Use snapshot (immutable legal truth)
    const displayName = expense.payeeSnapshot?.name
        // Fallback: Try populated payee reference
        || expense.payeeId?.name
        // Last resort: Vendor field
        || expense.vendor
        || 'Unknown';

    const displayType = expense.payeeSnapshot?.type
        || expense.payeeId?.type
        || '';

    const displayEmail = expense.payeeSnapshot?.email
        || expense.payeeId?.email
        || '';

    const displayPhone = expense.payeeSnapshot?.phone
        || expense.payeeId?.phone
        || '';

    const displayAddress = expense.payeeSnapshot?.address
        || expense.payeeId?.address
        || '';

    return {
        displayName,
        displayType,
        displayEmail,
        displayPhone,
        displayAddress,
    };
}

/**
 * Check if payee data has changed since snapshot was created
 * Useful for showing "data changed" warnings in UI
 */
export async function hasPayeeChangedSinceSnapshot(
    payeeId: string,
    payeeSnapshot: PayeeSnapshot
): Promise<boolean> {
    const payee = await Payee.findById(payeeId);
    if (!payee) return true; // Payee deleted = changed

    if (payee.name !== payeeSnapshot.name) {
        return true;
    }

    // Check if other fields changed
    if (payee.email !== payeeSnapshot.email) {
        return true;
    }

    if (payee.phone !== payeeSnapshot.phone) {
        return true;
    }

    return false;
}