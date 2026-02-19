import React from 'react';
import { Svg, Path, Circle } from '@react-pdf/renderer';
import { pdfColors } from './styles';

interface IconProps {
  size?: number;
  color?: string;
  strokeWidth?: string;
}

export const MapPinIcon = ({
  size = 10,
  color = pdfColors.textMuted,
  strokeWidth = "1.75"
}: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
    />
    <Circle cx="12" cy="9" r="2.5" fill="none" stroke={color} strokeWidth={strokeWidth} />
  </Svg>
);

export const PhoneIcon = ({
  size = 10,
  color = pdfColors.textMuted,
  strokeWidth = "1.75"
}: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M6.62 10.79a15.05 15.05 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.02-.24c1.12.37 2.33.57 3.57.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1C9.61 21 3 14.39 3 6.5a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1.02l-2.2 2.2z"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
    />
  </Svg>
);

export const MailIcon = ({
  size = 10,
  color = pdfColors.textMuted,
  strokeWidth = "1.75"
}: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M3 8l7.89 5.26a2 2 0 0 0 2.22 0L21 8M5 19h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2z"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
    />
  </Svg>
);

export const GlobeIcon = ({
  size = 10,
  color = pdfColors.textMuted,
  strokeWidth = "1.75"
}: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Circle cx="12" cy="12" r="10" fill="none" stroke={color} strokeWidth={strokeWidth} />
    <Path d="M2 12h20" fill="none" stroke={color} strokeWidth={strokeWidth} />
    <Path
      d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
    />
  </Svg>
);