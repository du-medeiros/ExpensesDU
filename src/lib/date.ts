import { format as dateFnsFormat } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Parses a date string safely into a local Date object without timezone shifting.
 * If the string is a pure date ('YYYY-MM-DD'), it splits and creates it locally.
 * If the string contains a time component ('T'), it parses normally.
 */
export function parseDate(dateStr: string | Date): Date {
  if (dateStr instanceof Date) return dateStr;
  
  if (dateStr.includes('T')) {
    return new Date(dateStr);
  }
  
  const [year, month, day] = dateStr.split('-');
  return new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
}

/**
 * Formats a date string or Date object into a localized string using date-fns.
 */
export function formatDate(date: string | Date, formatStr: string = 'dd/MM/yyyy'): string {
  const dateObj = parseDate(date);
  return dateFnsFormat(dateObj, formatStr, { locale: ptBR });
}
