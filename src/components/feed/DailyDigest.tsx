"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Paper, NewsArticle, PaperSummary, NewsSummary } from "@/types";
import { CategoryBadge } from "@/components/ui/CategoryBadge";

interface DailyDigestProps {
  papers: Paper[];
  news: NewsArticle[];
}

function DigestSection({
  title,
  icon,
  items,
  type,
  linkHref,
}: {
  title: string;
  icon: string;
  items: (Paper | NewsArticle)[];
  type: "paper" | "news";
  linkHref: string;
}) {
  const [summaries, setSummaries] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const generateSummary = useCallback(async (item: Paper | NewsArticle) => {
    const isPaperItem = "abstract" in item;
    const existingSummary = isPaperItem
      ? (item as Paper).summaryJson?.objective
      : ((item as NewsArticle).summaryJson?.summary || (item as NewsArticle).summaryText);

    if (existingSummary) return;
    if (loading[item.id]) return;

    setLoading((prev) => ({ ...prev, [item.id]: true }));
    try {
      const res = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: isPaperItem ? "paper" : "news",
          id: item.id,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        let text: string | undefined;
        if (isPaperItem) {
          const s = data.summary as PaperSummary;
          text = [s?.objective, s?.novelty].filter(Boolean).join(" ");
        } else {
          const ns = data.summary as NewsSummary;
          text = ns ? [ns.summary, ns.novelty].filter(Boolean).join(" ") : undefined;
        }
        if (text) {
          setSummaries((prev) => ({ ...prev, [item.id]: text }));
        }
      }
    } catch {
      // silently fail — will show fallback text
    } finally {
      setLoading((prev) => ({ ...prev, [item.id]: false }));
    }
  }, [loading]);

  useEffect(() => {
    for (const item of items) {
      const isPaperItem = "abstract" in item;
      const existingSummary = isPaperItem
        ? (item as Paper).summaryJson?.objective
        : ((item as NewsArticle).summaryJson?.summary || (item as NewsArticle).summaryText);
      if (!existingSummary && !summaries[item.id] && !loading[item.id]) {
        generateSummary(item);
      }
    }
    // Run only when items change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  if (items.length === 0) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
          <span>{icon}</span>
          {title}
        </h3>
        <Link href={linkHref} className="text-xs text-blue-600 hover:underline">
          もっと見る →
        </Link>
      </div>
      <div className="space-y-2.5">
        {items.map((item, i) => {
          const href = `/${type === "paper" ? "papers" : "news"}/${item.id}`;
          const isPaperItem = "abstract" in item;
          const paper = isPaperItem ? (item as Paper) : null;
          const article = !isPaperItem ? (item as NewsArticle) : null;
          const paperSummary = paper?.summaryJson;
          const newsSummary = article?.summaryJson;
          const summary = paperSummary
            ? [paperSummary.objective, paperSummary.novelty].filter(Boolean).join(" ")
            : newsSummary
              ? [newsSummary.summary, newsSummary.novelty].filter(Boolean).join(" ")
              : (article?.summaryText ?? summaries[item.id] ?? "");

          return (
            <Link key={item.id} href={href} className="block group">
              <div className="flex gap-2.5 items-start">
                <div className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 line-clamp-2 group-hover:text-blue-700 leading-snug">
                    {item.title}
                  </p>
                  {summary ? (
                    <p className="text-xs text-gray-600 mt-1 line-clamp-2 leading-relaxed">
                      {summary}
                    </p>
                  ) : loading[item.id] ? (
                    <p className="text-xs text-gray-400 mt-1 italic animate-pulse">
                      要約を生成中...
                    </p>
                  ) : (
                    <p className="text-xs text-gray-400 mt-1 italic">
                      要約なし
                    </p>
                  )}
                  <div className="mt-1.5">
                    <CategoryBadge category={item.category} size="sm" />
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function DailyDigest({ papers, news }: DailyDigestProps) {
  const today = new Date().toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const isEmpty = papers.length === 0 && news.length === 0;

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-5 mb-4">
      <div className="mb-4">
        <p className="text-xs text-blue-600 font-medium">{today}</p>
        <h2 className="text-base font-bold text-gray-900">今日のダイジェスト</h2>
      </div>

      {isEmpty ? (
        <p className="text-sm text-gray-500">
          まだ記事がありません。
          <Link href="/settings" className="text-blue-600 hover:underline ml-1">
            Settings から収集してください
          </Link>
        </p>
      ) : (
        <div className="space-y-5">
          <DigestSection
            title="注目論文"
            icon="📄"
            items={papers}
            type="paper"
            linkHref="/papers"
          />
          {papers.length > 0 && news.length > 0 && (
            <div className="border-t border-blue-200/60" />
          )}
          <DigestSection
            title="最新ニュース"
            icon="📰"
            items={news}
            type="news"
            linkHref="/news"
          />
        </div>
      )}
    </div>
  );
}
