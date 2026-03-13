"use client";

import { useState, useEffect } from "react";
import { Paper, Category } from "@/types";
import { PaperCard } from "@/components/feed/PaperCard";
import { SkeletonCard } from "@/components/ui/SkeletonCard";

const CATEGORIES: { value: Category | "all"; label: string }[] = [
  { value: "all", label: "すべて" },
  { value: "ObjectDetection", label: "物体検出" },
  { value: "Segmentation", label: "セグメンテーション" },
  { value: "ChangeDetection", label: "変化抽出" },
  { value: "SuperResolution", label: "超解像" },
  { value: "FoundationModel", label: "基盤モデル" },
];

export default function PapersPage() {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<Category | "all">("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    setLoading(true);
    const categoryParam = category !== "all" ? `&category=${category}` : "";
    fetch(`/api/papers?page=1&pageSize=20${categoryParam}`)
      .then((r) => r.json())
      .then((data) => {
        setPapers(data.papers || []);
        setTotalPages(data.totalPages || 1);
        setPage(1);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [category]);

  const loadMore = () => {
    const nextPage = page + 1;
    const categoryParam = category !== "all" ? `&category=${category}` : "";
    fetch(`/api/papers?page=${nextPage}&pageSize=20${categoryParam}`)
      .then((r) => r.json())
      .then((data) => {
        setPapers((prev) => [...prev, ...(data.papers || [])]);
        setPage(nextPage);
      })
      .catch(console.error);
  };

  const handleBookmark = async (id: string, bookmarked: boolean) => {
    await fetch("/api/papers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, bookmarked }),
    });
    setPapers((prev) =>
      prev.map((p) => (p.id === id ? { ...p, bookmarked } : p))
    );
  };

  return (
    <div className="px-4 py-4">
      <h1 className="text-lg font-bold text-gray-900 mb-4">論文一覧</h1>

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
        ) : papers.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500 text-sm">論文がありません</p>
          </div>
        ) : (
          papers.map((p) => (
            <PaperCard key={p.id} paper={p} onBookmark={handleBookmark} />
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
