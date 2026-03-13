import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { NewsArticle, NewsSummary } from "@/types";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const article = await prisma.newsArticle.findUnique({ where: { id } });

  if (!article) {
    return NextResponse.json({ error: "Article not found" }, { status: 404 });
  }

  const formatted: NewsArticle = {
    id: article.id,
    title: article.title,
    content: article.content,
    source: article.source,
    url: article.url,
    publishedAt: article.publishedAt.toISOString(),
    category: article.category as NewsArticle["category"],
    topic: article.topic as NewsArticle["topic"],
    summaryText: article.summaryText ?? undefined,
    summaryJson: article.summaryJson
      ? (JSON.parse(article.summaryJson) as NewsSummary)
      : undefined,
    recommendationReason: article.recommendationReason ?? undefined,
    score: article.score,
    lat: article.lat ?? undefined,
    lng: article.lng ?? undefined,
    bookmarked: article.bookmarked,
    rating: article.rating,
    isFallback: article.isFallback,
    createdAt: article.createdAt.toISOString(),
  };

  return NextResponse.json(formatted);
}
