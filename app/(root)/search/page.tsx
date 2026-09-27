import { SearchCommand } from '@/components/SearchCommand';
import { searchStocks } from '@/lib/actions/finnhub.actions';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Search Stocks | Quntra',
  description: 'Search and discover stocks',
};

export default async function SearchPage() {
  const initialStocksRes = await searchStocks();
  const initialStocks = initialStocksRes.success ? initialStocksRes.data || [] : [];

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="watchlist-title mb-8">Stock Search</h1>
      <SearchCommand renderAs="text" open initialStocks={initialStocks} />
    </div>
  );
}
