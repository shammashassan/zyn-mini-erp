import React from 'react';
import { View, Text } from '@react-pdf/renderer';
import { commonStyles, pdfColors } from './styles';
import { SignatureSection } from './DocumentSections';
import { formatCurrency } from '@/utils/formatters/currency';

interface BottomSectionProps {
    // Summary props
    summaryItems: Array<{
        label: string;
        value: number;
        isBold?: boolean;
    }>;
    grandTotal: {
        label: string;
        value: number;
    };
    amountInWords?: string;
    vatInWords?: string;

    // Notes props
    notes?: string | string[];
    notesTitle?: string;
    bankDetails?: string;

    // Signature props
    leftSignatureLabel?: string;
    rightSignatureLabel?: string;
    companyName?: string;
}

/**
 * BottomSection - Three-row layout anchored to the bottom of the page:
 *   Row 1: Terms & Conditions (full width)
 *   Row 2: Summary Table (right-aligned) | Bank Details (left column)
 *   Row 3: Amount in Words / VAT in Words
 *   Row 4: Signature
 */
export const BottomSection: React.FC<BottomSectionProps> = ({
    summaryItems,
    grandTotal,
    amountInWords,
    vatInWords,
    notes,
    notesTitle = 'Terms and Conditions',
    bankDetails,
    leftSignatureLabel = 'Customer Signature',
    rightSignatureLabel = 'Authorized Signature',
    companyName,
}) => {
    const renderNotes = (noteContent: string | string[]) => {
        if (Array.isArray(noteContent)) {
            return noteContent.map((note, index) => (
                <Text key={index} style={commonStyles.notesText}>
                    {'\u2022'} {note}
                </Text>
            ));
        }
        return <Text style={commonStyles.notesText}>{noteContent}</Text>;
    };

    return (
        <View style={commonStyles.bottomSection}>

            {/* ── ROW 1: Terms & Conditions — full width ── */}
            {notes && (
                <View
                    style={{
                        marginBottom: 8,
                        paddingBottom: 8,
                        borderBottomWidth: 1,
                        borderBottomColor: pdfColors.border,
                    }}
                >
                    <Text style={commonStyles.notesSectionTitle}>{notesTitle}</Text>
                    {renderNotes(notes)}
                </View>
            )}

            {/* ── ROW 2: Summary Table | Bank Details ── */}
            <View
                style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: 8,
                    paddingBottom: 8,
                    borderBottomWidth: 1,
                    borderBottomColor: pdfColors.border,
                }}
            >
                {/* Left column: Bank Details (shown only when bankDetails exists) */}
                {bankDetails && (
                    <View style={{ flex: 1, paddingRight: 16 }}>
                        <Text style={commonStyles.notesSectionTitle}>Bank Details</Text>
                        <Text style={commonStyles.notesText}>{bankDetails}</Text>
                    </View>
                )}

                {/* Right column: Summary rows + Grand Total */}
                <View style={{ width: bankDetails ? '45%' : '45%', alignSelf: 'flex-end' }}>
                    {summaryItems.map((item, index) => (
                        <View key={index} style={commonStyles.summaryRow}>
                            <Text style={commonStyles.summaryLabel}>{item.label}</Text>
                            <Text style={[commonStyles.summaryValue, item.isBold ? { fontWeight: 'bold' } : {}]}>
                                {formatCurrency(item.value)}
                            </Text>
                        </View>
                    ))}

                    {grandTotal && (
                        <View style={commonStyles.grandTotalRow}>
                            <Text style={commonStyles.grandTotalLabel}>{grandTotal.label}</Text>
                            <Text style={commonStyles.grandTotalValue}>
                                {formatCurrency(grandTotal.value)}
                            </Text>
                        </View>
                    )}
                </View>
            </View>

            {/* ── ROW 3: Amount in Words / VAT in Words ── */}
            {(amountInWords || vatInWords) && (
                <View
                    style={{
                        marginBottom: 8,
                        paddingBottom: 8,
                        borderBottomWidth: 1,
                        borderBottomColor: pdfColors.border,
                    }}
                >
                    {amountInWords && (
                        <View style={commonStyles.amountInWordsRow}>
                            <Text style={commonStyles.amountInWordsLabel}>
                                Amount Chargeable (in words):
                            </Text>
                            <Text style={commonStyles.amountInWordsText}>{amountInWords}</Text>
                        </View>
                    )}
                    {vatInWords && (
                        <View style={commonStyles.amountInWordsRow}>
                            <Text style={commonStyles.amountInWordsLabel}>
                                VAT Chargeable (in words):
                            </Text>
                            <Text style={commonStyles.amountInWordsText}>{vatInWords}</Text>
                        </View>
                    )}
                </View>
            )}

            {/* ── ROW 4: Signature ── */}
            <SignatureSection
                leftLabel={leftSignatureLabel}
                rightLabel={rightSignatureLabel}
                companyName={companyName}
            />
        </View>
    );
};