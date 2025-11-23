// Formatting utilities for Arabic and English localization

/**
 * Format number based on language
 * @param num - The number to format
 * @param lang - Language code ('ar' or 'en')
 * @param decimals - Number of decimal places (default: 2)
 */
export function formatNumber(num: number, lang: 'ar' | 'en' = 'en', decimals: number = 2): string {
  if (num === null || num === undefined || isNaN(num)) return '0';

  const formatted = num.toFixed(decimals);

  if (lang === 'ar') {
    // Convert to Arabic-Indic numerals (٠-٩)
    return formatted
      .replace(/0/g, '٠')
      .replace(/1/g, '١')
      .replace(/2/g, '٢')
      .replace(/3/g, '٣')
      .replace(/4/g, '٤')
      .replace(/5/g, '٥')
      .replace(/6/g, '٦')
      .replace(/7/g, '٧')
      .replace(/8/g, '٨')
      .replace(/9/g, '٩')
      .replace(/\./g, '٫'); // Arabic decimal separator
  }

  return formatted;
}

/**
 * Format currency based on language
 * @param amount - The amount to format
 * @param lang - Language code ('ar' or 'en')
 * @param showSymbol - Show currency symbol (default: true)
 */
export function formatCurrency(amount: number, lang: 'ar' | 'en' = 'en', showSymbol: boolean = true): string {
  if (amount === null || amount === undefined || isNaN(amount)) return lang === 'ar' ? '٠ ر.س' : '0 SAR';

  const formatted = formatNumber(amount, lang, 2);
  const symbol = lang === 'ar' ? 'ر.س' : 'SAR';

  if (!showSymbol) return formatted;

  if (lang === 'ar') {
    return `${formatted} ${symbol}`;
  }

  return `${symbol} ${formatted}`;
}

/**
 * Format integer (no decimals) based on language
 * @param num - The number to format
 * @param lang - Language code ('ar' or 'en')
 */
export function formatInteger(num: number, lang: 'ar' | 'en' = 'en'): string {
  return formatNumber(num, lang, 0);
}

/**
 * Format percentage based on language
 * @param num - The number to format as percentage
 * @param lang - Language code ('ar' or 'en')
 */
export function formatPercentage(num: number, lang: 'ar' | 'en' = 'en'): string {
  if (num === null || num === undefined || isNaN(num)) return lang === 'ar' ? '٠٪' : '0%';

  const formatted = formatNumber(num, lang, 1);

  if (lang === 'ar') {
    return `٪${formatted}`;
  }

  return `${formatted}%`;
}

/**
 * Format date based on language
 * @param date - The date to format
 * @param lang - Language code ('ar' or 'en')
 * @param format - Format type ('short', 'long', or 'withTime')
 */
export function formatDate(date: Date | string, lang: 'ar' | 'en' = 'en', format: 'short' | 'long' | 'withTime' = 'short'): string {
  if (!date) return '';

  const d = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(d.getTime())) return '';

  const day = d.getDate();
  const month = d.getMonth() + 1;
  const year = d.getFullYear();
  const hours = d.getHours();
  const minutes = d.getMinutes();

  const padZero = (n: number) => n.toString().padStart(2, '0');

  if (lang === 'ar') {
    const monthNames = [
      'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];

    const dayAr = formatInteger(day, 'ar');
    const yearAr = formatInteger(year, 'ar');
    const hoursAr = formatInteger(hours, 'ar');
    const minutesAr = padZero(minutes).replace(/0/g, '٠').replace(/1/g, '١').replace(/2/g, '٢').replace(/3/g, '٣').replace(/4/g, '٤').replace(/5/g, '٥').replace(/6/g, '٦').replace(/7/g, '٧').replace(/8/g, '٨').replace(/9/g, '٩');

    if (format === 'long') {
      return `${dayAr} ${monthNames[month - 1]}، ${yearAr}`;
    } else if (format === 'withTime') {
      return `${dayAr}/${formatInteger(month, 'ar')}/${yearAr} - ${hoursAr}:${minutesAr}`;
    }

    return `${dayAr}/${formatInteger(month, 'ar')}/${yearAr}`;
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  if (format === 'long') {
    return `${monthNames[month - 1]} ${day}, ${year}`;
  } else if (format === 'withTime') {
    return `${padZero(month)}/${padZero(day)}/${year} ${padZero(hours)}:${padZero(minutes)}`;
  }

  return `${padZero(month)}/${padZero(day)}/${year}`;
}

/**
 * Format phone number based on language
 * @param phone - The phone number to format
 * @param lang - Language code ('ar' or 'en')
 */
export function formatPhone(phone: string, lang: 'ar' | 'en' = 'en'): string {
  if (!phone) return '';

  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');

  if (lang === 'ar') {
    // Convert to Arabic-Indic numerals
    return cleaned
      .replace(/0/g, '٠')
      .replace(/1/g, '١')
      .replace(/2/g, '٢')
      .replace(/3/g, '٣')
      .replace(/4/g, '٤')
      .replace(/5/g, '٥')
      .replace(/6/g, '٦')
      .replace(/7/g, '٧')
      .replace(/8/g, '٨')
      .replace(/9/g, '٩');
  }

  return cleaned;
}

/**
 * Get relative time in Arabic or English
 * @param date - The date to compare
 * @param lang - Language code ('ar' or 'en')
 */
export function getRelativeTime(date: Date | string, lang: 'ar' | 'en' = 'en'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (lang === 'ar') {
    if (diffMins < 1) return 'الآن';
    if (diffMins === 1) return 'منذ دقيقة';
    if (diffMins < 60) return `منذ ${formatInteger(diffMins, 'ar')} دقيقة`;
    if (diffHours === 1) return 'منذ ساعة';
    if (diffHours < 24) return `منذ ${formatInteger(diffHours, 'ar')} ساعة`;
    if (diffDays === 1) return 'أمس';
    if (diffDays < 7) return `منذ ${formatInteger(diffDays, 'ar')} أيام`;
    if (diffDays < 30) return `منذ ${formatInteger(Math.floor(diffDays / 7), 'ar')} أسابيع`;
    if (diffDays < 365) return `منذ ${formatInteger(Math.floor(diffDays / 30), 'ar')} شهر`;
    return `منذ ${formatInteger(Math.floor(diffDays / 365), 'ar')} سنة`;
  }

  if (diffMins < 1) return 'just now';
  if (diffMins === 1) return '1 minute ago';
  if (diffMins < 60) return `${diffMins} minutes ago`;
  if (diffHours === 1) return '1 hour ago';
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}
