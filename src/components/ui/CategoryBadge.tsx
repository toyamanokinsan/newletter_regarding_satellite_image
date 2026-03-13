"use client";

import { Category } from "@/types";

const CATEGORY_CONFIG: Record<
  Category,
  { label: string; className: string }
> = {
  ObjectDetection: {
    label: "物体検出",
    className: "bg-blue-100 text-blue-800",
  },
  Segmentation: {
    label: "セグメンテーション",
    className: "bg-purple-100 text-purple-800",
  },
  ChangeDetection: {
    label: "変化抽出",
    className: "bg-green-100 text-green-800",
  },
  SuperResolution: {
    label: "超解像",
    className: "bg-yellow-100 text-yellow-800",
  },
  FoundationModel: {
    label: "基盤モデル",
    className: "bg-red-100 text-red-800",
  },
  Other: {
    label: "その他",
    className: "bg-gray-100 text-gray-600",
  },
};

interface CategoryBadgeProps {
  category: Category;
  size?: "sm" | "md";
}

export function CategoryBadge({ category, size = "sm" }: CategoryBadgeProps) {
  const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.Other;
  const sizeClass = size === "sm" ? "text-xs px-2 py-0.5" : "text-sm px-3 py-1";

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${sizeClass} ${config.className}`}
    >
      {config.label}
    </span>
  );
}
