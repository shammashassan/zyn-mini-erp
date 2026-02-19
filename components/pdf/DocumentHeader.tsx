import React from 'react';
import { View, Text, Image } from '@react-pdf/renderer';
import type { ICompanyDetails } from '@/models/CompanyDetails';
import { commonStyles } from './styles';
import { MapPinIcon, PhoneIcon, MailIcon, GlobeIcon } from './Icons';

interface DocumentHeaderProps {
  companyDetails: ICompanyDetails | null;
}

export const DocumentHeader: React.FC<DocumentHeaderProps> = ({ companyDetails }) => {
  return (
    <View style={commonStyles.header}>
      {/* Logo Section */}
      {companyDetails?.logoUrl ? (
        <Image style={commonStyles.headerLogo} src={companyDetails.logoUrl} />
      ) : (
        <View style={{ width: 60, height: 60 }} />
      )}

      {/* Company Info Section */}
      <View style={commonStyles.headerCompanyInfo}>
        {companyDetails?.address && (
          <View style={commonStyles.headerCompanyDetail}>
            <MapPinIcon size={8} />
            <Text>{companyDetails.address}</Text>
          </View>
        )}
        {companyDetails?.contactNumber && (
          <View style={commonStyles.headerCompanyDetail}>
            <PhoneIcon size={8} />
            <Text>
              {companyDetails.contactNumber}
              {companyDetails.telephone && ` / ${companyDetails.telephone}`}
            </Text>
          </View>
        )}
        {companyDetails?.email && (
          <View style={commonStyles.headerCompanyDetail}>
            <MailIcon size={8} />
            <Text>{companyDetails.email}</Text>
          </View>
        )}
        {companyDetails?.website && (
          <View style={commonStyles.headerCompanyDetail}>
            <GlobeIcon size={8} />
            <Text>{companyDetails.website}</Text>
          </View>
        )}
      </View>
    </View>
  );
};