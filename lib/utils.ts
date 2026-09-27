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
