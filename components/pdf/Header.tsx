import React from 'react';
import { View, Text, Image, StyleSheet } from '@react-pdf/renderer';
import type { ICompanyDetails } from '@/models/CompanyDetails';
import { pdfColors } from './styles';
import { MapPinIcon, PhoneIcon, MailIcon } from './Icons';

interface PDFHeaderProps {
  companyDetails: ICompanyDetails | null;
  style?: any;
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: pdfColors.primary,
    padding: '15 25',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logo: {
    width: 55,
    height: 55,
    objectFit: 'contain',
  },
  companyInfo: {
    alignItems: 'flex-end',
  },
  companyDetail: {
    fontSize: 8,
    color: pdfColors.textLight,
    marginBottom: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
});

export const PDFHeader: React.FC<PDFHeaderProps> = ({ companyDetails, style }) => {
  return (
    <View style={[styles.header, style]}>
      {companyDetails?.logoUrl ? (
        <Image style={styles.logo} src={companyDetails.logoUrl} />
      ) : (
        <View style={{ width: 55, height: 55 }} />
      )}
      
      <View style={styles.companyInfo}>
        {companyDetails?.address && (
          <View style={styles.companyDetail}>
            <MapPinIcon />
            <Text>{companyDetails.address}</Text>
          </View>
        )}
        {companyDetails?.contactNumber && (
          <View style={styles.companyDetail}>
            <PhoneIcon />
            <Text>
              {companyDetails.contactNumber}
              {companyDetails.telephone && ` / ${companyDetails.telephone}`}
            </Text>
          </View>
        )}
        {companyDetails?.email && (
          <View style={styles.companyDetail}>
            <MailIcon />
            <Text>{companyDetails.email}</Text>
          </View>
        )}
        {companyDetails?.website && (
          <Text style={[styles.companyDetail, { gap: 0 }]}>
            {companyDetails.website}
          </Text>
        )}
      </View>
    </View>
  );
};