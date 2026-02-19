import React from 'react';
import { View, Text } from '@react-pdf/renderer';
import { commonStyles, pdfColors } from './styles';

// ============================================================================
// NOTES SECTION - used in DeliveryNote / ReturnNote bottomSection
// ============================================================================

interface NotesSectionProps {
    title?: string;
    notes?: string | string[];
    bankDetails?: string;
    compact?: boolean;
}

export const NotesSection: React.FC<NotesSectionProps> = ({
    title = 'Terms and Conditions',
    notes,
    bankDetails,
    compact = true,
}) => {
    const renderNotes = () => {
        if (!notes) return null;
        if (Array.isArray(notes)) {
            return notes.map((note, index) => (
                <Text key={index} style={commonStyles.notesText}>
                    {'\u2022'} {note}
                </Text>
            ));
        }
        return <Text style={commonStyles.notesText}>{notes}</Text>;
    };

    if (!notes && !bankDetails) return null;

    if (compact && notes && bankDetails) {
        return (
            <View style={commonStyles.twoColumnSection}>
                <View style={commonStyles.leftColumn}>
                    <Text style={commonStyles.notesSectionTitle}>{title}</Text>
                    {renderNotes()}
                </View>
                <View style={commonStyles.rightColumn}>
                    <Text style={commonStyles.notesSectionTitle}>Bank Details</Text>
                    <Text style={commonStyles.notesText}>{bankDetails}</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={commonStyles.notesSection}>
            {notes && (
                <View style={{ marginBottom: bankDetails ? 12 : 0 }}>
                    <Text style={commonStyles.notesSectionTitle}>{title}</Text>
                    {renderNotes()}
                </View>
            )}
            {bankDetails && (
                <View>
                    <Text style={commonStyles.notesSectionTitle}>Bank Details</Text>
                    <Text style={commonStyles.notesText}>{bankDetails}</Text>
                </View>
            )}
        </View>
    );
};

// ============================================================================
// SIGNATURE SECTION
// ============================================================================

interface SignatureSectionProps {
    leftLabel?: string;
    rightLabel?: string;
    companyName?: string;
}

export const SignatureSection: React.FC<SignatureSectionProps> = ({
    leftLabel = 'Customer Signature',
    rightLabel = 'Authorized Signature',
    companyName,
}) => {
    const rightSignatureLabel = companyName ? `For ${companyName}` : rightLabel;

    return (
        <View style={commonStyles.signatureSection}>
            <View style={commonStyles.signatureBox}>
                <View style={commonStyles.signatureLine}>
                    <Text style={commonStyles.signatureLabel}>{leftLabel}</Text>
                </View>
            </View>
            <View style={commonStyles.signatureBox}>
                <View style={commonStyles.signatureLine}>
                    <Text style={commonStyles.signatureLabel}>{rightSignatureLabel}</Text>
                </View>
            </View>
        </View>
    );
};

// ============================================================================
// REASON BOX — inline, no heavy border/bg, just label + text
// ============================================================================

interface ReasonBoxProps {
    title: string;
    content: string;
}

export const ReasonBox: React.FC<ReasonBoxProps> = ({ title, content }) => {
    return (
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10, gap: 6 }}>
            <Text style={{
                fontSize: 7,
                fontWeight: 'bold',
                color: pdfColors.primary,
                textTransform: 'uppercase',
                letterSpacing: 0.3,
                marginTop: 1,
                minWidth: 80,
            }}>
                {title}:
            </Text>
            <Text style={{
                fontSize: 8.5,
                color: pdfColors.textDark,
                flex: 1,
                lineHeight: 1.5,
            }}>
                {content}
            </Text>
        </View>
    );
};

// ============================================================================
// INLINE NOTE — for bill.notes / document-level user-entered notes
// Sits directly in the document flow (below table or reason), no box/border
// ============================================================================

interface InlineNoteProps {
    content: string;
}

export const InlineNote: React.FC<InlineNoteProps> = ({ content }) => {
    return (
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10, gap: 6 }}>
            <Text style={{
                fontSize: 7,
                fontWeight: 'bold',
                color: pdfColors.textMuted,
                textTransform: 'uppercase',
                letterSpacing: 0.3,
                marginTop: 1,
                minWidth: 80,
            }}>
                Notes:
            </Text>
            <Text style={{
                fontSize: 8.5,
                color: pdfColors.textDark,
                flex: 1,
                lineHeight: 1.5,
                fontStyle: 'italic',
            }}>
                {content}
            </Text>
        </View>
    );
};