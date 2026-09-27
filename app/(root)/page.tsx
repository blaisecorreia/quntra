import TradingViewWidget from "@/components/TradingViewWidget";
import { WatchlistTable } from "@/components/Watchlist/WatchlistTable";
import { getWatchlistPreview } from "@/lib/actions/watchlist.actions";
import {
    HEATMAP_WIDGET_CONFIG,
    MARKET_DATA_WIDGET_CONFIG,
    MARKET_OVERVIEW_WIDGET_CONFIG,
    TOP_STORIES_WIDGET_CONFIG
} from "@/lib/constants";
import Link from "next/link";

const Home = async () => {
    const scriptUrl = `https://s3.tradingview.com/external-embedding/embed-widget-`;
    const watchlistRes = await getWatchlistPreview(4);
    const watchlist = watchlistRes.success ? watchlistRes.data || [] : [];

    return (
        <div className="flex min-h-screen home-wrapper">
          <section className="grid w-full gap-8 home-section">
              <div className="md:col-span-1 xl:col-span-1">
                  <TradingViewWidget
                    title="Market Overview"
                    scriptUrl={`${scriptUrl}market-overview.js`}
                    config={MARKET_OVERVIEW_WIDGET_CONFIG}
                    className="custom-chart"
                    height={600}
                  />
              </div>
              <div className="h-full md:col-span-1 xl:col-span-2">

                    <TradingViewWidget
                        title="Market Summary"
                        scriptUrl={`${scriptUrl}market-quotes.js`}
                        config={MARKET_DATA_WIDGET_CONFIG}
                        height={600}
                    />
                </div>
              {
    <div className="md-col-span xl:col-span-2">
        <TradingViewWidget
            title="Stock Heatmap"
            scriptUrl={`${scriptUrl}stock-heatmap.js`}
            config={HEATMAP_WIDGET_CONFIG}
            height={600}
        />
    </div>
}
          </section>
            <section className="grid w-full gap-8 home-section">
                <div className="h-full md:col-span-1 xl:col-span-1">
                    <TradingViewWidget
                        scriptUrl={`${scriptUrl}timeline.js`}
                        config={TOP_STORIES_WIDGET_CONFIG}
                        height={600}
                    />
                </div>

            </section>

            {watchlist.length > 0 && (
                <section className="grid w-full gap-8 home-section">
                    <div className="w-full">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-2xl font-bold text-white">Watchlist Preview</h2>
                            <Link href="/watchlist" className="text-yellow-500 hover:text-yellow-400 text-sm font-medium">
                                View All →
                            </Link>
                        </div>
                        <WatchlistTable watchlist={watchlist} />
                    </div>
                </section>
            )}
        </div>
    )
}

export default Home;