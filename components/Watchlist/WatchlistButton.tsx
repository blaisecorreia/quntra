'use client';

import { useState } from 'react';
import { addToWatchlist, removeFromWatchlist } from '@/lib/actions/watchlist.actions';
import { toast } from 'sonner';
import { Star, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export const WatchlistButton = ({
  symbol,
  company,
  isInWatchlist,
  showTrashIcon = false,
  type = 'button',
  onWatchlistChange,
}: WatchlistButtonProps) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isAdded, setIsAdded] = useState(isInWatchlist);

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsLoading(true);

    try {
      if (isAdded) {
        const res = await removeFromWatchlist({ symbol });
        if (res.success) {
          setIsAdded(false);
          toast.success(`${symbol} removed from watchlist`);
          onWatchlistChange?.(symbol, false);
          router.refresh();
        } else {
          toast.error(res.error || 'Failed to remove');
        }
      } else {
        const res = await addToWatchlist({ symbol, company });
        if (res.success) {
          setIsAdded(true);
          toast.success(`${symbol} added to watchlist`);
          onWatchlistChange?.(symbol, true);
          router.refresh();
        } else {
          toast.error(res.error || 'Failed to add');
        }
      }
    } catch (error) {
      toast.error('Something went wrong');
      console.log('WatchlistButton error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (type === 'icon') {
    return (
      <button
        onClick={handleToggle}
        disabled={isLoading}
        className={`watchlist-icon-btn ${isAdded ? 'watchlist-icon-added' : ''}`}
        title={isAdded ? 'Remove from watchlist' : 'Add to watchlist'}
      >
        {showTrashIcon && isAdded ? (
          <Trash2 className="trash-icon" />
        ) : (
          <Star className="star-icon" fill={isAdded ? 'currentColor' : 'none'} />
        )}
      </button>
    );
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isLoading}
      className={`watchlist-btn flex items-center justify-center gap-2 px-6 ${isAdded ? 'watchlist-remove' : ''}`}
    >
      <Star size={16} fill={isAdded ? 'currentColor' : 'none'} />
      {isAdded ? 'Remove from Watchlist' : 'Add to Watchlist'}
    </button>
  );
};
