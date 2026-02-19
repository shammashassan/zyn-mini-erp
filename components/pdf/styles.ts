import { StyleSheet, Font } from '@react-pdf/renderer';
import path from 'path';

// ============================================================================
// COLOR PALETTE (UNCHANGED - REUSED FROM ORIGINAL)
// ============================================================================
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

// ============================================================================
// TYPOGRAPHY SCALE
// ============================================================================
export const typography = {
  // Document title - Large, bold, confident
  documentTitle: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    letterSpacing: 1,
  },
  // Document number
  documentNumber: {
    fontSize: 14,
    fontWeight: 'bold' as const,
  },
  // Section titles
  sectionTitle: {
    fontSize: 9,
    fontWeight: 'bold' as const,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
  },
  // Labels - Small uppercase
  label: {
    fontSize: 7,
    fontWeight: 'bold' as const,
    letterSpacing: 0.3,
    textTransform: 'uppercase' as const,
  },
  // Body text
  body: {
    fontSize: 9,
    lineHeight: 1.5,
  },
  bodySmall: {
    fontSize: 8,
    lineHeight: 1.4,
  },
  bodyLarge: {
    fontSize: 10,
    lineHeight: 1.5,
  },
  // Emphasis
  emphasis: {
    fontSize: 11,
    fontWeight: 'bold' as const,
  },
  // Grand total
  grandTotal: {
    fontSize: 14,
    fontWeight: 'bold' as const,
  },
};

// ============================================================================
// SPACING SYSTEM - Optimized for single page
// ============================================================================
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
};

// ============================================================================
// FONT REGISTRATION
// ============================================================================
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

// ============================================================================
// COMMON STYLES - REDESIGNED
// ============================================================================
export const commonStyles = StyleSheet.create({
  // ===== PAGE LAYOUT =====
  page: {
    fontFamily: 'Roboto',
    fontSize: 9,
    padding: spacing.xxl,
    paddingBottom: 100, // Extra padding for bottom section above footer
    backgroundColor: pdfColors.white,
    position: 'relative',
  },

  watermark: {
    position: 'absolute',
    top: '35%',
    left: '20%',
    fontSize: 80,
    color: '#f5f5f5',
    opacity: 0.03,
    transform: 'rotate(-45deg)',
    fontWeight: 'bold',
    zIndex: -1,
  },

  // ===== BOTTOM SECTION (positioned at bottom) =====
  bottomSection: {
    position: 'absolute',
    bottom: 36, // Above footer (footer ~30pt tall)
    left: spacing.xxl,
    right: spacing.xxl,
  },

  // ===== HEADER SECTION =====
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
    marginTop: -spacing.xxl,   // bleed to top page edge
    marginLeft: -spacing.xxl,  // bleed to left page edge
    marginRight: -spacing.xxl, // bleed to right page edge
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.xxl, // re-align inner content
    borderBottomWidth: 1,
    borderBottomColor: pdfColors.border,
  },

  headerLogo: {
    width: 60,
    height: 60,
    objectFit: 'contain',
  },

  headerCompanyInfo: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },

  headerCompanyDetail: {
    fontSize: 8,
    color: pdfColors.textDark,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  // ===== TITLE SECTION =====
  titleSection: {
    marginBottom: spacing.md,
  },

  documentTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: spacing.xs,
  },

  documentTitle: {
    ...typography.documentTitle,
    color: pdfColors.primary,
  },

  documentNumber: {
    ...typography.documentNumber,
    color: pdfColors.textDark,
  },

  documentMeta: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing.xs,
  },

  documentMetaItem: {
    flexDirection: 'column',
    gap: 2,
  },

  metaLabel: {
    ...typography.label,
    color: pdfColors.textMuted,
  },

  metaValue: {
    ...typography.body,
    color: pdfColors.textDark,
  },

  // ===== PARTY SECTION =====
  partySection: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: pdfColors.border,
  },

  partyColumn: {
    flex: 1,
  },

  partyLabel: {
    ...typography.sectionTitle,
    color: pdfColors.primary,
    marginBottom: spacing.xs,
  },

  partyName: {
    ...typography.bodyLarge,
    fontWeight: 'bold',
    color: pdfColors.textMain,
    marginBottom: 2,
  },

  partyDetail: {
    ...typography.bodySmall,
    color: pdfColors.textDark,
    marginBottom: 2,
  },

  // ===== ITEMS TABLE =====
  table: {
    marginBottom: spacing.md,
  },

  tableHeader: {
    flexDirection: 'row',
    backgroundColor: pdfColors.secondary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },

  tableHeaderText: {
    ...typography.label,
    color: pdfColors.primary,
  },

  tableRow: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: pdfColors.border,
  },

  tableRowAlt: {
    backgroundColor: '#fafafa',
  },

  tableCell: {
    ...typography.body,
    color: pdfColors.textDark,
  },

  tableCellBold: {
    ...typography.body,
    color: pdfColors.textDark,
    fontWeight: 'bold',
  },

  // ===== SUMMARY SECTION =====
  summarySection: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: spacing.sm,
  },

  summaryBox: {
    width: '40%',
    minWidth: 200,
  },

  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
    gap: spacing.sm,
  },

  summaryLabel: {
    ...typography.body,
    color: pdfColors.textDark,
  },

  summaryValue: {
    ...typography.body,
    color: pdfColors.textDark,
    fontWeight: 'bold',
    textAlign: 'right',
  },

  summaryDivider: {
    height: 1,
    backgroundColor: pdfColors.border,
    marginVertical: spacing.xs,
  },

  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    paddingTop: spacing.sm,
    gap: spacing.sm,
    borderTopWidth: 2,
    borderTopColor: pdfColors.primary,
  },

  grandTotalLabel: {
    ...typography.emphasis,
    color: pdfColors.primary,
  },

  grandTotalValue: {
    ...typography.grandTotal,
    color: pdfColors.primary,
    textAlign: 'right',
  },

  // ===== AMOUNT IN WORDS (INLINE) =====
  amountInWordsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
    gap: spacing.xs,
  },

  amountInWordsLabel: {
    fontSize: 7,
    color: pdfColors.textMuted,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },

  amountInWordsText: {
    fontSize: 7.5,
    color: pdfColors.textDark,
    fontStyle: 'italic',
    flex: 1,
  },

  // ===== NOTES & TERMS SECTION =====
  notesSection: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: pdfColors.border,
  },

  notesSectionTitle: {
    ...typography.sectionTitle,
    color: pdfColors.primary,
    marginBottom: spacing.xs,
  },

  notesText: {
    ...typography.bodySmall,
    color: pdfColors.textDark,
    lineHeight: 1.4,
  },

  // Two-column layout for terms and bank details
  twoColumnSection: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: pdfColors.border,
  },

  leftColumn: {
    flex: 1,
  },

  rightColumn: {
    flex: 1,
  },

  // ===== REASON/DESCRIPTION BOX =====
  reasonBox: {
    backgroundColor: '#f9fafb',
    border: `1 solid ${pdfColors.border}`,
    borderRadius: 2,
    padding: spacing.md,
    marginBottom: spacing.md,
  },

  reasonLabel: {
    ...typography.label,
    color: pdfColors.primary,
    marginBottom: spacing.xs,
  },

  reasonText: {
    ...typography.body,
    color: pdfColors.textDark,
    lineHeight: 1.5,
  },

  // ===== SIGNATURE SECTION - LARGER =====
  signatureSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: pdfColors.border,
  },

  signatureBox: {
    width: '45%',
    paddingTop: 50, // Larger signature space
    minHeight: 60,
  },

  signatureLine: {
    borderTopWidth: 1,
    borderTopColor: pdfColors.border,
    paddingTop: spacing.sm,
  },

  signatureLabel: {
    ...typography.bodySmall,
    color: pdfColors.textMuted,
    textAlign: 'center',
  },

  // ===== FOOTER =====
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xxl,
    borderTopWidth: 0.5,
    borderTopColor: pdfColors.border,
  },

  footerText: {
    fontSize: 7.5,
    color: pdfColors.textMuted,
  },

  // ===== UTILITY CLASSES =====
  textRight: { textAlign: 'right' },
  textCenter: { textAlign: 'center' },
  textBold: { fontWeight: 'bold' },
  textMuted: { color: pdfColors.textMuted },

  // Column widths for tables
  col40: { width: '40%' },
  col30: { width: '30%' },
  col25: { width: '25%' },
  col20: { width: '20%' },
  col15: { width: '15%' },
  col10: { width: '10%' },
});

// ============================================================================
// SPECIALIZED DOCUMENT STYLES
// ============================================================================

// For vouchers (A5 landscape)
export const voucherStyles = StyleSheet.create({
  page: {
    ...commonStyles.page,
    padding: spacing.lg,
  },

  amountBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: pdfColors.secondary,
    border: `1 solid ${pdfColors.border}`,
    borderRadius: 2,
    padding: spacing.md,
    marginVertical: spacing.md,
  },

  amountWordsSection: {
    flex: 1,
    marginRight: spacing.md,
  },

  amountValueSection: {
    alignItems: 'flex-end',
    paddingLeft: spacing.md,
    borderLeftWidth: 1,
    borderLeftColor: pdfColors.border,
  },

  amountWords: {
    ...typography.body,
    color: pdfColors.textDark,
    fontStyle: 'italic',
  },

  amountValue: {
    ...typography.grandTotal,
    fontSize: 20,
    color: pdfColors.primary,
  },
});