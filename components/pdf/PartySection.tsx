import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { pdfColors, spacing, typography } from './styles';
import { formatDisplayDate } from '@/utils/formatters/date';

const styles = StyleSheet.create({
    partySection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: spacing.lg,
        paddingBottom: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: pdfColors.border,
    },

    // Left side - Party info
    partyColumn: {
        flex: 1,
    },

    partyNameRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginBottom: spacing.xs,
        gap: spacing.xs,
    },

    partyLabel: {
        fontSize: 9,
        fontWeight: 'bold',
        color: pdfColors.primary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },

    partyName: {
        fontSize: 11,
        fontWeight: 'bold',
        color: pdfColors.textMain,
    },

    partyDetail: {
        fontSize: 8,
        color: pdfColors.textDark,
        marginBottom: 2,
        marginLeft: spacing.md, // Indent under the name
    },

    // Right side - Document info
    documentInfoColumn: {
        alignItems: 'flex-end',
    },

    documentNumber: {
        fontSize: 14,
        fontWeight: 'bold',
        color: pdfColors.textDark,
        marginBottom: spacing.xs,
    },

    documentDate: {
        fontSize: 9,
        color: pdfColors.textDark,
        marginBottom: spacing.sm,
    },

    referenceInfo: {
        marginTop: spacing.xs,
        alignItems: 'flex-end',
    },

    referenceLabel: {
        fontSize: 7,
        color: pdfColors.textMuted,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        marginBottom: 2,
    },

    referenceValue: {
        fontSize: 8,
        color: pdfColors.textDark,
        fontWeight: 'bold',
    },
});

interface Address {
    street?: string;
    city?: string;
    district?: string;
    state?: string;
    country?: string;
    postalCode?: string;
}

interface PartyInfo {
    displayName: string;
    address?: Address;
    taxIdentifiers?: {
        vatNumber?: string;
    };
}

interface ContactInfo {
    name?: string;
    phone?: string;
    email?: string;
    designation?: string;
}

interface PartySectionProps {
    // Party info (left side)
    partyLabel?: string;
    party?: PartyInfo | null;
    contact?: ContactInfo | null;

    // Document info (right side)
    documentNumber: string;
    documentDate: Date;
    referenceNumber?: string;
    referenceLabel?: string;
}

export const PartySection: React.FC<PartySectionProps> = ({
    partyLabel = 'Bill To',
    party,
    contact,
    documentNumber,
    documentDate,
    referenceNumber,
    referenceLabel = 'Reference',
}) => {
    // Format address if available
    const formatAddress = (address?: Address) => {
        if (!address) return null;
        const parts = [
            address.street,
            address.city,
            address.state,
            address.postalCode,
            address.country,
        ].filter(Boolean);
        return parts.length > 0 ? parts.join(', ') : null;
    };

    const addressStr = formatAddress(party?.address);

    return (
        <View style={styles.partySection}>
            {/* Left Side - Party Information */}
            <View style={styles.partyColumn}>
                {/* Party Name with inline label */}
                <View style={styles.partyNameRow}>
                    <Text style={styles.partyLabel}>{partyLabel}:</Text>
                    <Text style={styles.partyName}>{party?.displayName || 'N/A'}</Text>
                </View>

                {/* Contact Name */}
                {contact?.name && (
                    <Text style={styles.partyDetail}>
                        {contact.name}
                        {contact.designation && ` (${contact.designation})`}
                    </Text>
                )}

                {/* Contact Phone */}
                {contact?.phone && (
                    <Text style={styles.partyDetail}>{contact.phone}</Text>
                )}

                {/* Contact Email */}
                {contact?.email && (
                    <Text style={styles.partyDetail}>{contact.email}</Text>
                )}

                {/* Address */}
                {addressStr && (
                    <Text style={styles.partyDetail}>{addressStr}</Text>
                )}

                {/* VAT Number */}
                {party?.taxIdentifiers?.vatNumber && (
                    <Text style={styles.partyDetail}>
                        VAT: {party.taxIdentifiers.vatNumber}
                    </Text>
                )}
            </View>

            {/* Right Side - Document Information */}
            <View style={styles.documentInfoColumn}>
                <Text style={styles.documentNumber}>{documentNumber}</Text>
                <Text style={styles.documentDate}>{formatDisplayDate(documentDate)}</Text>

                {/* Reference info if exists */}
                {referenceNumber && (
                    <View style={styles.referenceInfo}>
                        <Text style={styles.referenceLabel}>{referenceLabel}</Text>
                        <Text style={styles.referenceValue}>{referenceNumber}</Text>
                    </View>
                )}
            </View>
        </View>
    );
};