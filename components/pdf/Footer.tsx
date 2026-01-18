import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import type { ICompanyDetails } from '@/models/CompanyDetails';
import { formatDateTime } from '@/utils/formatters/date';
import { pdfColors } from './styles';

interface PDFFooterProps {
  companyDetails: ICompanyDetails | null;
  style?: any;
}

const styles = StyleSheet.create({
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: pdfColors.primary,
    padding: '10 25',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 7,
    color: pdfColors.textLight,
  },
  systemNote: {
    fontSize: 6,
    color: pdfColors.stroke,
    fontStyle: 'italic',
  },
});

export const PDFFooter: React.FC<PDFFooterProps> = ({ companyDetails, style }) => {
  return (
    <View style={[styles.footer, style]}>
      <Text style={styles.footerText}>
        Generated: {formatDateTime(new Date())}
      </Text>
      <Text style={styles.systemNote}>
        This is a system-generated document and is valid without signature
      </Text>
      <Text style={styles.footerText}>
        {companyDetails?.companyName || 'Company Name'} © {new Date().getFullYear()}
      </Text>
    </View>
  );
};