"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Paper } from "@/types";
import { PaperDetail } from "@/components/detail/PaperDetail";
import { SkeletonCard } from "@/components/ui/SkeletonCard";

export default function PaperDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [paper, setPaper] = useState<Paper | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const id = params?.id as string;

  useEffect(() => {
    if (!id) return;
    fetch(`/api/papers/${encodeURIComponent(id)}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then(setPaper)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id]);

  const handleBookmark = async (paperId: string, bookmarked: boolean) => {
    await fetch("/api/papers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: paperId, bookmarked }),
    });
    setPaper((prev) => (prev ? { ...prev, bookmarked } : prev));
  };

  if (loading)
    return (
      <div className="px-4 py-6 space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );

  if (error || !paper)
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">論文が見つかりませんでした</p>
        <button
          onClick={() => router.back()}
          className="mt-4 text-blue-600 text-sm hover:underline"
        >
          戻る
        </button>
      </div>
    );

  return <PaperDetail paper={paper} onBookmark={handleBookmark} />;
}
