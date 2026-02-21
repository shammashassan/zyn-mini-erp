import React from 'react';
import { View, Text } from '@react-pdf/renderer';
import { commonStyles } from './styles';
import { formatCurrency } from '@/utils/formatters/currency';

export interface SummaryItem {
    label: string;
    value: number;
    isBold?: boolean;
}

interface SummaryBlockProps {
    items: SummaryItem[];
    grandTotal?: {
        label: string;
        value: number;
    };
    amountInWords?: string;
    vatInWords?: string;
}

export const SummaryBlock: React.FC<SummaryBlockProps> = ({
    items,
    grandTotal,
    amountInWords,
    vatInWords,
}) => {
    return (
        <View>
            <View style={commonStyles.summarySection}>
                <View style={commonStyles.summaryBox}>
                    {/* Regular summary items */}
                    {items.map((item, index) => (
                        <View key={index} style={commonStyles.summaryRow}>
                            <Text style={commonStyles.summaryLabel}>{item.label}</Text>
                            <Text style={commonStyles.summaryValue}>
                                {formatCurrency(item.value)}
                            </Text>
                        </View>
                    ))}

                    {/* Grand Total */}
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

            {/* Amount in Words - INLINE */}
            {amountInWords && (
                <View style={commonStyles.amountInWordsRow}>
                    <Text style={commonStyles.amountInWordsLabel}>
                        Amount Chargeable (in words):
                    </Text>
                    <Text style={commonStyles.amountInWordsText}>{amountInWords}</Text>
                </View>
            )}

            {/* VAT in Words - INLINE */}
            {vatInWords && (
                <View style={commonStyles.amountInWordsRow}>
                    <Text style={commonStyles.amountInWordsLabel}>
                        VAT Chargeable (in words):
                    </Text>
                    <Text style={commonStyles.amountInWordsText}>{vatInWords}</Text>
                </View>
            )}
        </View>
    );
};

// ============================================================================
// HELPER FUNCTION TO BUILD SUMMARY ITEMS
// ============================================================================

interface BuildSummaryParams {
    grossTotal: number;
    discount?: number;
    vatAmount?: number;
    grandTotal: number;
}

export const buildInvoiceSummary = ({
    grossTotal,
    discount = 0,
    vatAmount = 0,
    grandTotal,
}: BuildSummaryParams): SummaryItem[] => {
    const items: SummaryItem[] = [
        { label: 'Gross Total', value: grossTotal },
    ];

    if (discount > 0) {
        items.push({ label: 'Discount', value: discount });
    }

    const subtotal = grossTotal - discount;
    items.push({ label: 'Subtotal', value: subtotal });

    if (vatAmount > 0) {
        items.push({ label: 'VAT', value: vatAmount });
    }

    return items;
};