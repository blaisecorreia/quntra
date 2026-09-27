import { getWatchlistWithData } from '@/lib/actions/watchlist.actions';
import { getAlertsByUserId } from '@/lib/actions/alerts.actions';
import { WatchlistTable } from '@/components/Watchlist/WatchlistTable';
import { WatchlistNews } from '@/components/Watchlist/WatchlistNews';
import { AlertsList } from '@/components/Alerts/AlertsList';
import { getMarketNews, getWatchlistEarnings } from '@/lib/actions/finnhub.actions';
import { Metadata } from 'next';
import Link from 'next/link';
import { Star } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Watchlist | Quntra',
  description: 'Your stock watchlist',
};

export default async function WatchlistPage() {
  const [watchlistRes, alertsRes, newsRes] = await Promise.all([
    getWatchlistWithData(),
    getAlertsByUserId(),
    getMarketNews(),
  ]);

  const watchlist = watchlistRes.success ? watchlistRes.data || [] : [];
  const alerts = alertsRes.success ? alertsRes.data || [] : [];
  const news = newsRes.success ? newsRes.data || [] : [];

  const earningsRes = await getWatchlistEarnings(watchlist.map((s) => s.symbol));
  const earningsBySymbol = earningsRes.success ? earningsRes.data || {} : {};

  const isEmpty = watchlist.length === 0;

  if (isEmpty) {
    return (
      <>
        <h1 className="watchlist-title mb-8">My Watchlist</h1>

        <div className="watchlist-empty-container">
          <div className="watchlist-empty">
            <Star className="watchlist-star" />
            <h2 className="empty-title">Your watchlist is empty</h2>
            <p className="empty-description">Add stocks to track and monitor their performance</p>
            <Link href="/search" className="yellow-btn inline-flex items-center px-6">
              Search Stocks
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <h1 className="watchlist-title mb-8">My Watchlist</h1>

      <div className="watchlist-container">
        <div className="watchlist">
          <WatchlistTable watchlist={watchlist} earningsBySymbol={earningsBySymbol} />
          <WatchlistNews news={news.slice(0, 10)} />
        </div>

        <div className="watchlist-alerts">
          <AlertsList alertData={alerts} />
        </div>
      </div>
    </>
  );
}
