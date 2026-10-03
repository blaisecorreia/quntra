import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatPrice = (price?: number): string => {
  if (price === undefined || price === null) return 'N/A';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
};

export const formatChangePercent = (changePercent?: number): string => {
  if (changePercent === undefined || changePercent === null) return 'N/A';
  const rounded = changePercent.toFixed(2);
  return `${changePercent >= 0 ? '+' : ''}${rounded}%`;
};

export const formatMarketCap = (marketCap?: number): string => {
  if (marketCap === undefined || marketCap === null) return 'N/A';

  if (marketCap >= 1_000_000_000) {
    return `$${(marketCap / 1_000_000_000).toFixed(2)}B`;
  }
  if (marketCap >= 1_000_000) {
    return `$${(marketCap / 1_000_000).toFixed(2)}M`;
  }
  return formatPrice(marketCap);
};

export const formatEarningsDate = (dateStr: string, hour?: 'bmo' | 'amc' | ''): string => {
  // Parsing as UTC noon avoids the date shifting back a day in timezones
  // behind UTC when `new Date('YYYY-MM-DD')` is interpreted as midnight UTC.
  const date = new Date(`${dateStr}T12:00:00Z`);
  const formatted = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  const hourLabel = hour === 'bmo' ? 'before market open' : hour === 'amc' ? 'after market close' : undefined;
  return hourLabel ? `${formatted} (${hourLabel})` : formatted;
};

export const daysUntil = (dateStr: string): number => {
  const today = new Date();
  const todayUTC = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const target = new Date(`${dateStr}T00:00:00Z`).getTime();
  return Math.round((target - todayUTC) / (24 * 60 * 60 * 1000));
};
