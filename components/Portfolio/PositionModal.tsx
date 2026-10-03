'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { addPosition, sellShares } from '@/lib/actions/portfolio.actions';
import { searchStocks } from '@/lib/actions/finnhub.actions';
import { useDebounce } from '@/hooks/useDebounce';
import { toast } from 'sonner';
import { Loader2, TrendingUp, X } from 'lucide-react';

type PositionFormData = {
  quantity: string;
  pricePerShare: string;
};

export const PositionModal = ({ open, setOpen, action, position }: PositionModalProps) => {
  const isSell = action === 'sell';
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Buy mode: the user picks a stock from search instead of typing its
  // symbol/company by hand — this is the only source of truth for both,
  // so there's no chance the two drift out of sync with each other.
  const [selectedStock, setSelectedStock] = useState<{ symbol: string; company: string } | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<StockWithWatchlistStatus[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<PositionFormData>({
    defaultValues: { quantity: '', pricePerShare: '' },
  });

  const runSearch = useCallback(async () => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const res = await searchStocks(trimmed);
      setResults(res.success && res.data ? res.data : []);
    } catch (error) {
      console.log('Stock search error:', error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [query]);

  const debouncedSearch = useDebounce(runSearch, 300);

  useEffect(() => {
    debouncedSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const handlePickStock = (stock: StockWithWatchlistStatus) => {
    setSelectedStock({ symbol: stock.symbol, company: stock.name });
    setQuery('');
    setResults([]);
  };

  const closeAndReset = () => {
    setOpen(false);
    reset();
    setSelectedStock(null);
    setQuery('');
    setResults([]);
  };

  const onSubmit = async (data: PositionFormData) => {
    const quantity = parseFloat(data.quantity);
    if (isNaN(quantity) || quantity <= 0) {
      toast.error('Enter a valid quantity');
      return;
    }

    setIsLoading(true);
    try {
      if (isSell) {
        const symbol = position?.symbol || '';
        const res = await sellShares({ symbol, quantity });
        if (res.success) {
          toast.success(`Sold ${quantity} share${quantity === 1 ? '' : 's'} of ${symbol}`);
          closeAndReset();
          router.refresh();
        } else {
          toast.error(res.error || 'Failed to sell shares');
        }
      } else {
        if (!selectedStock) {
          toast.error('Search for and select a stock first');
          setIsLoading(false);
          return;
        }

        const pricePerShare = parseFloat(data.pricePerShare);
        if (isNaN(pricePerShare) || pricePerShare <= 0) {
          toast.error('Enter a valid price per share');
          setIsLoading(false);
          return;
        }

        const res = await addPosition({
          symbol: selectedStock.symbol,
          company: selectedStock.company,
          quantity,
          pricePerShare,
        });
        if (res.success) {
          toast.success(`Added ${quantity} share${quantity === 1 ? '' : 's'} of ${selectedStock.symbol}`);
          closeAndReset();
          router.refresh();
        } else {
          toast.error(res.error || 'Failed to add position');
        }
      }
    } catch (error) {
      toast.error('Something went wrong');
      console.log('Position modal error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : closeAndReset())}>
      <DialogContent className="alert-dialog">
        <DialogHeader>
          <DialogTitle>{isSell ? `Sell ${position?.symbol}` : 'Add Position'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {isSell ? (
            <>
              <div className="space-y-2">
                <Label>Symbol</Label>
                <Input disabled value={position?.symbol || ''} />
              </div>
              <div className="space-y-2">
                <Label>Company</Label>
                <Input disabled value={position?.company || ''} />
              </div>
              <div className="space-y-2">
                <Label>Shares Held</Label>
                <Input disabled value={position?.quantity ?? ''} />
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <Label>Stock *</Label>
              {selectedStock ? (
                <div className="position-selected-stock">
                  <div>
                    <div className="font-semibold">{selectedStock.symbol}</div>
                    <div className="text-sm text-gray-400">{selectedStock.company}</div>
                  </div>
                  <button type="button" onClick={() => setSelectedStock(null)} className="position-clear-stock" aria-label="Change stock">
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <>
                  <Input
                    autoFocus
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search by symbol or company name..."
                  />
                  {query.trim() && (
                    <div className="position-search-results">
                      {isSearching ? (
                        <div className="search-list-indicator text-sm text-gray-400">
                          <Loader2 className="inline animate-spin h-3.5 w-3.5 mr-2" />
                          Searching...
                        </div>
                      ) : results.length === 0 ? (
                        <div className="search-list-indicator text-sm text-gray-400">No stocks found for &quot;{query}&quot;</div>
                      ) : (
                        results.map((stock) => (
                          <button
                            type="button"
                            key={stock.symbol}
                            onClick={() => handlePickStock(stock)}
                            className="position-search-item"
                          >
                            <TrendingUp className="h-4 w-4 text-gray-500 shrink-0" />
                            <div>
                              <div className="text-sm font-medium text-gray-200">{stock.name}</div>
                              <div className="text-xs text-gray-500">{stock.symbol}</div>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                  {!selectedStock && !query.trim() && (
                    <p className="text-xs text-gray-500">Start typing to find a stock — its symbol fills in automatically.</p>
                  )}
                </>
              )}
            </div>
          )}

          {!isSell && (
            <div className="space-y-2">
              <Label htmlFor="pricePerShare">Price Per Share *</Label>
              <Input
                id="pricePerShare"
                type="number"
                step="0.01"
                placeholder="e.g., 150.50"
                {...register('pricePerShare', { required: 'Price per share is required' })}
              />
              {errors.pricePerShare && <p className="text-red-400 text-sm">{errors.pricePerShare.message}</p>}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="quantity">{isSell ? 'Shares to Sell *' : 'Quantity *'}</Label>
            <Input
              id="quantity"
              type="number"
              step="0.0001"
              placeholder="e.g., 10"
              {...register('quantity', { required: 'Quantity is required' })}
            />
            {errors.quantity && <p className="text-red-400 text-sm">{errors.quantity.message}</p>}
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <Button type="button" variant="outline" onClick={closeAndReset}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : isSell ? 'Sell Shares' : 'Add Position'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
