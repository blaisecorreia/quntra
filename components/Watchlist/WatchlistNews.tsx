'use client';

import Link from 'next/link';

const formatTimeAgo = (timestamp: number): string => {
  const seconds = Math.floor((Date.now() - timestamp * 1000) / 1000);
  if (seconds < 60) return 'now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
};

export const WatchlistNews = ({ news }: WatchlistNewsProps) => {
  if (!news || news.length === 0) {
    return (
      <div>
        <h3 className="watchlist-title mb-4">Market News</h3>
        <div className="text-gray-500 text-center py-8">No news available</div>
      </div>
    );
  }

  return (
    <div>
      <h3 className="watchlist-title mb-4">Market News</h3>
      <div className="watchlist-news">
        {news.map((article) => (
          <Link key={article.id} href={article.url} target="_blank" rel="noopener noreferrer">
            <article className="news-item h-full flex flex-col">
              <span className="news-tag">{article.category}</span>
              <h4 className="news-title">{article.headline}</h4>
              <p className="news-summary">{article.summary}</p>
              <div className="news-meta">
                <span>{article.source}</span>
                <span className="mx-1.5">•</span>
                <span>{formatTimeAgo(article.datetime)}</span>
              </div>
              <span className="news-cta">Read more →</span>
            </article>
          </Link>
        ))}
      </div>
    </div>
  );
};
