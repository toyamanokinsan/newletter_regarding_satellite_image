"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Paper, NewsArticle, Category, Topic } from "@/types";
import { PaperCard } from "@/components/feed/PaperCard";
import { NewsCard } from "@/components/feed/NewsCard";
import { SkeletonCard } from "@/components/ui/SkeletonCard";

type TabType = "all" | "papers" | "news";

const CATEGORIES: { value: Category | "all"; label: string }[] = [
  { value: "all", label: "すべて" },
  { value: "ObjectDetection", label: "物体検出" },
  { value: "Segmentation", label: "セグメンテーション" },
  { value: "ChangeDetection", label: "変化抽出" },
  { value: "SuperResolution", label: "超解像" },
  { value: "FoundationModel", label: "基盤モデル" },
];

const TOPIC_FILTERS: { value: Topic | "all"; label: string }[] = [
  { value: "all", label: "すべて" },
  { value: "satellite", label: "衛星関連" },
  { value: "vision", label: "画像認識" },
  { value: "productivity", label: "業務改善" },
];

export default function FeedPage() {
  return (
    <Suspense fallback={<div className="px-4 py-4"><SkeletonCard /></div>}>
      <FeedContent />
    </Suspense>
  );
}

function FeedContent() {
  const searchParams = useSearchParams();
  const initialTopic = (searchParams.get("topic") as Topic | null) || "all";

  const [tab, setTab] = useState<TabType>("all");
  const [category, setCategory] = useState<Category | "all">("all");
  const [topic, setTopic] = useState<Topic | "all">(initialTopic);
  const [papers, setPapers] = useState<Paper[]>([]);
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [collecting, setCollecting] = useState(false);

  const fetchData = useCallback(
    async (reset = false) => {
      setLoading(true);
      const currentPage = reset ? 1 : page;

      const categoryParam =
        category !== "all" ? `&category=${category}` : "";
      const topicParam =
        topic !== "all" ? `&topic=${topic}` : "";

      try {
        if (tab === "all" || tab === "papers") {
          const res = await fetch(
            `/api/papers?page=${currentPage}&pageSize=10${categoryParam}${topicParam}`
          );
          const data = await res.json();
          if (reset) {
            setPapers(data.papers || []);
          } else {
            setPapers((prev) => [...prev, ...(data.papers || [])]);
          }
          if (tab === "papers") {
            setHasMore(currentPage < data.totalPages);
          }
        }

        if (tab === "all" || tab === "news") {
          const res = await fetch(
            `/api/news?page=${currentPage}&pageSize=10${categoryParam}${topicParam}`
          );
          const data = await res.json();
          if (reset) {
            setNews(data.articles || []);
          } else {
            setNews((prev) => [...prev, ...(data.articles || [])]);
          }
          if (tab === "news") {
            setHasMore(currentPage < data.totalPages);
          }
        }
      } catch (err) {
        console.error("Failed to fetch data:", err);
      } finally {
        setLoading(false);
      }
    },
    [tab, category, topic, page]
  );

  useEffect(() => {
    setPage(1);
    setHasMore(true);
    fetchData(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, category, topic]);

  const handleBookmarkPaper = async (id: string, bookmarked: boolean) => {
    await fetch("/api/papers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, bookmarked }),
    });
    setPapers((prev) =>
      prev.map((p) => (p.id === id ? { ...p, bookmarked } : p))
    );
  };

  const handleBookmarkNews = async (id: string, bookmarked: boolean) => {
    await fetch("/api/news", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, bookmarked }),
    });
    setNews((prev) =>
      prev.map((a) => (a.id === id ? { ...a, bookmarked } : a))
    );
  };

  const handleRatePaper = async (id: string, value: number) => {
    await fetch("/api/ratings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId: id, itemType: "paper", value }),
    });
    setPapers((prev) =>
      prev.map((p) => (p.id === id ? { ...p, rating: value } : p))
    );
  };

  const handleRateNews = async (id: string, value: number) => {
    await fetch("/api/ratings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId: id, itemType: "news", value }),
    });
    setNews((prev) =>
      prev.map((a) => (a.id === id ? { ...a, rating: value } : a))
    );
  };

  const handleCollect = async () => {
    setCollecting(true);
    try {
      await fetch("/api/collect", { method: "POST" });
      setPage(1);
      setHasMore(true);
      await fetchData(true);
    } catch (err) {
      console.error("Failed to collect:", err);
    } finally {
      setCollecting(false);
    }
  };

  // Merge and sort papers+news by score for "all" tab
  const allItems = [...papers, ...news].sort((a, b) => b.score - a.score);

  return (
    <div className="px-4 py-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-lg font-bold text-gray-900">記事一覧</h1>
        <button
          onClick={handleCollect}
          disabled={collecting}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50 transition-all"
        >
          {collecting ? (
            <>
              <span className="animate-spin w-3.5 h-3.5 border-2 border-gray-400 border-t-transparent rounded-full" />
              収集中...
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              最新データを取得
            </>
          )}
        </button>
      </div>

      {/* Topic filter */}
      <div className="flex gap-2 mb-3 overflow-x-auto pb-1 no-scrollbar">
        {TOPIC_FILTERS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setTopic(value)}
            className={`flex-shrink-0 px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${
              topic === value
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab selector */}
      <div className="flex gap-1 mb-3 bg-gray-100 rounded-xl p-1">
        {(["all", "papers", "news"] as TabType[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
              tab === t
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t === "all" ? "すべて" : t === "papers" ? "論文" : "ニュース"}
          </button>
        ))}
      </div>

      {/* Category filter */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1 no-scrollbar">
        {CATEGORIES.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setCategory(value)}
            className={`flex-shrink-0 px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${
              category === value
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Feed */}
      <div className="space-y-3">
        {loading && page === 1 ? (
          Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
        ) : tab === "all" ? (
          allItems.length === 0 ? (
            <EmptyState onCollect={handleCollect} collecting={collecting} />
          ) : (
            allItems.map((item) =>
              "abstract" in item ? (
                <PaperCard
                  key={`paper-${item.id}`}
                  paper={item as Paper}
                  onBookmark={handleBookmarkPaper}
                  onRate={handleRatePaper}
                />
              ) : (
                <NewsCard
                  key={`news-${item.id}`}
                  article={item as NewsArticle}
                  onBookmark={handleBookmarkNews}
                  onRate={handleRateNews}
                />
              )
            )
          )
        ) : tab === "papers" ? (
          papers.length === 0 ? (
            <EmptyState onCollect={handleCollect} collecting={collecting} />
          ) : (
            papers.map((p) => (
              <PaperCard
                key={p.id}
                paper={p}
                onBookmark={handleBookmarkPaper}
                onRate={handleRatePaper}
              />
            ))
          )
        ) : news.length === 0 ? (
          <EmptyState onCollect={handleCollect} collecting={collecting} />
        ) : (
          news.map((a) => (
            <NewsCard
              key={a.id}
              article={a}
              onBookmark={handleBookmarkNews}
              onRate={handleRateNews}
            />
          ))
        )}

        {/* Load more */}
        {hasMore && !loading && (
          <button
            onClick={() => {
              setPage((p) => p + 1);
              fetchData(false);
            }}
            className="w-full py-3 text-sm text-blue-600 font-medium hover:bg-blue-50 rounded-xl transition-colors"
          >
            さらに読み込む
          </button>
        )}
        {loading && page > 1 && <SkeletonCard />}
      </div>
    </div>
  );
}

function EmptyState({ onCollect, collecting }: { onCollect: () => void; collecting: boolean }) {
  return (
    <div className="text-center py-16">
      <div className="text-4xl mb-3">📡</div>
      <p className="text-gray-500 text-sm mb-2">記事がありません</p>
      <button
        onClick={onCollect}
        disabled={collecting}
        className="mt-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-all"
      >
        {collecting ? (
          <span className="flex items-center gap-2">
            <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
            収集中...
          </span>
        ) : (
          "今すぐデータを収集する"
        )}
      </button>
    </div>
  );
}
