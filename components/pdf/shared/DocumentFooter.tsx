import React from 'react';
import { View, Text } from '@react-pdf/renderer';
import type { ICompanyDetails } from '@/models/CompanyDetails';
import { formatDateTime } from '@/utils/formatters/date';
import { commonStyles, pdfColors } from './styles';

interface DocumentFooterProps {
  companyDetails: ICompanyDetails | null;
}

export const DocumentFooter: React.FC<DocumentFooterProps> = ({ companyDetails }) => {
  return (
    <View style={[commonStyles.footer, { backgroundColor: pdfColors.secondary }]} fixed>
      <Text style={commonStyles.footerText}>
        Generated: {formatDateTime(new Date())}
      </Text>
      <Text style={commonStyles.footerText}>
        This is a system-generated document and is valid without signature
      </Text>
      <Text style={commonStyles.footerText}>
        {companyDetails?.companyName || 'Company Name'} {'\u00A9'} {new Date().getFullYear()}
      </Text>
    </View>
  );
};