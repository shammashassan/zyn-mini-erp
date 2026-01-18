import { StyleSheet, Font } from '@react-pdf/renderer';
import path from 'path';

export const pdfColors = {
  primary: '#1a237e',      // Deep Blue (Header bg)
  primaryDark: '#283593',  // Darker Blue (Title section)
  secondary: '#e8eaf6',    // Light Blue (Info bar bg)
  accent: '#ffeb3b',       // Yellow (Doc number/Grand Total)
  stroke: '#90caf9',       // Light Blue Stroke (Icons)
  textMain: '#000000',
  textDark: '#424242',     // Body text
  textLight: '#e3f2fd',    // Header text
  textMuted: '#666666',    // Labels
  white: '#ffffff',
  border: '#e0e0e0',
  success: '#e8f5e9',      // Light Green
  successBorder: '#a5d6a7',
  warning: '#fff3e0',      // Light Orange
  warningBorder: '#ffe0b2',
  danger: '#ffebee',       // Light Red
};

// Singleton to ensure fonts are registered once
let fontsRegistered = false;

export const registerPdfFonts = () => {
  if (fontsRegistered) return;
  
  try {
    Font.register({
      family: 'Roboto',
      fonts: [
        { src: path.join(process.cwd(), 'public', 'fonts', 'Roboto-Regular.ttf') },
        { src: path.join(process.cwd(), 'public', 'fonts', 'Roboto-Bold.ttf'), fontWeight: 'bold' },
        { src: path.join(process.cwd(), 'public', 'fonts', 'Roboto-Italic.ttf'), fontStyle: 'italic' },
      ],
    });
    fontsRegistered = true;
  } catch (error) {
    console.error("Failed to register PDF fonts.", error);
  }
};

export const commonStyles = StyleSheet.create({
  page: {
    fontFamily: 'Roboto',
    fontSize: 9,
    padding: 0,
    backgroundColor: pdfColors.white,
    position: 'relative',
  },
  watermark: {
    position: 'absolute',
    top: '35%',
    left: '15%',
    fontSize: 80,
    color: '#f0f0f0',
    opacity: 0.05,
    transform: 'rotate(-45deg)',
    fontWeight: 'bold',
    zIndex: -1,
  },
  
  // Layout Helpers
  row: { flexDirection: 'row' },
  col: { flexDirection: 'column' },
  
  // Headers & Info Bars
  titleSection: {
    backgroundColor: pdfColors.primaryDark,
    padding: '10 25',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  documentTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: pdfColors.white,
    letterSpacing: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  documentNumber: {
    fontSize: 13,
    fontWeight: 'bold',
    color: pdfColors.accent,
  },
  infoBar: {
    backgroundColor: pdfColors.secondary,
    padding: '12 25',
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 2,
    borderBottomColor: pdfColors.primary,
  },
  sectionLabel: {
    fontSize: 8,
    color: pdfColors.primary,
    fontWeight: 'bold',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  
  // Tables
  table: {
    marginTop: 10,
    marginBottom: 15,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: pdfColors.primary,
    padding: 8,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  tableHeaderText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: pdfColors.white,
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: pdfColors.border,
  },
  tableCell: {
    fontSize: 8.5,
    color: pdfColors.textDark,
  },
  
  // Text Utils
  bold: { fontWeight: 'bold' },
  textRight: { textAlign: 'right' },
  textCenter: { textAlign: 'center' },
  textSmall: { fontSize: 8 },
});