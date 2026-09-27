'use server';

import { auth } from '@/lib/better-auth/auth';
import { connectToDatabase } from '@/database/mongoose';
import { Alert } from '@/database/models/alert.model';
import { headers } from 'next/headers';
import { getStockQuote } from '@/lib/actions/finnhub.actions';

export const createAlert = async (alertData: AlertData): Promise<{ success: boolean; error?: string }> => {
  try {
    await connectToDatabase();

    const session = await auth.api.getSession({ headers: await headers() });
    if (!session || !session.user) {
      return { success: false, error: 'Not authenticated' };
    }

    const threshold = parseFloat(alertData.threshold);
    if (isNaN(threshold)) {
      return { success: false, error: 'Invalid threshold' };
    }

    await Alert.create({
      userId: session.user.id,
      symbol: alertData.symbol.toUpperCase(),
      company: alertData.company,
      alertName: alertData.alertName,
      alertType: alertData.alertType,
      threshold,
    });

    return { success: true };
  } catch (error) {
    console.log('createAlert failed', error);
    return { success: false, error: 'Failed to create alert' };
  }
};

export const updateAlert = async ({
  alertId,
  ...alertData
}: AlertData & { alertId: string }): Promise<{ success: boolean; error?: string }> => {
  try {
    await connectToDatabase();

    const session = await auth.api.getSession({ headers: await headers() });
    if (!session || !session.user) {
      return { success: false, error: 'Not authenticated' };
    }

    const threshold = parseFloat(alertData.threshold);
    if (isNaN(threshold)) {
      return { success: false, error: 'Invalid threshold' };
    }

    await Alert.updateOne(
      { _id: alertId, userId: session.user.id },
      {
        alertName: alertData.alertName,
        alertType: alertData.alertType,
        threshold,
      }
    );

    return { success: true };
  } catch (error) {
    console.log('updateAlert failed', error);
    return { success: false, error: 'Failed to update alert' };
  }
};

export const toggleAlertActive = async ({ alertId }: { alertId: string }): Promise<{ success: boolean; error?: string }> => {
  try {
    await connectToDatabase();

    const session = await auth.api.getSession({ headers: await headers() });
    if (!session || !session.user) {
      return { success: false, error: 'Not authenticated' };
    }

    const alert = await Alert.findOne({ _id: alertId, userId: session.user.id });
    if (!alert) {
      return { success: false, error: 'Alert not found' };
    }

    await Alert.updateOne({ _id: alertId }, { isActive: !alert.isActive });

    return { success: true };
  } catch (error) {
    console.log('toggleAlertActive failed', error);
    return { success: false, error: 'Failed to toggle alert' };
  }
};

export const deleteAlert = async ({ alertId }: { alertId: string }): Promise<{ success: boolean; error?: string }> => {
  try {
    await connectToDatabase();

    const session = await auth.api.getSession({ headers: await headers() });
    if (!session || !session.user) {
      return { success: false, error: 'Not authenticated' };
    }

    await Alert.deleteOne({ _id: alertId, userId: session.user.id });

    return { success: true };
  } catch (error) {
    console.log('deleteAlert failed', error);
    return { success: false, error: 'Failed to delete alert' };
  }
};

export const getAlertsByUserId = async (): Promise<{ success: boolean; data?: Alert[]; error?: string }> => {
  try {
    await connectToDatabase();

    const session = await auth.api.getSession({ headers: await headers() });
    if (!session || !session.user) {
      return { success: true, data: [] };
    }

    const docs = await Alert.find({ userId: session.user.id }).lean().sort({ createdAt: -1 });

    if (!docs || docs.length === 0) {
      return { success: true, data: [] };
    }

    const enriched = await Promise.allSettled(
      docs.map(async (doc) => {
        const quoteRes = await getStockQuote(doc.symbol);
        const currentPrice = quoteRes.data?.c;
        const changePercent = quoteRes.data?.dp;

        return {
          id: doc._id.toString(),
          symbol: doc.symbol,
          company: doc.company,
          alertName: doc.alertName,
          currentPrice: currentPrice || 0,
          alertType: doc.alertType,
          threshold: doc.threshold,
          changePercent: changePercent || 0,
          isActive: doc.isActive,
        } as Alert;
      })
    );

    const data: Alert[] = enriched
      .filter((result) => result.status === 'fulfilled')
      .map((result) => (result as PromiseFulfilledResult<Alert>).value);

    return { success: true, data };
  } catch (error) {
    console.log('getAlertsByUserId failed', error);
    return { success: true, data: [] };
  }
};
