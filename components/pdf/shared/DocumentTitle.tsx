import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { pdfColors, spacing, typography } from './styles';

const styles = StyleSheet.create({
    titleSection: {
        marginBottom: spacing.lg,
        alignItems: 'center',
    },

    titleWithIcon: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        justifyContent: 'center',
    },

    documentTitle: {
        ...typography.documentTitle,
        color: pdfColors.primary,
        textAlign: 'center',
    },
});

interface DocumentTitleProps {
    title: string;
    icon?: React.ReactNode;
}

export const DocumentTitle: React.FC<DocumentTitleProps> = ({
    title,
    icon,
}) => {
    return (
        <View style={styles.titleSection}>
            {icon ? (
                <View style={styles.titleWithIcon}>
                    {icon}
                    <Text style={styles.documentTitle}>{title}</Text>
                </View>
            ) : (
                <Text style={styles.documentTitle}>{title}</Text>
            )}
        </View>
    );
};