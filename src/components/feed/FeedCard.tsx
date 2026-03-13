"use client";

import Link from "next/link";
import { Paper, NewsArticle, Category } from "@/types";
import { CategoryBadge } from "@/components/ui/CategoryBadge";
import { ScoreBar } from "@/components/ui/ScoreBar";

const CATEGORY_ICONS: Record<Category, string> = {
  ObjectDetection: "🎯",
  Segmentation: "🗺",
  ChangeDetection: "🔄",
  SuperResolution: "🔬",
  FoundationModel: "🤖",
  Other: "📡",
};

interface FeedCardProps {
  item: Paper | NewsArticle;
  type: "paper" | "news";
  onBookmark?: (id: string, bookmarked: boolean) => void;
  onRate?: (id: string, value: number) => void;
}

function isPaper(item: Paper | NewsArticle): item is Paper {
  return "abstract" in item;
}

export function FeedCard({ item, type, onBookmark, onRate }: FeedCardProps) {
  const href = `/${type === "paper" ? "papers" : "news"}/${item.id}`;
  const paper = isPaper(item) ? item : null;
  const news = !isPaper(item) ? item : null;

  const paperSummary = paper?.summaryJson;
  const newsSummary = news?.summaryJson;
  const summary = paperSummary
    ? [paperSummary.objective, paperSummary.novelty].filter(Boolean).join(" ")
    : newsSummary
      ? [newsSummary.summary, newsSummary.novelty].filter(Boolean).join(" ")
      : (news?.summaryText || "");
  const truncatedSummary = summary.length > 120 ? summary.slice(0, 120) + "…" : summary;
  const truncatedTitle = item.title.length > 60 ? item.title.slice(0, 60) + "…" : item.title;

  const dateStr = new Date(item.publishedAt).toLocaleDateString("ja-JP", {
    month: "short",
    day: "numeric",
  });

  const handleBookmark = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onBookmark?.(item.id, !item.bookmarked);
  };

  const handleRate = (e: React.MouseEvent, value: number) => {
    e.preventDefault();
    e.stopPropagation();
    // Toggle: if already rated with same value, could re-send (API handles upsert)
    onRate?.(item.id, value);
  };

  return (
    <Link href={href} className="block group">
      <article className="bg-white rounded-xl border border-gray-100 p-4 hover:border-blue-200 hover:shadow-sm transition-all">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="w-11 h-11 bg-gray-50 rounded-lg flex items-center justify-center text-xl flex-shrink-0 border border-gray-100">
            {CATEGORY_ICONS[item.category]}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2 group-hover:text-blue-700 transition-colors">
                {truncatedTitle}
              </h3>
              <div className="flex items-center gap-0.5 flex-shrink-0">
                <button
                  onClick={(e) => handleRate(e, 1)}
                  className={`p-1 rounded transition-colors ${
                    item.rating === 1
                      ? "text-green-500"
                      : "text-gray-300 hover:text-green-400"
                  }`}
                  aria-label="高評価"
                >
                  <svg className="w-4 h-4" fill={item.rating === 1 ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z M4 21H2V10h2v11z" />
                  </svg>
                </button>
                <button
                  onClick={(e) => handleRate(e, -1)}
                  className={`p-1 rounded transition-colors ${
                    item.rating === -1
                      ? "text-red-500"
                      : "text-gray-300 hover:text-red-400"
                  }`}
                  aria-label="低評価"
                >
                  <svg className="w-4 h-4" fill={item.rating === -1 ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 15v4a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3H10z M20 2h2v11h-2V2z" />
                  </svg>
                </button>
                <button
                  onClick={handleBookmark}
                  className={`p-1 rounded transition-colors ${
                    item.bookmarked
                      ? "text-amber-500"
                      : "text-gray-300 hover:text-amber-400"
                  }`}
                  aria-label={item.bookmarked ? "ブックマーク解除" : "ブックマーク"}
                >
                  <svg className="w-4 h-4" fill={item.bookmarked ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
              {news && <span>{news.source}</span>}
              {paper && <span>arXiv</span>}
              <span>·</span>
              <span>{dateStr}</span>
            </div>

            {truncatedSummary && (
              <p className="mt-1.5 text-xs text-gray-600 line-clamp-2">
                {truncatedSummary}
              </p>
            )}
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <CategoryBadge category={item.category} />
          <div className="flex-1">
            <ScoreBar score={item.score} />
          </div>
          {type === "paper" && (
            <span className="text-xs text-blue-600 font-medium">論文</span>
          )}
        </div>
      </article>
    </Link>
  );
}
