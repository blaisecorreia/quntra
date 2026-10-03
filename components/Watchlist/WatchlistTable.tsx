'use client';

import { WATCHLIST_TABLE_HEADER } from '@/lib/constants';
import { WatchlistButton } from '@/components/Watchlist/WatchlistButton';
import { AlertModal } from '@/components/Alerts/AlertModal';
import { useState } from 'react';
import { daysUntil, formatEarningsDate } from '@/lib/utils';
import { Calendar } from 'lucide-react';

const EARNINGS_LOOKAHEAD_DAYS = 30;

export const WatchlistTable = ({ watchlist, earningsBySymbol = {} }: WatchlistTableProps) => {
  const [selectedAlertSymbol, setSelectedAlertSymbol] = useState<string | null>(null);
  const [selectedAlertCompany, setSelectedAlertCompany] = useState<string | null>(null);
  const [alertModalOpen, setAlertModalOpen] = useState(false);

  const handleAlertClick = (symbol: string, company: string) => {
    setSelectedAlertSymbol(symbol);
    setSelectedAlertCompany(company);
    setAlertModalOpen(true);
  };

  if (!watchlist || watchlist.length === 0) {
    return null;
  }

  return (
    <>
      <div className="watchlist-table">
        <div className="table-header-row">
          {WATCHLIST_TABLE_HEADER.map((header) => (
            <div key={header} className="table-header">
              {header}
            </div>
          ))}
        </div>

        <div>
          {watchlist.map((stock) => {
            const earnings = earningsBySymbol[stock.symbol];
            const daysAway = earnings ? daysUntil(earnings.date) : null;
            const showEarnings = earnings && daysAway !== null && daysAway >= 0 && daysAway <= EARNINGS_LOOKAHEAD_DAYS;

            return (
            <div key={stock.symbol} className="table-row">
              <div className="table-cell">
                <div>{stock.company}</div>
                {showEarnings && (
                  <div
                    className="earnings-badge"
                    title={`Next earnings: ${formatEarningsDate(earnings.date, earnings.hour)}`}
                  >
                    <Calendar size={11} />
                    {daysAway === 0 ? 'Today' : `${daysAway}d`}
                  </div>
                )}
              </div>
              <div className="table-cell font-semibold">{stock.symbol}</div>
              <div className="table-cell">{stock.priceFormatted}</div>
              <div
                className={`table-cell ${
                  stock.changePercent === undefined
                    ? 'text-gray-400'
                    : stock.changePercent >= 0
                    ? 'text-green-400'
                    : 'text-red-400'
                }`}
              >
                {stock.changeFormatted}
              </div>
              <div className="table-cell text-sm text-gray-400">{stock.marketCap}</div>
              <div className="table-cell text-sm text-gray-400">{stock.peRatio}</div>
              <div className="table-cell">
                <button
                  onClick={() => handleAlertClick(stock.symbol, stock.company)}
                  className="add-alert"
                >
                  Set Alert
                </button>
              </div>
              <div className="table-cell">
                <WatchlistButton
                  symbol={stock.symbol}
                  company={stock.company}
                  isInWatchlist={true}
                  showTrashIcon={true}
                  type="icon"
                />
              </div>
            </div>
            );
          })}
        </div>
      </div>

      {selectedAlertSymbol && selectedAlertCompany && (
        <AlertModal
          open={alertModalOpen}
          setOpen={setAlertModalOpen}
          alertData={{
            symbol: selectedAlertSymbol,
            company: selectedAlertCompany,
            alertName: '',
            alertType: 'upper',
            threshold: '',
          }}
          action="create"
        />
      )}
    </>
  );
};
