import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { NewsArticle, NewsSummary } from "@/types";

function formatArticle(a: {
  id: string;
  title: string;
  content: string;
  source: string;
  url: string;
  publishedAt: Date;
  category: string;
  topic: string;
  summaryText: string | null;
  summaryJson: string | null;
  recommendationReason: string | null;
  reliability: number;
  reliabilityReason: string | null;
  score: number;
  lat: number | null;
  lng: number | null;
  bookmarked: boolean;
  bookmarkedAt: Date | null;
  memo: string | null;
  rating: number;
  isFallback: boolean;
  createdAt: Date;
}): NewsArticle {
  return {
    id: a.id,
    title: a.title,
    content: a.content,
    source: a.source,
    url: a.url,
    publishedAt: a.publishedAt.toISOString(),
    category: a.category as NewsArticle["category"],
    topic: a.topic as NewsArticle["topic"],
    summaryText: a.summaryText ?? undefined,
    summaryJson: a.summaryJson
      ? (JSON.parse(a.summaryJson) as NewsSummary)
      : undefined,
    recommendationReason: a.recommendationReason ?? undefined,
    reliability: a.reliability,
    reliabilityReason: a.reliabilityReason ?? undefined,
    score: a.score,
    lat: a.lat ?? undefined,
    lng: a.lng ?? undefined,
    bookmarked: a.bookmarked,
    bookmarkedAt: a.bookmarkedAt?.toISOString(),
    memo: a.memo ?? undefined,
    rating: a.rating,
    isFallback: a.isFallback,
    createdAt: a.createdAt.toISOString(),
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const topic = searchParams.get("topic");
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "20");
  const bookmarked = searchParams.get("bookmarked") === "true";

  const recent = searchParams.get("recent") === "true";
  const diverse = searchParams.get("diverse") === "true";

  const where: Record<string, unknown> = {};
  if (category && category !== "all") where.category = category;
  if (topic && topic !== "all") where.topic = topic;
  if (bookmarked) where.bookmarked = true;

  // Exclude news published before 2024
  const minDate = new Date("2024-01-01T00:00:00Z");
  where.publishedAt = { gte: minDate };

  // Recent mode: progressively widen date range, exclude bad-rated articles
  if (recent) {
    where.rating = { not: -1 };

    const now = new Date();
    const periods = [3, 7, 30]; // days
    // Fetch more than needed for diversity filtering
    const fetchSize = diverse ? pageSize * 4 : pageSize;
    let articles: ReturnType<typeof formatArticle>[] = [];

    for (const days of periods) {
      const since = new Date(now);
      since.setDate(since.getDate() - days);

      const found = await prisma.newsArticle.findMany({
        where: { ...where, createdAt: { gte: since } },
        orderBy: { score: "desc" },
        take: fetchSize,
      });

      let formatted = found.map(formatArticle);

      // Diversity filter: max 1 article per source
      if (diverse) {
        const seenSources = new Set<string>();
        formatted = formatted.filter((a) => {
          if (seenSources.has(a.source)) return false;
          seenSources.add(a.source);
          return true;
        });
      }

      articles = formatted.slice(0, pageSize);
      if (articles.length >= pageSize) break;
    }

    // Fallback to all-time if still not enough — prioritize high reliability
    if (articles.length < pageSize) {
      const found = await prisma.newsArticle.findMany({
        where,
        orderBy: [{ reliability: "desc" }, { score: "desc" }],
        take: fetchSize,
      });

      let formatted = found.map(formatArticle);

      if (diverse) {
        const seenSources = new Set<string>();
        formatted = formatted.filter((a) => {
          if (seenSources.has(a.source)) return false;
          seenSources.add(a.source);
          return true;
        });
      }

      articles = formatted.slice(0, pageSize);
    }

    return NextResponse.json({
      articles,
      total: articles.length,
      page: 1,
      pageSize,
      totalPages: 1,
    });
  }

  const orderBy = bookmarked
    ? { bookmarkedAt: "desc" as const }
    : { score: "desc" as const };

  const [articles, total] = await Promise.all([
    prisma.newsArticle.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.newsArticle.count({ where }),
  ]);

  return NextResponse.json({
    articles: articles.map(formatArticle),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { id } = body;
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if ("bookmarked" in body) {
    data.bookmarked = body.bookmarked;
    data.bookmarkedAt = body.bookmarked ? new Date() : null;
  }
  if ("memo" in body) {
    data.memo = body.memo || null;
  }

  const article = await prisma.newsArticle.update({ where: { id }, data });
  return NextResponse.json(formatArticle(article));
}
