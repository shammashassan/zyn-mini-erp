import { DEFAULT_LOCALE } from '../constants';


//-------------------------------------------Date formatting utilities-----------------------------------------------

/**
 * Internal helper to safely create a valid Date object
 */
const getValidDate = (date: Date | string | number | undefined | null): Date | null => {
  if (!date) return null;

  const dateObj = date instanceof Date ? date : new Date(date);

  if (isNaN(dateObj.getTime())) {
    console.error('Invalid date provided:', date);
    return null;
  }

  return dateObj;
};

/**
 * Format a date as a day key (yyyy-MM-dd)
 */
export const formatDateKey = (date: Date | string | number | undefined | null): string => {
  const d = getValidDate(date);
  if (!d) return 'N/A';
  return d.toISOString().split('T')[0];
};

/**
 * Format a date as month-year key (MMM yyyy)
 */
export const formatMonthKey = (date: Date | string | number | undefined | null): string => {
  const d = getValidDate(date);
  if (!d) return 'N/A';
  return d.toLocaleDateString(DEFAULT_LOCALE, { month: 'short', year: 'numeric' });
};

/**
 * Format a date as year-month key for sorting (yyyy-MM)
 */
export const formatYearMonthKey = (date: Date | string | number | undefined | null): string => {
  const d = getValidDate(date);
  if (!d) return 'N/A';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

/**
 * Format a date as month-year key for sorting (MM-yyyy)
 */
export const formatMonthYearKey = (date: Date | string | number | undefined | null): string => {
  const d = getValidDate(date);
  if (!d) return 'N/A';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${month}-${year}`;
};

/**
 * Format a date as "DD MMM YYYY" (e.g., "07 Nov 2025")
 */
export const formatDisplayDate = (date: Date | string | number | undefined | null): string => {
  const d = getValidDate(date);
  if (!d) return 'N/A';

  const day = String(d.getDate()).padStart(2, '0');
  const month = d.toLocaleDateString(DEFAULT_LOCALE, { month: 'short' });
  const year = d.getFullYear();

  return `${day} ${month} ${year}`;
};

/**
 * Format a date as "DD MMMM YYYY" (e.g., "07 November 2025")
 */
export const formatLongDate = (date: Date | string | number | undefined | null): string => {
  const d = getValidDate(date);
  if (!d) return 'N/A';

  const day = String(d.getDate()).padStart(2, '0');
  const month = d.toLocaleDateString(DEFAULT_LOCALE, { month: 'long' });
  const year = d.getFullYear();

  return `${day} ${month} ${year}`;
};

/**
 * Format a time as "HH:MM AM/PM" (e.g., "02:30 PM")
 */
export const formatTime = (date: Date | string | number | undefined | null): string => {
  const d = getValidDate(date);
  if (!d) return 'N/A';

  return d.toLocaleTimeString(DEFAULT_LOCALE, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

/**
 * Format a date as "DD MMM YYYY, HH:MM AM/PM" (e.g., "02 Nov 2025, 11:56 PM")
 */
export const formatDateTime = (date: Date | string | number | undefined | null): string => {
  const d = getValidDate(date);
  if (!d) return 'N/A';

  const day = String(d.getDate()).padStart(2, '0');
  const month = d.toLocaleDateString(DEFAULT_LOCALE, { month: 'short' });
  const year = d.getFullYear();
  const time = d.toLocaleTimeString(DEFAULT_LOCALE, { hour: '2-digit', minute: '2-digit', hour12: true });

  return `${day} ${month} ${year}, ${time}`;
};

/**
 * Format a date as "MMM dd" (e.g., "Nov 07")
 */
export const formatMonthDay = (date: Date | string | number | undefined | null): string => {
  const d = getValidDate(date);
  if (!d) return 'N/A';
  return d.toLocaleDateString(DEFAULT_LOCALE, { month: 'short', day: '2-digit' });
};

/**
 * Format a date as month key (MMM) (e.g., "Nov")
 */
export const formatMonth = (date: Date | string | number | undefined | null): string => {
  const d = getValidDate(date);
  if (!d) return 'N/A';
  return d.toLocaleDateString(DEFAULT_LOCALE, { month: 'short' });
};

export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'Just now';
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  }

  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    return `${diffInWeeks} week${diffInWeeks > 1 ? 's' : ''} ago`;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${diffInMonths} month${diffInMonths > 1 ? 's' : ''} ago`;
  }

  const diffInYears = Math.floor(diffInDays / 365);
  return `${diffInYears} year${diffInYears > 1 ? 's' : ''} ago`;
}

export function formatTimeAgo(date: Date | string): string {
  return formatRelativeTime(date);
}