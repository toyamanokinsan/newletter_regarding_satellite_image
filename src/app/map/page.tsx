"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { MapMarker, Category } from "@/types";
import { CategoryBadge } from "@/components/ui/CategoryBadge";

// Dynamically import Leaflet map to avoid SSR issues
const InteractiveMap = dynamic(
  () =>
    import("@/components/map/InteractiveMap").then((m) => m.InteractiveMap),
  { ssr: false }
);

const CATEGORY_FILTERS: { value: Category | "all"; label: string }[] = [
  { value: "all", label: "すべて" },
  { value: "ObjectDetection", label: "物体検出" },
  { value: "Segmentation", label: "セグメンテーション" },
  { value: "ChangeDetection", label: "変化抽出" },
  { value: "SuperResolution", label: "超解像" },
  { value: "FoundationModel", label: "基盤モデル" },
];

export default function MapPage() {
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Category | "all">("all");

  useEffect(() => {
    fetch("/api/map")
      .then((r) => r.json())
      .then((data) => setMarkers(data.markers || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filteredMarkers =
    filter === "all"
      ? markers
      : markers.filter((m) => m.category === filter);

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 120px)" }}>
      {/* Filter bar */}
      <div className="px-4 py-3 bg-white border-b border-gray-100">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {CATEGORY_FILTERS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`flex-shrink-0 px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${
                filter === value
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-1.5">
          {filteredMarkers.length} 件の地点
          {loading && " (読み込み中...)"}
        </p>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        {filteredMarkers.length === 0 && !loading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50">
            <span className="text-4xl mb-3">🗺</span>
            <p className="text-gray-500 text-sm">
              地点データがありません
            </p>
            <p className="text-gray-400 text-xs mt-1">
              /api/collect でデータを収集してください
            </p>
          </div>
        ) : (
          <InteractiveMap markers={filteredMarkers} />
        )}
      </div>

      {/* Legend */}
      <div className="px-4 py-2 bg-white border-t border-gray-100">
        <div className="flex flex-wrap gap-2">
          {(["ObjectDetection", "Segmentation", "ChangeDetection", "SuperResolution", "FoundationModel"] as Category[]).map((cat) => (
            <CategoryBadge key={cat} category={cat} size="sm" />
          ))}
        </div>
      </div>
    </div>
  );
}
