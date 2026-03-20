"use client";

import { useState } from "react";
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

function isPaper(item: Paper | NewsArticle): item is Paper {
  return "abstract" in item;
}

interface TopArticleCardProps {
  item: Paper | NewsArticle;
  type: "paper" | "news";
  onRate?: (id: string, value: number) => void;
  onBookmark?: (id: string, bookmarked: boolean) => void;
  onMemo?: (id: string, memo: string) => void;
}

export function TopArticleCard({ item, type, onRate, onBookmark, onMemo }: TopArticleCardProps) {
  const href = `/${type === "paper" ? "papers" : "news"}/${item.id}`;
  const paper = isPaper(item) ? item : null;
  const news = !isPaper(item) ? item : null;

  const paperSummary = paper?.summaryJson;
  const newsSummary = news?.summaryJson;

  const dateStr = new Date(item.publishedAt).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const handleRate = (e: React.MouseEvent, value: number) => {
    e.preventDefault();
    e.stopPropagation();
    onRate?.(item.id, value);
  };

  const handleBookmark = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onBookmark?.(item.id, !item.bookmarked);
  };

  const [memoOpen, setMemoOpen] = useState(false);
  const [memoText, setMemoText] = useState(item.memo || "");

  const handleMemoToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setMemoOpen((prev) => !prev);
    if (!memoOpen) setMemoText(item.memo || "");
  };

  const handleMemoSave = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onMemo?.(item.id, memoText);
    setMemoOpen(false);
  };

  const handleMemoCancel = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setMemoOpen(false);
    setMemoText(item.memo || "");
  };

  return (
    <Link href={href} className="block group">
      <article className="bg-white rounded-xl border border-gray-100 p-4 hover:border-blue-200 hover:shadow-md transition-all">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center text-lg flex-shrink-0 border border-gray-100">
            {CATEGORY_ICONS[item.category]}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-gray-900 leading-snug group-hover:text-blue-700 transition-colors">
              {item.title}
            </h3>
            <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
              {news && <span>{news.source}</span>}
              {paper && <span>arXiv</span>}
              <span>·</span>
              <span>{dateStr}</span>
              {item.isFallback && (
                <>
                  <span>·</span>
                  <span className="text-amber-500 font-medium">注目論文</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Reliability */}
        {item.reliability > 0 && (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500">信頼度:</span>
            <span className={`text-xs font-bold ${
              item.reliability >= 0.8 ? "text-green-600" :
              item.reliability >= 0.5 ? "text-yellow-600" :
              "text-red-500"
            }`}>
              {item.reliability.toFixed(2)}
            </span>
            {item.reliabilityReason && (
              <span className="text-xs text-gray-400">({item.reliabilityReason})</span>
            )}
          </div>
        )}

        {/* Recommendation reason */}
        {item.recommendationReason && (
          <div className="mt-3 px-3 py-2 bg-blue-50 rounded-lg border border-blue-100">
            <p className="text-xs text-blue-700 font-medium flex items-start gap-1.5">
              <span className="flex-shrink-0 mt-0.5">💡</span>
              <span>{item.recommendationReason}</span>
            </p>
          </div>
        )}

        {/* Full summary */}
        <div className="mt-3 space-y-2">
          {paperSummary && (
            <>
              <SummaryField label="目的" text={paperSummary.objective} />
              <SummaryField label="新規性" text={paperSummary.novelty} />
              <SummaryField label="手法" text={paperSummary.method} />
              <SummaryField label="結果" text={paperSummary.results} />
              {paperSummary.metrics && (
                <div className="text-xs text-gray-500">
                  <span className="font-medium text-gray-600">評価指標: </span>
                  {paperSummary.metrics}
                </div>
              )}
            </>
          )}
          {newsSummary && (
            <>
              <SummaryField label="概要" text={newsSummary.summary} />
              <SummaryField label="新規性" text={newsSummary.novelty} />
              <SummaryField label="応用" text={newsSummary.application} />
            </>
          )}
          {!paperSummary && !newsSummary && news?.summaryText && (
            <p className="text-xs text-gray-600 leading-relaxed">{news.summaryText}</p>
          )}
        </div>

        {/* Memo */}
        {item.memo && !memoOpen && (
          <div
            className="mt-2 px-3 py-1.5 bg-yellow-50 rounded-lg border border-yellow-100 cursor-pointer"
            onClick={handleMemoToggle}
          >
            <p className="text-xs text-yellow-800 flex items-start gap-1.5">
              <span className="flex-shrink-0">📝</span>
              <span>{item.memo}</span>
            </p>
          </div>
        )}
        {memoOpen && (
          <div className="mt-2" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
            <textarea
              className="w-full text-xs border border-gray-200 rounded-lg p-2 resize-none focus:outline-none focus:border-blue-300"
              rows={2}
              placeholder="メモを入力..."
              value={memoText}
              onChange={(e) => setMemoText(e.target.value)}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onKeyDown={(e) => e.stopPropagation()}
            />
            <div className="flex gap-1 mt-1 justify-end">
              <button
                onClick={handleMemoCancel}
                className="text-xs px-2 py-0.5 text-gray-500 hover:text-gray-700 rounded"
              >
                キャンセル
              </button>
              <button
                onClick={handleMemoSave}
                className="text-xs px-2 py-0.5 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                保存
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-3 flex items-center gap-2">
          <CategoryBadge category={item.category} />
          <div className="flex-1">
            <ScoreBar score={item.score} />
          </div>
          <button
            onClick={handleMemoToggle}
            className={`p-1 rounded transition-colors ${
              item.memo
                ? "text-yellow-500"
                : "text-gray-300 hover:text-yellow-400"
            }`}
            aria-label="メモ"
          >
            <svg className="w-4 h-4" fill={item.memo ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={handleBookmark}
            className={`p-1 rounded transition-colors ${
              item.bookmarked
                ? "text-amber-500"
                : "text-gray-300 hover:text-amber-400"
            }`}
            aria-label="ブックマーク"
          >
            <svg className="w-4 h-4" fill={item.bookmarked ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </button>
          <div className="flex items-center gap-0.5">
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
          </div>
          <span className="text-xs text-gray-500 font-medium">
            {type === "paper" ? "論文" : "ニュース"}
          </span>
        </div>
      </article>
    </Link>
  );
}

function SummaryField({ label, text }: { label: string; text: string }) {
  if (!text) return null;
  return (
    <div className="text-xs leading-relaxed">
      <span className="font-semibold text-gray-700">{label}: </span>
      <span className="text-gray-600">{text}</span>
    </div>
  );
}
