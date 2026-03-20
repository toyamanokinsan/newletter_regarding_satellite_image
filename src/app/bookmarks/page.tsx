"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Paper, NewsArticle } from "@/types";
import { TopArticleCard } from "@/components/home/TopArticleCard";

const CACHE_KEY = "bookmarks_data";
const SCROLL_KEY = "bookmarks_scroll";

interface BookmarkItem {
  type: "paper" | "news";
  data: Paper | NewsArticle;
  bookmarkedAt: string;
}

function loadCache(): BookmarkItem[] | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function BookmarksPage() {
  const cached = useRef(loadCache());
  const [items, setItems] = useState<BookmarkItem[]>(cached.current ?? []);
  const [loading, setLoading] = useState(!cached.current);

  const fetchBookmarks = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const [papersRes, newsRes] = await Promise.all([
        fetch("/api/papers?bookmarked=true&pageSize=100").then((r) => r.json()),
        fetch("/api/news?bookmarked=true&pageSize=100").then((r) => r.json()),
      ]);

      const paperItems: BookmarkItem[] = (papersRes.papers || []).map(
        (p: Paper) => ({
          type: "paper" as const,
          data: p,
          bookmarkedAt: p.bookmarkedAt || p.createdAt,
        })
      );

      const newsItems: BookmarkItem[] = (newsRes.articles || []).map(
        (a: NewsArticle) => ({
          type: "news" as const,
          data: a,
          bookmarkedAt: a.bookmarkedAt || a.createdAt,
        })
      );

      // Merge and sort by bookmarkedAt desc
      const merged = [...paperItems, ...newsItems].sort(
        (a, b) =>
          new Date(b.bookmarkedAt).getTime() -
          new Date(a.bookmarkedAt).getTime()
      );

      setItems(merged);
      try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(merged)); } catch {}
    } catch (err) {
      console.error("Failed to fetch bookmarks:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (cached.current) {
      fetchBookmarks(false);
    } else {
      fetchBookmarks(true);
    }
  }, [fetchBookmarks]);

  // Scroll position save/restore
  useEffect(() => {
    const savedScroll = sessionStorage.getItem(SCROLL_KEY);
    if (savedScroll && cached.current) {
      requestAnimationFrame(() => {
        window.scrollTo(0, parseInt(savedScroll, 10));
      });
    }
    const saveScroll = () => {
      sessionStorage.setItem(SCROLL_KEY, String(window.scrollY));
    };
    window.addEventListener("beforeunload", saveScroll);
    const interval = setInterval(saveScroll, 500);
    return () => {
      saveScroll();
      window.removeEventListener("beforeunload", saveScroll);
      clearInterval(interval);
    };
  }, []);

  const handleRatePaper = async (id: string, value: number) => {
    await fetch("/api/ratings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId: id, itemType: "paper", value }),
    });
    setItems((prev) =>
      prev.map((item) =>
        item.data.id === id
          ? { ...item, data: { ...item.data, rating: value } }
          : item
      )
    );
  };

  const handleRateNews = async (id: string, value: number) => {
    await fetch("/api/ratings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId: id, itemType: "news", value }),
    });
    setItems((prev) =>
      prev.map((item) =>
        item.data.id === id
          ? { ...item, data: { ...item.data, rating: value } }
          : item
      )
    );
  };

  const handleMemo = async (id: string, memo: string, type: "paper" | "news") => {
    const endpoint = type === "paper" ? "/api/papers" : "/api/news";
    await fetch(endpoint, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, memo }),
    });
    setItems((prev) =>
      prev.map((item) =>
        item.data.id === id
          ? { ...item, data: { ...item.data, memo: memo || undefined } }
          : item
      )
    );
  };

  const handleBookmark = async (
    id: string,
    bookmarked: boolean,
    type: "paper" | "news"
  ) => {
    const endpoint = type === "paper" ? "/api/papers" : "/api/news";
    await fetch(endpoint, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, bookmarked }),
    });
    if (!bookmarked) {
      // Remove from list
      setItems((prev) => prev.filter((item) => item.data.id !== id));
    }
  };

  // Group items by date
  const grouped = items.reduce<Record<string, BookmarkItem[]>>((acc, item) => {
    const dateKey = new Date(item.bookmarkedAt).toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(item);
    return acc;
  }, {});

  return (
    <div className="px-4 py-4">
      <div className="mb-4">
        <h1 className="text-lg font-bold text-gray-900">ブックマーク</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          {items.length}件のブックマーク
        </p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl bg-gray-50 p-4 animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-32 mb-3" />
              <div className="h-24 bg-gray-200 rounded-xl" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <svg
            className="w-12 h-12 mx-auto mb-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
            />
          </svg>
          <p className="text-sm">ブックマークした記事がありません</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([date, dateItems]) => (
            <div key={date}>
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                {date}
              </h2>
              <div className="space-y-2">
                {dateItems.map((item) => (
                  <TopArticleCard
                    key={`${item.type}-${item.data.id}`}
                    item={item.data}
                    type={item.type}
                    onRate={
                      item.type === "paper"
                        ? handleRatePaper
                        : handleRateNews
                    }
                    onBookmark={(id, bookmarked) =>
                      handleBookmark(id, bookmarked, item.type)
                    }
                    onMemo={(id, memo) =>
                      handleMemo(id, memo, item.type)
                    }
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
