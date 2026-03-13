"use client";

import { NewsArticle } from "@/types";
import { FeedCard } from "./FeedCard";

interface NewsCardProps {
  article: NewsArticle;
  onBookmark?: (id: string, bookmarked: boolean) => void;
  onRate?: (id: string, value: number) => void;
}

export function NewsCard({ article, onBookmark, onRate }: NewsCardProps) {
  return <FeedCard item={article} type="news" onBookmark={onBookmark} onRate={onRate} />;
}
