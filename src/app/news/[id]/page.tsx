"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { NewsArticle } from "@/types";
import { NewsDetail } from "@/components/detail/NewsDetail";
import { SkeletonCard } from "@/components/ui/SkeletonCard";

export default function NewsDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [article, setArticle] = useState<NewsArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const id = params?.id as string;

  useEffect(() => {
    if (!id) return;
    fetch(`/api/news/${encodeURIComponent(id)}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then(setArticle)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id]);

  const handleBookmark = async (articleId: string, bookmarked: boolean) => {
    await fetch("/api/news", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: articleId, bookmarked }),
    });
    setArticle((prev) => (prev ? { ...prev, bookmarked } : prev));
  };

  if (loading)
    return (
      <div className="px-4 py-6 space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );

  if (error || !article)
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">記事が見つかりませんでした</p>
        <button
          onClick={() => router.back()}
          className="mt-4 text-blue-600 text-sm hover:underline"
        >
          戻る
        </button>
      </div>
    );

  return <NewsDetail article={article} onBookmark={handleBookmark} />;
}
