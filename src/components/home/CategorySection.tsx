"use client";

import Link from "next/link";
import { Paper, NewsArticle, Topic } from "@/types";
import { TopArticleCard } from "./TopArticleCard";

const TOPIC_CONFIG: Record<Topic, { label: string; icon: string; color: string }> = {
  satellite: { label: "衛星関連", icon: "🛰️", color: "from-indigo-50 to-blue-50" },
  vision: { label: "画像認識関連", icon: "👁️", color: "from-purple-50 to-pink-50" },
  productivity: { label: "業務改善関連", icon: "⚡", color: "from-amber-50 to-orange-50" },
};

interface CategorySectionProps {
  topic: Topic;
  papers: Paper[];
  news: NewsArticle[];
  onRatePaper: (id: string, value: number) => void;
  onRateNews: (id: string, value: number) => void;
  onBookmarkPaper: (id: string, bookmarked: boolean) => void;
  onBookmarkNews: (id: string, bookmarked: boolean) => void;
  onMemoPaper?: (id: string, memo: string) => void;
  onMemoNews?: (id: string, memo: string) => void;
}

export function CategorySection({
  topic,
  papers,
  news,
  onRatePaper,
  onRateNews,
  onBookmarkPaper,
  onBookmarkNews,
  onMemoPaper,
  onMemoNews,
}: CategorySectionProps) {
  const config = TOPIC_CONFIG[topic];
  const isEmpty = papers.length === 0 && news.length === 0;

  return (
    <section className={`rounded-2xl bg-gradient-to-br ${config.color} p-4`}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
          <span>{config.icon}</span>
          {config.label}
        </h2>
        <Link
          href={`/feed?topic=${topic}`}
          className="text-xs text-blue-600 hover:underline font-medium"
        >
          もっと見る →
        </Link>
      </div>

      {isEmpty ? (
        <p className="text-sm text-gray-500 py-4 text-center">
          記事がありません。データを収集してください。
        </p>
      ) : (
        <div className="space-y-4">
          {/* Papers */}
          {papers.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                📄 論文 ({papers.length})
              </h3>
              <div className="space-y-2">
                {papers.map((paper) => (
                  <TopArticleCard
                    key={paper.id}
                    item={paper}
                    type="paper"
                    onRate={onRatePaper}
                    onBookmark={onBookmarkPaper}
                    onMemo={onMemoPaper}
                  />
                ))}
              </div>
            </div>
          )}

          {/* News */}
          {news.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                📰 ニュース ({news.length})
              </h3>
              <div className="space-y-2">
                {news.map((article) => (
                  <TopArticleCard
                    key={article.id}
                    item={article}
                    type="news"
                    onRate={onRateNews}
                    onBookmark={onBookmarkNews}
                    onMemo={onMemoNews}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
