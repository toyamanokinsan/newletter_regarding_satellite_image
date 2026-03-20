"use client";

import { useState } from "react";
import { Paper } from "@/types";
import { CategoryBadge } from "@/components/ui/CategoryBadge";
import { ScoreBar } from "@/components/ui/ScoreBar";

interface PaperDetailProps {
  paper: Paper;
  onBookmark?: (id: string, bookmarked: boolean) => void;
  onMemo?: (id: string, memo: string) => void;
}

const SUMMARY_ITEMS = [
  { key: "objective" as const, label: "研究目的", icon: "🎯" },
  { key: "novelty" as const, label: "新規性", icon: "💡" },
  { key: "method" as const, label: "提案手法", icon: "⚙️" },
  { key: "results" as const, label: "主要結果", icon: "📊" },
  { key: "limitations" as const, label: "制限事項", icon: "⚠️" },
  { key: "metrics" as const, label: "評価指標", icon: "📏" },
];

export function PaperDetail({ paper, onBookmark, onMemo }: PaperDetailProps) {
  const [memoEditing, setMemoEditing] = useState(false);
  const [memoText, setMemoText] = useState(paper.memo || "");

  const handleMemoSave = () => {
    onMemo?.(paper.id, memoText);
    setMemoEditing(false);
  };

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

        <div className="mt-3 flex items-center gap-4">
          <ScoreBar score={paper.score} showValue />
          {paper.reliability > 0 && (
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className="text-xs font-semibold text-gray-500">信頼度:</span>
              <span className={`text-sm font-bold ${
                paper.reliability >= 0.8 ? "text-green-600" :
                paper.reliability >= 0.5 ? "text-yellow-600" :
                "text-red-500"
              }`}>
                {paper.reliability.toFixed(2)}
              </span>
            </div>
          )}
        </div>
        {paper.reliabilityReason && (
          <p className="mt-1 text-xs text-gray-400">{paper.reliabilityReason}</p>
        )}
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

      {/* Memo */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
          <span>📝</span> メモ
        </h2>
        {memoEditing ? (
          <div>
            <textarea
              className="w-full text-sm border border-gray-200 rounded-xl p-3 resize-none focus:outline-none focus:border-blue-300"
              rows={3}
              placeholder="メモを入力..."
              value={memoText}
              onChange={(e) => setMemoText(e.target.value)}
            />
            <div className="flex gap-2 mt-2 justify-end">
              <button
                onClick={() => { setMemoEditing(false); setMemoText(paper.memo || ""); }}
                className="text-sm px-3 py-1 text-gray-500 hover:text-gray-700 rounded"
              >
                キャンセル
              </button>
              <button
                onClick={handleMemoSave}
                className="text-sm px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                保存
              </button>
            </div>
          </div>
        ) : paper.memo ? (
          <div
            className="bg-yellow-50 rounded-xl p-3 border border-yellow-100 cursor-pointer hover:border-yellow-200 transition-colors"
            onClick={() => setMemoEditing(true)}
          >
            <p className="text-sm text-yellow-800 whitespace-pre-wrap">{paper.memo}</p>
            <p className="text-xs text-yellow-500 mt-1">クリックして編集</p>
          </div>
        ) : (
          <button
            onClick={() => setMemoEditing(true)}
            className="text-sm text-gray-400 hover:text-gray-600 border border-dashed border-gray-200 rounded-xl px-4 py-3 w-full hover:border-gray-300 transition-colors"
          >
            + メモを追加
          </button>
        )}
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
