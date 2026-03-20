"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Paper, NewsArticle, Topic } from "@/types";
import { CategorySection } from "@/components/home/CategorySection";

const TOPICS: Topic[] = ["satellite", "vision", "productivity"];
const CACHE_KEY = "home_data";
const SCROLL_KEY = "home_scroll";

function loadCachedData(): {
  papers: Record<Topic, Paper[]>;
  news: Record<Topic, NewsArticle[]>;
} | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveCachedData(
  papers: Record<Topic, Paper[]>,
  news: Record<Topic, NewsArticle[]>
) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ papers, news }));
  } catch {
    // ignore quota errors
  }
}

export default function HomePage() {
  const cached = useRef(loadCachedData());
  const [papersByTopic, setPapersByTopic] = useState<Record<Topic, Paper[]>>(
    cached.current?.papers ?? { satellite: [], vision: [], productivity: [] }
  );
  const [newsByTopic, setNewsByTopic] = useState<Record<Topic, NewsArticle[]>>(
    cached.current?.news ?? { satellite: [], vision: [], productivity: [] }
  );
  const [loading, setLoading] = useState(!cached.current);
  const [collecting, setCollecting] = useState(false);
  const [reclassifying, setReclassifying] = useState(false);
  const [reclassifyResult, setReclassifyResult] = useState<string | null>(null);

  const fetchData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const results = await Promise.all(
        TOPICS.flatMap((topic) => [
          fetch(`/api/papers?topic=${topic}&pageSize=3&recent=true`).then((r) => r.json()),
          fetch(`/api/news?topic=${topic}&pageSize=3&recent=true&diverse=true`).then((r) => r.json()),
        ])
      );

      const newPapers: Record<Topic, Paper[]> = { satellite: [], vision: [], productivity: [] };
      const newNews: Record<Topic, NewsArticle[]> = { satellite: [], vision: [], productivity: [] };

      TOPICS.forEach((topic, i) => {
        newPapers[topic] = results[i * 2]?.papers || [];
        newNews[topic] = results[i * 2 + 1]?.articles || [];
      });

      setPapersByTopic(newPapers);
      setNewsByTopic(newNews);
      saveCachedData(newPapers, newNews);
    } catch (err) {
      console.error("Failed to fetch data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // If we have cached data, show it immediately and refresh in background
    if (cached.current) {
      fetchData(false);
    } else {
      fetchData(true);
    }
  }, [fetchData]);

  // Save scroll position before leaving, restore after mount
  useEffect(() => {
    const savedScroll = sessionStorage.getItem(SCROLL_KEY);
    if (savedScroll && cached.current) {
      // Restore after a tick so the DOM has rendered
      requestAnimationFrame(() => {
        window.scrollTo(0, parseInt(savedScroll, 10));
      });
    }

    const saveScroll = () => {
      sessionStorage.setItem(SCROLL_KEY, String(window.scrollY));
    };

    // Save on any navigation away
    window.addEventListener("beforeunload", saveScroll);
    // Also save periodically for SPA navigation
    const interval = setInterval(saveScroll, 500);

    return () => {
      saveScroll();
      window.removeEventListener("beforeunload", saveScroll);
      clearInterval(interval);
    };
  }, []);

  const handleCollect = async () => {
    setCollecting(true);
    try {
      await fetch("/api/collect", { method: "POST" });
      await fetchData();
    } catch (err) {
      console.error("Failed to collect:", err);
    } finally {
      setCollecting(false);
    }
  };

  const handleReclassify = async () => {
    setReclassifying(true);
    setReclassifyResult(null);
    try {
      const res = await fetch("/api/reclassify", { method: "POST" });
      const data = await res.json();
      setReclassifyResult(`${data.updated}件を再分類、${data.deleted}件を除外しました`);
      await fetchData();
    } catch (err) {
      console.error("Failed to reclassify:", err);
      setReclassifyResult("再分類に失敗しました");
    } finally {
      setReclassifying(false);
    }
  };

  const handleRatePaper = async (id: string, value: number) => {
    await fetch("/api/ratings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId: id, itemType: "paper", value }),
    });
    setPapersByTopic((prev) => {
      const next = { ...prev };
      for (const topic of TOPICS) {
        next[topic] = prev[topic].map((p) =>
          p.id === id ? { ...p, rating: value } : p
        );
      }
      return next;
    });
  };

  const handleRateNews = async (id: string, value: number) => {
    await fetch("/api/ratings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId: id, itemType: "news", value }),
    });
    setNewsByTopic((prev) => {
      const next = { ...prev };
      for (const topic of TOPICS) {
        next[topic] = prev[topic].map((a) =>
          a.id === id ? { ...a, rating: value } : a
        );
      }
      return next;
    });
  };

  const handleBookmarkPaper = async (id: string, bookmarked: boolean) => {
    await fetch("/api/papers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, bookmarked }),
    });
    setPapersByTopic((prev) => {
      const next = { ...prev };
      for (const topic of TOPICS) {
        next[topic] = prev[topic].map((p) =>
          p.id === id ? { ...p, bookmarked, bookmarkedAt: bookmarked ? new Date().toISOString() : undefined } : p
        );
      }
      return next;
    });
  };

  const handleBookmarkNews = async (id: string, bookmarked: boolean) => {
    await fetch("/api/news", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, bookmarked }),
    });
    setNewsByTopic((prev) => {
      const next = { ...prev };
      for (const topic of TOPICS) {
        next[topic] = prev[topic].map((a) =>
          a.id === id ? { ...a, bookmarked, bookmarkedAt: bookmarked ? new Date().toISOString() : undefined } : a
        );
      }
      return next;
    });
  };

  const handleMemoPaper = async (id: string, memo: string) => {
    await fetch("/api/papers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, memo }),
    });
    setPapersByTopic((prev) => {
      const next = { ...prev };
      for (const topic of TOPICS) {
        next[topic] = prev[topic].map((p) =>
          p.id === id ? { ...p, memo: memo || undefined } : p
        );
      }
      return next;
    });
  };

  const handleMemoNews = async (id: string, memo: string) => {
    await fetch("/api/news", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, memo }),
    });
    setNewsByTopic((prev) => {
      const next = { ...prev };
      for (const topic of TOPICS) {
        next[topic] = prev[topic].map((a) =>
          a.id === id ? { ...a, memo: memo || undefined } : a
        );
      }
      return next;
    });
  };

  const today = new Date().toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="px-4 py-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs text-blue-600 font-medium">{today}</p>
          <h1 className="text-lg font-bold text-gray-900">今日のピックアップ</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleReclassify}
            disabled={reclassifying || collecting}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-orange-200 bg-white text-orange-700 hover:bg-orange-50 hover:border-orange-300 disabled:opacity-50 transition-all"
          >
            {reclassifying ? (
              <>
                <span className="animate-spin w-3.5 h-3.5 border-2 border-orange-400 border-t-transparent rounded-full" />
                再分類中...
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                再分類
              </>
            )}
          </button>
          <button
            onClick={handleCollect}
            disabled={collecting || reclassifying}
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
      </div>

      {/* Reclassify result notification */}
      {reclassifyResult && (
        <div className="mb-3 px-3 py-2 text-xs rounded-lg bg-orange-50 text-orange-700 border border-orange-200 flex items-center justify-between">
          <span>{reclassifyResult}</span>
          <button onClick={() => setReclassifyResult(null)} className="ml-2 text-orange-400 hover:text-orange-600">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="space-y-4">
          {TOPICS.map((topic) => (
            <div key={topic} className="rounded-2xl bg-gray-50 p-4 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-32 mb-3" />
              <div className="space-y-2">
                <div className="h-24 bg-gray-200 rounded-xl" />
                <div className="h-24 bg-gray-200 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {TOPICS.map((topic) => (
            <CategorySection
              key={topic}
              topic={topic}
              papers={papersByTopic[topic]}
              news={newsByTopic[topic]}
              onRatePaper={handleRatePaper}
              onRateNews={handleRateNews}
              onBookmarkPaper={handleBookmarkPaper}
              onBookmarkNews={handleBookmarkNews}
              onMemoPaper={handleMemoPaper}
              onMemoNews={handleMemoNews}
            />
          ))}
        </div>
      )}
    </div>
  );
}
