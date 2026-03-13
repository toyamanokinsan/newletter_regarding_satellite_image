"use client";

import { NewsArticle } from "@/types";
import { CategoryBadge } from "@/components/ui/CategoryBadge";
import { ScoreBar } from "@/components/ui/ScoreBar";
import { TimeSlider } from "@/components/ui/TimeSlider";

interface NewsDetailProps {
  article: NewsArticle;
  onBookmark?: (id: string, bookmarked: boolean) => void;
}

export function NewsDetail({ article, onBookmark }: NewsDetailProps) {
  const dateStr = new Date(article.publishedAt).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <article className="max-w-3xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-3 mb-3">
          <CategoryBadge category={article.category} size="md" />
          <button
            onClick={() => onBookmark?.(article.id, !article.bookmarked)}
            className={`p-2 rounded-lg transition-colors ${
              article.bookmarked
                ? "text-amber-500 bg-amber-50"
                : "text-gray-400 hover:bg-gray-100"
            }`}
          >
            <svg className="w-5 h-5" fill={article.bookmarked ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </button>
        </div>

        <h1 className="text-xl font-bold text-gray-900 leading-tight mb-3">
          {article.title}
        </h1>

        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
          <span className="font-medium text-gray-700">{article.source}</span>
          <span>·</span>
          <span>{dateStr}</span>
        </div>

        <div className="mt-3">
          <ScoreBar score={article.score} showValue />
        </div>
      </div>

      {/* AI Summary */}
      {article.summaryJson ? (
        <div className="mb-6 space-y-3">
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-5 h-5 bg-blue-600 rounded text-white text-xs flex items-center justify-center">AI</span>
              <span className="text-xs font-semibold text-blue-700">概要</span>
            </div>
            <p className="text-sm text-gray-800 leading-relaxed">{article.summaryJson.summary}</p>
          </div>
          <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm">💡</span>
              <span className="text-xs font-semibold text-amber-700">新規性</span>
            </div>
            <p className="text-sm text-gray-800 leading-relaxed">{article.summaryJson.novelty}</p>
          </div>
          <div className="bg-green-50 rounded-xl p-4 border border-green-100">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm">🔧</span>
              <span className="text-xs font-semibold text-green-700">応用</span>
            </div>
            <p className="text-sm text-gray-800 leading-relaxed">{article.summaryJson.application}</p>
          </div>
        </div>
      ) : article.summaryText ? (
        <div className="mb-6 bg-blue-50 rounded-xl p-4 border border-blue-100">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-5 h-5 bg-blue-600 rounded text-white text-xs flex items-center justify-center">AI</span>
            <span className="text-xs font-semibold text-blue-700">AI要約</span>
          </div>
          <p className="text-sm text-gray-800 leading-relaxed">{article.summaryText}</p>
        </div>
      ) : null}

      {/* Change detection slider (if applicable) */}
      {article.category === "ChangeDetection" && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">衛星画像比較</h2>
          <TimeSlider
            beforeLabel="変化前"
            afterLabel="変化後"
          />
        </div>
      )}

      {/* Content */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-2">記事内容</h2>
        <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
          {article.content}
        </p>
      </div>

      {/* Actions */}
      <a
        href={article.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 bg-blue-600 text-white text-sm font-semibold py-3 rounded-xl hover:bg-blue-700 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
        元記事を開く
      </a>
    </article>
  );
}
