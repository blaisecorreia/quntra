'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PORTFOLIO_TABLE_HEADER } from '@/lib/constants';
import { PositionModal } from '@/components/Portfolio/PositionModal';
import { deletePosition } from '@/lib/actions/portfolio.actions';
import { toast } from 'sonner';
import { Trash2, DollarSign } from 'lucide-react';

export const PortfolioTable = ({ positions }: PortfolioTableProps) => {
  const [sellTarget, setSellTarget] = useState<{ symbol: string; company: string; quantity: number } | null>(null);
  const [sellModalOpen, setSellModalOpen] = useState(false);
  const [deletingSymbol, setDeletingSymbol] = useState<string | null>(null);
  const router = useRouter();

  if (!positions || positions.length === 0) {
    return null;
  }

  const totals = positions.reduce(
    (acc, p) => {
      acc.costBasis += p.costBasis;
      acc.marketValue += p.marketValue ?? p.costBasis;
      return acc;
    },
    { costBasis: 0, marketValue: 0 }
  );
  const totalGainLoss = totals.marketValue - totals.costBasis;
  const totalGainLossPercent = totals.costBasis > 0 ? (totalGainLoss / totals.costBasis) * 100 : 0;

  const handleSellClick = (position: PositionWithData) => {
    setSellTarget({ symbol: position.symbol, company: position.company, quantity: position.quantity });
    setSellModalOpen(true);
  };

  const handleDelete = async (symbol: string) => {
    setDeletingSymbol(symbol);
    try {
      const res = await deletePosition({ symbol });
      if (res.success) {
        toast.success(`Removed ${symbol} from your portfolio`);
        router.refresh();
      } else {
        toast.error(res.error || 'Failed to remove position');
      }
    } catch (error) {
      toast.error('Something went wrong');
      console.log('Delete position error:', error);
    } finally {
      setDeletingSymbol(null);
    }
  };

  return (
    <>
      <div className="watchlist-table">
        <div className="portfolio-table-header-row">
          {PORTFOLIO_TABLE_HEADER.map((header) => (
            <div key={header} className="table-header">
              {header}
            </div>
          ))}
        </div>

        <div>
          {positions.map((position) => {
            const gainPositive = (position.gainLoss ?? 0) >= 0;

            return (
              <div key={position.id} className="portfolio-table-row">
                <div className="table-cell font-semibold">{position.symbol}</div>
                <div className="table-cell">{position.company}</div>
                <div className="table-cell">{position.quantity}</div>
                <div className="table-cell text-sm text-gray-400">{position.costBasisFormatted}</div>
                <div className="table-cell">{position.priceFormatted ?? 'N/A'}</div>
                <div className="table-cell">{position.marketValueFormatted ?? 'N/A'}</div>
                <div className={`table-cell ${position.gainLoss === undefined ? 'text-gray-400' : gainPositive ? 'text-green-400' : 'text-red-400'}`}>
                  {position.gainLossFormatted}
                  {position.gainLossPercentFormatted && (
                    <span className="block text-xs">{position.gainLossPercentFormatted}</span>
                  )}
                </div>
                <div className="table-cell flex gap-2">
                  <button onClick={() => handleSellClick(position)} className="portfolio-action-btn" title="Sell shares">
                    <DollarSign size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(position.symbol)}
                    disabled={deletingSymbol === position.symbol}
                    className="portfolio-action-btn portfolio-action-delete"
                    title="Remove position"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="portfolio-summary-row">
          <span>Total</span>
          <span>{positions.length} position{positions.length === 1 ? '' : 's'}</span>
          <span className={totalGainLoss >= 0 ? 'text-green-400' : 'text-red-400'}>
            {totalGainLoss >= 0 ? '+' : ''}${totalGainLoss.toFixed(2)} ({totalGainLossPercent >= 0 ? '+' : ''}{totalGainLossPercent.toFixed(2)}%)
          </span>
        </div>
      </div>

      {sellTarget && (
        <PositionModal open={sellModalOpen} setOpen={setSellModalOpen} action="sell" position={sellTarget} />
      )}
    </>
  );
};
