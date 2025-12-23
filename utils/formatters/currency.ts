import { DEFAULT_CURRENCY, DEFAULT_LOCALE } from '../constants';

/**
 * Format a number as currency with full precision
 * @param amount - The amount to format
 * @param currency - Currency code (defaults to AED)
 * @returns Formatted currency string
 */
export const formatCurrency = (amount: number | undefined | null, currency = DEFAULT_CURRENCY): string => {

  if (amount === undefined || amount === null || isNaN(amount)) {
    return `${currency} 0.00`;
  }

  return amount.toLocaleString(DEFAULT_LOCALE, {
    style: 'currency',
    currency
  });
};

/**
 * Format currency without decimal points (e.g., AED 2,021)
 */
export const formatCurrencyInteger = (amount: number): string => {
  return new Intl.NumberFormat(DEFAULT_LOCALE, {
    style: 'currency',
    currency: 'AED', // Replace with your default currency if dynamic
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

/**
 * Format a number as compact currency (with K, M suffixes)
 * @param amount - The amount to format
 * @param currency - Currency code (defaults to AED)
 * @returns Compact formatted currency string
 */
export const formatCompactCurrency = (amount: number | undefined | null, currency = DEFAULT_CURRENCY): string => {

  if (amount === undefined || amount === null || isNaN(amount)) {
    return '0';
  }

  const absAmount = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';

  if (absAmount >= 1000000) {
    return `${sign}${(absAmount / 1000000).toFixed(1)}M`;
  }
  if (absAmount >= 1000) {
    return `${sign}${(absAmount / 1000).toFixed(1)}K`;
  }

  return `${sign}${absAmount.toLocaleString()}`;
};