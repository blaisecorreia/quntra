'use server';

const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';

const fetchJSON = async <T,>(endpoint: string, revalidate?: number): Promise<T | null> => {
  try {
    if (!process.env.FINNHUB_API_KEY) {
      console.log('FINNHUB_API_KEY not set');
      return null;
    }

    const url = `${FINNHUB_BASE_URL}${endpoint}${endpoint.includes('?') ? '&' : '?'}token=${process.env.FINNHUB_API_KEY}`;
    const res = await fetch(url, {
      next: { revalidate: revalidate ?? 3600 },
    });

    if (!res.ok) {
      console.log(`Finnhub API error: ${res.status}`);
      return null;
    }

    return await res.json();
  } catch (error) {
    console.log('Finnhub fetch error:', error);
    return null;
  }
};

export const searchStocks = async (query?: string): Promise<{ success: boolean; data?: StockWithWatchlistStatus[]; error?: string }> => {
  try {
    const trimmed = (query ?? '').trim();
    let stocks: Stock[] = [];

    if (!trimmed) {
      const { POPULAR_STOCK_SYMBOLS } = await import('@/lib/constants');
      const top = POPULAR_STOCK_SYMBOLS.slice(0, 10);

      const profiles = await Promise.all(
        top.map(async (symbol) => ({
          symbol,
          profile: await fetchJSON<ProfileData>(`/stock/profile2?symbol=${symbol}`, 3600),
        }))
      );

      stocks = profiles.map(({ symbol, profile }) => ({
        symbol: symbol.toUpperCase(),
        name: profile?.name || symbol,
        exchange: profile?.exchange || 'US',
        type: 'Common Stock',
      }));
    } else {
      const data = await fetchJSON<FinnhubSearchResponse>(`/search?q=${encodeURIComponent(trimmed)}`, 1800);

      if (!data || !data.result) {
        return { success: true, data: [] };
      }

      stocks = data.result
        .filter((r) => r.type === 'Common Stock' && r.symbol && r.description)
        .map((r) => ({
          symbol: r.symbol.toUpperCase(),
          name: r.description,
          exchange: r.displaySymbol || 'US',
          type: r.type,
        }))
        .slice(0, 15);
    }

    const { getWatchlistSymbolsByUserId } = await import('@/lib/actions/watchlist.actions');
    const watchlistRes = await getWatchlistSymbolsByUserId();
    const watchlistSymbols = new Set(watchlistRes.data || []);

    return {
      success: true,
      data: stocks.map((s) => ({
        ...s,
        isInWatchlist: watchlistSymbols.has(s.symbol),
      })),
    };
  } catch (error) {
    console.log('searchStocks failed', error);
    return { success: false, error: 'Search failed' };
  }
};

export const getStockQuote = async (symbol: string): Promise<{ success: boolean; data?: QuoteData; error?: string }> => {
  try {
    const data = await fetchJSON<QuoteData>(`/quote?symbol=${symbol.toUpperCase()}`, 30);
    if (!data) {
      return { success: true, data: {} };
    }
    return { success: true, data };
  } catch (error) {
    console.log('getStockQuote failed', error);
    return { success: false, error: 'Quote fetch failed' };
  }
};

export const getCompanyProfile = async (symbol: string): Promise<{ success: boolean; data?: ProfileData; error?: string }> => {
  try {
    const data = await fetchJSON<ProfileData>(`/stock/profile2?symbol=${symbol.toUpperCase()}`, 3600);
    if (!data) {
      return { success: true, data: {} };
    }
    return { success: true, data };
  } catch (error) {
    console.log('getCompanyProfile failed', error);
    return { success: false, error: 'Profile fetch failed' };
  }
};

export const getCompanyFinancials = async (symbol: string): Promise<{ success: boolean; data?: FinancialsData; error?: string }> => {
  try {
    const data = await fetchJSON<FinancialsData>(`/stock/metric?symbol=${symbol.toUpperCase()}&metric=all`, 3600);
    if (!data) {
      return { success: true, data: {} };
    }
    return { success: true, data };
  } catch (error) {
    console.log('getCompanyFinancials failed', error);
    return { success: false, error: 'Financials fetch failed' };
  }
};

export const getCompanyNews = async (symbol: string): Promise<{ success: boolean; data?: MarketNewsArticle[]; error?: string }> => {
  try {
    const data = await fetchJSON<RawNewsArticle[]>(`/company-news?symbol=${symbol.toUpperCase()}&limit=10`, 300);

    if (!data) {
      return { success: true, data: [] };
    }

    const normalized: MarketNewsArticle[] = data
      .filter((article) => article.headline && article.summary && article.url && article.datetime && article.source)
      .map((article) => ({
        id: article.id,
        headline: article.headline!,
        summary: article.summary!,
        source: article.source!,
        url: article.url!,
        datetime: article.datetime!,
        category: article.category || 'general',
        related: article.related || '',
        image: article.image,
      }));

    return { success: true, data: normalized };
  } catch (error) {
    console.log('getCompanyNews failed', error);
    return { success: false, error: 'News fetch failed' };
  }
};

export const getMarketNews = async (): Promise<{ success: boolean; data?: MarketNewsArticle[]; error?: string }> => {
  try {
    const data = await fetchJSON<RawNewsArticle[]>(`/news?category=general&minId=0`, 300);

    if (!data) {
      return { success: true, data: [] };
    }

    const normalized: MarketNewsArticle[] = data
      .filter((article) => article.headline && article.summary && article.url && article.datetime && article.source)
      .slice(0, 10)
      .map((article) => ({
        id: article.id,
        headline: article.headline!,
        summary: article.summary!,
        source: article.source!,
        url: article.url!,
        datetime: article.datetime!,
        category: article.category || 'general',
        related: article.related || '',
        image: article.image,
      }));

    return { success: true, data: normalized };
  } catch (error) {
    console.log('getMarketNews failed', error);
    return { success: false, error: 'Market news fetch failed' };
  }
};
