'use server';

import { auth } from '@/lib/better-auth/auth';
import { connectToDatabase } from '@/database/mongoose';
import { Position } from '@/database/models/position.model';
import { headers } from 'next/headers';
import { getStockQuote } from '@/lib/actions/finnhub.actions';
import { formatPrice, formatChangePercent } from '@/lib/utils';

export const addPosition = async ({
  symbol,
  company,
  quantity,
  pricePerShare,
}: {
  symbol: string;
  company: string;
  quantity: number;
  pricePerShare: number;
}): Promise<{ success: boolean; error?: string }> => {
  try {
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return { success: false, error: 'Quantity must be greater than 0' };
    }
    if (!Number.isFinite(pricePerShare) || pricePerShare <= 0) {
      return { success: false, error: 'Price per share must be greater than 0' };
    }

    await connectToDatabase();

    const session = await auth.api.getSession({ headers: await headers() });
    if (!session || !session.user) {
      return { success: false, error: 'Not authenticated' };
    }

    const upperSymbol = symbol.toUpperCase();
    const existing = await Position.findOne({ userId: session.user.id, symbol: upperSymbol });

    if (existing) {
      // Weighted average cost basis: buying more shares at a different
      // price blends into the existing average rather than replacing it.
      const newQuantity = existing.quantity + quantity;
      const newAverageCost = (existing.quantity * existing.averageCost + quantity * pricePerShare) / newQuantity;

      await Position.updateOne(
        { _id: existing._id },
        { quantity: newQuantity, averageCost: newAverageCost }
      );
    } else {
      await Position.create({
        userId: session.user.id,
        symbol: upperSymbol,
        company: company.trim(),
        quantity,
        averageCost: pricePerShare,
      });
    }

    return { success: true };
  } catch (error) {
    console.log('addPosition failed', error);
    return { success: false, error: 'Failed to add position' };
  }
};

export const sellShares = async ({
  symbol,
  quantity,
}: {
  symbol: string;
  quantity: number;
}): Promise<{ success: boolean; error?: string }> => {
  try {
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return { success: false, error: 'Quantity must be greater than 0' };
    }

    await connectToDatabase();

    const session = await auth.api.getSession({ headers: await headers() });
    if (!session || !session.user) {
      return { success: false, error: 'Not authenticated' };
    }

    const upperSymbol = symbol.toUpperCase();
    const existing = await Position.findOne({ userId: session.user.id, symbol: upperSymbol });
    if (!existing) {
      return { success: false, error: 'Position not found' };
    }
    if (quantity > existing.quantity) {
      return { success: false, error: `You only hold ${existing.quantity} share${existing.quantity === 1 ? '' : 's'}` };
    }

    const remaining = existing.quantity - quantity;
    if (remaining <= 0) {
      await Position.deleteOne({ _id: existing._id });
    } else {
      // Average cost basis is unchanged by a partial sell — standard
      // accounting convention, matches how most brokerages display it.
      await Position.updateOne({ _id: existing._id }, { quantity: remaining });
    }

    return { success: true };
  } catch (error) {
    console.log('sellShares failed', error);
    return { success: false, error: 'Failed to sell shares' };
  }
};

export const deletePosition = async ({ symbol }: { symbol: string }): Promise<{ success: boolean; error?: string }> => {
  try {
    await connectToDatabase();

    const session = await auth.api.getSession({ headers: await headers() });
    if (!session || !session.user) {
      return { success: false, error: 'Not authenticated' };
    }

    await Position.deleteOne({ userId: session.user.id, symbol: symbol.toUpperCase() });

    return { success: true };
  } catch (error) {
    console.log('deletePosition failed', error);
    return { success: false, error: 'Failed to delete position' };
  }
};

export const getPortfolioWithData = async (): Promise<{ success: boolean; data?: PositionWithData[]; error?: string }> => {
  try {
    await connectToDatabase();

    const session = await auth.api.getSession({ headers: await headers() });
    if (!session || !session.user) {
      return { success: true, data: [] };
    }

    const docs = await Position.find({ userId: session.user.id }).lean().sort({ createdAt: -1 });
    if (!docs || docs.length === 0) {
      return { success: true, data: [] };
    }

    const enriched = await Promise.allSettled(
      docs.map(async (doc) => {
        const quoteRes = await getStockQuote(doc.symbol);
        const currentPrice = quoteRes.data?.c;
        const costBasis = doc.quantity * doc.averageCost;
        const marketValue = currentPrice !== undefined ? doc.quantity * currentPrice : undefined;
        const gainLoss = marketValue !== undefined ? marketValue - costBasis : undefined;
        const gainLossPercent = gainLoss !== undefined && costBasis > 0 ? (gainLoss / costBasis) * 100 : undefined;

        return {
          id: doc._id.toString(),
          symbol: doc.symbol,
          company: doc.company,
          quantity: doc.quantity,
          averageCost: doc.averageCost,
          costBasis,
          costBasisFormatted: formatPrice(costBasis),
          currentPrice,
          priceFormatted: formatPrice(currentPrice),
          marketValue,
          marketValueFormatted: formatPrice(marketValue),
          gainLoss,
          gainLossFormatted: gainLoss !== undefined ? `${gainLoss >= 0 ? '+' : ''}${formatPrice(gainLoss)}` : 'N/A',
          gainLossPercent,
          gainLossPercentFormatted: formatChangePercent(gainLossPercent),
        } as PositionWithData;
      })
    );

    const data: PositionWithData[] = enriched
      .filter((result) => result.status === 'fulfilled')
      .map((result) => (result as PromiseFulfilledResult<PositionWithData>).value);

    return { success: true, data };
  } catch (error) {
    console.log('getPortfolioWithData failed', error);
    return { success: false, error: 'Failed to fetch portfolio' };
  }
};
