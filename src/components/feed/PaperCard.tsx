"use client";

import { Paper } from "@/types";
import { FeedCard } from "./FeedCard";

interface PaperCardProps {
  paper: Paper;
  onBookmark?: (id: string, bookmarked: boolean) => void;
  onRate?: (id: string, value: number) => void;
}

export function PaperCard({ paper, onBookmark, onRate }: PaperCardProps) {
  return <FeedCard item={paper} type="paper" onBookmark={onBookmark} onRate={onRate} />;
}
