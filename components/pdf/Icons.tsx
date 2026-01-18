import React from 'react';
import { Svg, Path } from '@react-pdf/renderer';
import { pdfColors } from './styles';

interface IconProps {
  size?: number;
  color?: string;
  strokeWidth?: string;
}

export const MapPinIcon = ({ size = 10, color = pdfColors.stroke, strokeWidth = "2" }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth}>
    <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <Path d="M12 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
  </Svg>
);

export const PhoneIcon = ({ size = 10, color = pdfColors.stroke, strokeWidth = "2" }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth}>
    <Path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </Svg>
);

export const MailIcon = ({ size = 10, color = pdfColors.stroke, strokeWidth = "2" }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth}>
    <Path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <Path d="M22 6l-10 7L2 6" />
  </Svg>
);

export const FileTextIcon = ({ size = 12, color = "#ffffff", strokeWidth = "2" }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth}>
    <Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <Path d="M14 2v6h6" />
    <Path d="M16 13H8" />
    <Path d="M16 17H8" />
    <Path d="M10 9H8" />
  </Svg>
);

export const TruckIcon = ({ size = 12, color = "#ffffff", strokeWidth = "2" }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth}>
        <Path d="M1 3h15v13H1z" />
        <Path d="M16 8h3l3 3v5h-6V8z" />
        <Path d="M5.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM18.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z" />
    </Svg>
);