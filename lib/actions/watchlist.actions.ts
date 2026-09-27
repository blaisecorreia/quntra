'use server';

import { auth } from '@/lib/better-auth/auth';
import { connectToDatabase } from '@/database/mongoose';
import { Watchlist } from '@/database/models/watchlist.model';
import { headers } from 'next/headers';
import { formatPrice, formatChangePercent, formatMarketCap } from '@/lib/utils';
import { getStockQuote, getCompanyProfile, getCompanyFinancials } from '@/lib/actions/finnhub.actions';

export const addToWatchlist = async ({ symbol, company }: { symbol: string; company: string }): Promise<{ success: boolean; error?: string }> => {
  try {
    await connectToDatabase();

    const session = await auth.api.getSession({ headers: await headers() });
    if (!session || !session.user) {
      return { success: false, error: 'Not authenticated' };
    }

    const existing = await Watchlist.findOne({ userId: session.user.id, symbol: symbol.toUpperCase() });
    if (existing) {
      return { success: false, error: 'Already in watchlist' };
    }

    await Watchlist.create({
      userId: session.user.id,
      symbol: symbol.toUpperCase(),
      company: company.trim(),
      addedAt: new Date(),
    });

    return { success: true };
  } catch (error) {
    console.log('addToWatchlist failed', error);
    return { success: false, error: 'Failed to add to watchlist' };
  }
};

export const removeFromWatchlist = async ({ symbol }: { symbol: string }): Promise<{ success: boolean; error?: string }> => {
  try {
    await connectToDatabase();

    const session = await auth.api.getSession({ headers: await headers() });
    if (!session || !session.user) {
      return { success: false, error: 'Not authenticated' };
    }

    await Watchlist.deleteOne({
      userId: session.user.id,
      symbol: symbol.toUpperCase(),
    });

    return { success: true };
  } catch (error) {
    console.log('removeFromWatchlist failed', error);
    return { success: false, error: 'Failed to remove from watchlist' };
  }
};

export const getWatchlistSymbolsByUserId = async (): Promise<{ success: boolean; data?: string[]; error?: string }> => {
  try {
    await connectToDatabase();

    const session = await auth.api.getSession({ headers: await headers() });
    if (!session || !session.user) {
      return { success: true, data: [] };
    }

    const docs = await Watchlist.find({ userId: session.user.id }).select('symbol').lean();
    return { success: true, data: docs.map((d) => d.symbol) };
  } catch (error) {
    console.log('getWatchlistSymbolsByUserId failed', error);
    return { success: true, data: [] };
  }
};

export const getWatchlistWithData = async (): Promise<{ success: boolean; data?: StockWithData[]; error?: string }> => {
  try {
    await connectToDatabase();

    const session = await auth.api.getSession({ headers: await headers() });
    if (!session || !session.user) {
      return { success: false, error: 'Not authenticated' };
    }

    const docs = await Watchlist.find({ userId: session.user.id }).lean().sort({ addedAt: -1 });

    if (!docs || docs.length === 0) {
      return { success: true, data: [] };
    }

    const enriched = await Promise.allSettled(
      docs.map(async (doc) => {
        const quoteRes = await getStockQuote(doc.symbol);
        const profileRes = await getCompanyProfile(doc.symbol);
        const financialsRes = await getCompanyFinancials(doc.symbol);

        const currentPrice = quoteRes.data?.c;
        const changePercent = quoteRes.data?.dp;
        const marketCap = profileRes.data?.marketCapitalization;
        const peRatio = financialsRes.data?.metric?.peRatio;

        return {
          userId: doc.userId,
          symbol: doc.symbol,
          company: doc.company,
          addedAt: doc.addedAt,
          currentPrice,
          changePercent,
          priceFormatted: formatPrice(currentPrice),
          changeFormatted: formatChangePercent(changePercent),
          marketCap: formatMarketCap(marketCap),
          peRatio: peRatio ? peRatio.toFixed(2) : 'N/A',
        };
      })
    );

    const data: StockWithData[] = enriched
      .filter((result) => result.status === 'fulfilled')
      .map((result) => (result as PromiseFulfilledResult<StockWithData>).value);

    return { success: true, data };
  } catch (error) {
    console.log('getWatchlistWithData failed', error);
    return { success: false, error: 'Failed to fetch watchlist' };
  }
};

export const getWatchlistPreview = async (limit: number = 4): Promise<{ success: boolean; data?: StockWithData[]; error?: string }> => {
  try {
    await connectToDatabase();

    const session = await auth.api.getSession({ headers: await headers() });
    if (!session || !session.user) {
      return { success: true, data: [] };
    }

    const docs = await Watchlist.find({ userId: session.user.id }).lean().sort({ addedAt: -1 }).limit(limit);

    if (!docs || docs.length === 0) {
      return { success: true, data: [] };
    }

    const enriched = await Promise.allSettled(
      docs.map(async (doc) => {
        const quoteRes = await getStockQuote(doc.symbol);
        const profileRes = await getCompanyProfile(doc.symbol);
        const financialsRes = await getCompanyFinancials(doc.symbol);

        const currentPrice = quoteRes.data?.c;
        const changePercent = quoteRes.data?.dp;
        const marketCap = profileRes.data?.marketCapitalization;
        const peRatio = financialsRes.data?.metric?.peRatio;

        return {
          userId: doc.userId,
          symbol: doc.symbol,
          company: doc.company,
          addedAt: doc.addedAt,
          currentPrice,
          changePercent,
          priceFormatted: formatPrice(currentPrice),
          changeFormatted: formatChangePercent(changePercent),
          marketCap: formatMarketCap(marketCap),
          peRatio: peRatio ? peRatio.toFixed(2) : 'N/A',
        };
      })
    );

    const data: StockWithData[] = enriched
      .filter((result) => result.status === 'fulfilled')
      .map((result) => (result as PromiseFulfilledResult<StockWithData>).value);

    return { success: true, data };
  } catch (error) {
    console.log('getWatchlistPreview failed', error);
    return { success: false, error: 'Failed to fetch preview' };
  }
};
