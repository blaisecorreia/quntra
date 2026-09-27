import { getStockQuote, getCompanyProfile, getCompanyNews } from '@/lib/actions/finnhub.actions';
import { getWatchlistSymbolsByUserId } from '@/lib/actions/watchlist.actions';
import TradingViewWidget from '@/components/TradingViewWidget';
import { WatchlistButton } from '@/components/Watchlist/WatchlistButton';
import { WatchlistNews } from '@/components/Watchlist/WatchlistNews';
import {
  SYMBOL_INFO_WIDGET_CONFIG,
  CANDLE_CHART_WIDGET_CONFIG,
  TECHNICAL_ANALYSIS_WIDGET_CONFIG,
  COMPANY_PROFILE_WIDGET_CONFIG,
  COMPANY_FINANCIALS_WIDGET_CONFIG,
} from '@/lib/constants';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { formatPrice } from '@/lib/utils';

interface StockDetailsPageParams {
  params: Promise<{ symbol: string }>;
}

export async function generateMetadata({ params }: StockDetailsPageParams): Promise<Metadata> {
  const { symbol } = await params;
  return {
    title: `${symbol} | Quntra`,
    description: `${symbol} stock details and charts`,
  };
}

export default async function StockDetailsPage({ params }: StockDetailsPageParams) {
  const { symbol } = await params;
  const upperSymbol = symbol.toUpperCase();

  const [quoteRes, profileRes, watchlistRes, newsRes] = await Promise.all([
    getStockQuote(upperSymbol),
    getCompanyProfile(upperSymbol),
    getWatchlistSymbolsByUserId(),
    getCompanyNews(upperSymbol),
  ]);

  if (!quoteRes.success || !quoteRes.data?.c) {
    notFound();
  }

  const isInWatchlist = watchlistRes.success && (watchlistRes.data || []).includes(upperSymbol);
  const news = newsRes.success ? (newsRes.data || []) : [];

  const price = quoteRes.data.c;
  const companyName = profileRes.data?.name || upperSymbol;
  const marketCap = profileRes.data?.marketCapitalization;

  const scriptUrl = `https://s3.tradingview.com/external-embedding/embed-widget-`;

  return (
    <div className="stock-details-container">
      {/* Header */}
      <div className="mb-8 pb-6 border-b border-gray-600">
        <div className="flex justify-between items-start gap-4">
          <div>
            <h1 className="watchlist-title mb-1">{companyName}</h1>
            <p className="text-base text-gray-400 mb-4">{upperSymbol}</p>
            <div className="flex items-baseline gap-4">
              <span className="text-3xl font-semibold text-gray-100">{formatPrice(price)}</span>
              {quoteRes.data?.dp && (
                <span className={`text-lg font-semibold ${quoteRes.data.dp >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {quoteRes.data.dp >= 0 ? '+' : ''}{quoteRes.data.dp.toFixed(2)}%
                </span>
              )}
            </div>
            {marketCap && (
              <p className="text-sm text-gray-500 mt-2">
                Market Cap: ${(marketCap / 1_000_000_000).toFixed(2)}B
              </p>
            )}
          </div>
          <div className="shrink-0 w-56">
            <WatchlistButton
              symbol={upperSymbol}
              company={companyName}
              isInWatchlist={isInWatchlist}
              type="button"
            />
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
        <div>
          <TradingViewWidget
            title="Price Chart"
            scriptUrl={`${scriptUrl}advanced-chart.js`}
            config={CANDLE_CHART_WIDGET_CONFIG(upperSymbol)}
            height={600}
          />
        </div>

        <div className="space-y-8">
          <TradingViewWidget
            title="Symbol Info"
            scriptUrl={`${scriptUrl}symbol-info.js`}
            config={SYMBOL_INFO_WIDGET_CONFIG(upperSymbol)}
            height={170}
          />

          <TradingViewWidget
            title="Technical Analysis"
            scriptUrl={`${scriptUrl}technical-analysis.js`}
            config={TECHNICAL_ANALYSIS_WIDGET_CONFIG(upperSymbol)}
            height={400}
          />
        </div>
      </div>

      {/* Company Details */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
        <TradingViewWidget
          title="Company Profile"
          scriptUrl={`${scriptUrl}company-profile.js`}
          config={COMPANY_PROFILE_WIDGET_CONFIG(upperSymbol)}
          height={440}
        />

        <TradingViewWidget
          title="Financials"
          scriptUrl={`${scriptUrl}financials.js`}
          config={COMPANY_FINANCIALS_WIDGET_CONFIG(upperSymbol)}
          height={464}
        />
      </div>

      {/* News */}
      <div>
        <WatchlistNews news={news} />
      </div>
    </div>
  );
}
