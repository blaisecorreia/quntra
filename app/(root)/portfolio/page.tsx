import { getPortfolioWithData } from '@/lib/actions/portfolio.actions';
import { PortfolioTable } from '@/components/Portfolio/PortfolioTable';
import { AddPositionButton } from '@/components/Portfolio/AddPositionButton';
import { Metadata } from 'next';
import { Briefcase } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Portfolio | Quntra',
  description: 'Your stock portfolio',
};

export default async function PortfolioPage() {
  const portfolioRes = await getPortfolioWithData();
  const positions = portfolioRes.success ? portfolioRes.data || [] : [];
  const isEmpty = positions.length === 0;

  if (isEmpty) {
    return (
      <>
        <div className="flex items-center justify-between mb-8">
          <h1 className="watchlist-title">My Portfolio</h1>
          <AddPositionButton />
        </div>

        <div className="watchlist-empty-container">
          <div className="watchlist-empty">
            <Briefcase className="watchlist-star" />
            <h2 className="empty-title">Your portfolio is empty</h2>
            <p className="empty-description">Add a position to start tracking shares you own and your gain or loss</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <h1 className="watchlist-title">My Portfolio</h1>
        <AddPositionButton />
      </div>

      <PortfolioTable positions={positions} />
    </>
  );
}
