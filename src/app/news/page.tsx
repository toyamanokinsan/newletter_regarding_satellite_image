"use client";

import { useState, useEffect } from "react";
import { NewsArticle, Category } from "@/types";
import { NewsCard } from "@/components/feed/NewsCard";
import { SkeletonCard } from "@/components/ui/SkeletonCard";

const CATEGORIES: { value: Category | "all"; label: string }[] = [
  { value: "all", label: "すべて" },
  { value: "ObjectDetection", label: "物体検出" },
  { value: "Segmentation", label: "セグメンテーション" },
  { value: "ChangeDetection", label: "変化抽出" },
  { value: "SuperResolution", label: "超解像" },
  { value: "FoundationModel", label: "基盤モデル" },
];

export default function NewsPage() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<Category | "all">("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    setLoading(true);
    const categoryParam = category !== "all" ? `&category=${category}` : "";
    fetch(`/api/news?page=1&pageSize=20${categoryParam}`)
      .then((r) => r.json())
      .then((data) => {
        setArticles(data.articles || []);
        setTotalPages(data.totalPages || 1);
        setPage(1);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [category]);

  const loadMore = () => {
    const nextPage = page + 1;
    const categoryParam = category !== "all" ? `&category=${category}` : "";
    fetch(`/api/news?page=${nextPage}&pageSize=20${categoryParam}`)
      .then((r) => r.json())
      .then((data) => {
        setArticles((prev) => [...prev, ...(data.articles || [])]);
        setPage(nextPage);
      })
      .catch(console.error);
  };

  const handleBookmark = async (id: string, bookmarked: boolean) => {
    await fetch("/api/news", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, bookmarked }),
    });
    setArticles((prev) =>
      prev.map((a) => (a.id === id ? { ...a, bookmarked } : a))
    );
  };

  return (
    <div className="px-4 py-4">
      <h1 className="text-lg font-bold text-gray-900 mb-4">ニュース一覧</h1>

      {/* Category filter */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
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

      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
        ) : articles.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500 text-sm">ニュースがありません</p>
          </div>
        ) : (
          articles.map((a) => (
            <NewsCard key={a.id} article={a} onBookmark={handleBookmark} />
          ))
        )}

        {!loading && page < totalPages && (
          <button
            onClick={loadMore}
            className="w-full py-3 text-sm text-blue-600 font-medium hover:bg-blue-50 rounded-xl transition-colors"
          >
            さらに読み込む
          </button>
        )}
      </div>
    </div>
  );
}
