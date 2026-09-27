'use client';

import { useCallback, useEffect, useState } from 'react';
import { Command, CommandDialog, CommandInput, CommandList, CommandEmpty } from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { Loader2, TrendingUp } from 'lucide-react';
import { searchStocks } from '@/lib/actions/finnhub.actions';
import { WatchlistButton } from '@/components/Watchlist/WatchlistButton';
import { useDebounce } from '@/hooks/useDebounce';
import Link from 'next/link';

export const SearchCommand = ({
  open: controlledOpen,
  setOpen: setControlledOpen,
  renderAs = 'button',
  buttonLabel = 'Search',
  className = '',
  initialStocks,
}: SearchCommandProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<StockWithWatchlistStatus[]>(initialStocks);
  const [isLoading, setIsLoading] = useState(false);

  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = setControlledOpen || setInternalOpen;

  // A dedicated page can force the results list to render inline (no dialog chrome)
  // by passing renderAs="text" with a fixed `open`; a nav/header trigger passes
  // renderAs="text" or "button" uncontrolled and gets a popup instead.
  const isInlineEmbed = renderAs === 'text' && controlledOpen !== undefined;

  const isSearchMode = !!searchQuery.trim();
  const displayResults = isSearchMode ? results : results.slice(0, 10);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (!isInlineEmbed) setOpen(!isOpen);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, isInlineEmbed, setOpen]);

  const handleSearch = useCallback(async () => {
    if (!isSearchMode) {
      setResults(initialStocks);
      return;
    }

    setIsLoading(true);
    try {
      const res = await searchStocks(searchQuery.trim());
      setResults(res.success && res.data ? res.data : []);
    } catch (error) {
      console.log('Search error:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, isSearchMode, initialStocks]);

  const debouncedSearch = useDebounce(handleSearch, 300);

  useEffect(() => {
    debouncedSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const handleSelectStock = () => {
    setOpen(false);
    setSearchQuery('');
    setResults(initialStocks);
  };

  const handleWatchlistChange = (symbol: string, isAdded: boolean) => {
    setResults((prev) => prev.map((s) => (s.symbol === symbol ? { ...s, isInWatchlist: isAdded } : s)));
  };

  const listBody = (
    <CommandList className="search-list">
      {isLoading ? (
        <CommandEmpty className="search-list-empty">
          <Loader2 className="inline animate-spin h-4 w-4 text-yellow-500 mr-2" />
          Searching...
        </CommandEmpty>
      ) : displayResults.length === 0 ? (
        <div className="search-list-indicator">
          {isSearchMode ? `No stocks found for "${searchQuery}"` : 'No stocks available'}
        </div>
      ) : (
        <ul>
          <div className="search-count">
            {isSearchMode ? 'Search results' : 'Popular stocks'} ({displayResults.length})
          </div>
          {displayResults.map((stock) => (
            <li key={stock.symbol} className="search-item">
              <Link href={`/stocks/${stock.symbol}`} onClick={handleSelectStock} className="search-item-link">
                <TrendingUp className="h-4 w-4 text-gray-500 shrink-0" />
                <div>
                  <div className="search-item-name">{stock.name}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {stock.symbol} · {stock.exchange} · {stock.type}
                  </div>
                </div>
              </Link>
              <WatchlistButton
                symbol={stock.symbol}
                company={stock.name}
                isInWatchlist={stock.isInWatchlist}
                type="icon"
                onWatchlistChange={handleWatchlistChange}
              />
            </li>
          ))}
        </ul>
      )}
    </CommandList>
  );

  if (isInlineEmbed) {
    return (
      <Command className={`search-dialog ${className}`}>
        <div className="search-field">
          <CommandInput
            value={searchQuery}
            onValueChange={setSearchQuery}
            placeholder="Search stocks by symbol or name..."
            className="search-input"
          />
        </div>
        {listBody}
      </Command>
    );
  }

  return (
    <>
      {renderAs === 'text' ? (
        <span onClick={() => setOpen(true)} className={`search-text ${className}`}>
          {buttonLabel}
        </span>
      ) : (
        <Button onClick={() => setOpen(true)} className={`search-btn ${className}`}>
          {buttonLabel}
        </Button>
      )}
      <CommandDialog open={isOpen} onOpenChange={setOpen} className="search-dialog">
        <div className="search-field">
          <CommandInput
            value={searchQuery}
            onValueChange={setSearchQuery}
            placeholder="Search stocks by symbol or name..."
            className="search-input"
            autoFocus
          />
        </div>
        {listBody}
      </CommandDialog>
    </>
  );
};
