"use client";

import { Paper } from "@/types";
import { CategoryBadge } from "@/components/ui/CategoryBadge";
import { ScoreBar } from "@/components/ui/ScoreBar";

interface PaperDetailProps {
  paper: Paper;
  onBookmark?: (id: string, bookmarked: boolean) => void;
}

const SUMMARY_ITEMS = [
  { key: "objective" as const, label: "研究目的", icon: "🎯" },
  { key: "novelty" as const, label: "新規性", icon: "💡" },
  { key: "method" as const, label: "提案手法", icon: "⚙️" },
  { key: "results" as const, label: "主要結果", icon: "📊" },
  { key: "limitations" as const, label: "制限事項", icon: "⚠️" },
  { key: "metrics" as const, label: "評価指標", icon: "📏" },
];

export function PaperDetail({ paper, onBookmark }: PaperDetailProps) {
  const dateStr = new Date(paper.publishedAt).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <article className="max-w-3xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-3 mb-3">
          <CategoryBadge category={paper.category} size="md" />
          <button
            onClick={() => onBookmark?.(paper.id, !paper.bookmarked)}
            className={`p-2 rounded-lg transition-colors ${
              paper.bookmarked
                ? "text-amber-500 bg-amber-50"
                : "text-gray-400 hover:bg-gray-100"
            }`}
          >
            <svg className="w-5 h-5" fill={paper.bookmarked ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </button>
        </div>

        <h1 className="text-xl font-bold text-gray-900 leading-tight mb-3">
          {paper.title}
        </h1>

        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
          <span>{dateStr}</span>
          <span>·</span>
          <span>arXiv:{paper.id}</span>
        </div>

        {paper.authors.length > 0 && (
          <p className="mt-2 text-xs text-gray-500">
            {paper.authors.slice(0, 5).join(", ")}
            {paper.authors.length > 5 && ` ほか${paper.authors.length - 5}名`}
          </p>
        )}

        <div className="mt-3">
          <ScoreBar score={paper.score} showValue />
        </div>
      </div>

      {/* AI Summary Cards */}
      {paper.summaryJson && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <span className="w-5 h-5 bg-blue-600 rounded text-white text-xs flex items-center justify-center">AI</span>
            AI生成サマリー
          </h2>
          <div className="grid gap-3">
            {SUMMARY_ITEMS.map(({ key, label, icon }) => {
              const value = paper.summaryJson?.[key];
              if (!value) return null;
              return (
                <div
                  key={key}
                  className="bg-gray-50 rounded-xl p-4 border border-gray-100"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-base">{icon}</span>
                    <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      {label}
                    </h3>
                  </div>
                  <p className="text-sm text-gray-800 leading-relaxed">{value}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Abstract */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-2">Abstract</h2>
        <p className="text-sm text-gray-600 leading-relaxed">{paper.abstract}</p>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <a
          href={paper.pdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white text-sm font-semibold py-3 rounded-xl hover:bg-blue-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          PDF を開く
        </a>
        <a
          href={`https://arxiv.org/abs/${paper.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 border border-gray-200 text-gray-700 text-sm font-medium py-3 px-4 rounded-xl hover:bg-gray-50 transition-colors"
        >
          arXiv
        </a>
      </div>
    </article>
  );
}
