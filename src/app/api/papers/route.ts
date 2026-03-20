import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Paper, PaperSummary } from "@/types";

function formatPaper(p: {
  id: string;
  title: string;
  abstract: string;
  authors: string;
  publishedAt: Date;
  pdfUrl: string;
  category: string;
  topic: string;
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
}): Paper {
  return {
    id: p.id,
    title: p.title,
    abstract: p.abstract,
    authors: JSON.parse(p.authors) as string[],
    publishedAt: p.publishedAt.toISOString(),
    pdfUrl: p.pdfUrl,
    category: p.category as Paper["category"],
    topic: p.topic as Paper["topic"],
    summaryJson: p.summaryJson
      ? (JSON.parse(p.summaryJson) as PaperSummary)
      : undefined,
    recommendationReason: p.recommendationReason ?? undefined,
    reliability: p.reliability,
    reliabilityReason: p.reliabilityReason ?? undefined,
    score: p.score,
    lat: p.lat ?? undefined,
    lng: p.lng ?? undefined,
    bookmarked: p.bookmarked,
    bookmarkedAt: p.bookmarkedAt?.toISOString(),
    memo: p.memo ?? undefined,
    rating: p.rating,
    isFallback: p.isFallback,
    createdAt: p.createdAt.toISOString(),
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

  const where: Record<string, unknown> = {};
  if (category && category !== "all") where.category = category;
  if (topic && topic !== "all") where.topic = topic;
  if (bookmarked) where.bookmarked = true;

  // Exclude papers published before 2024
  const minDate = new Date("2024-01-01T00:00:00Z");
  where.publishedAt = { gte: minDate };

  // Recent mode: progressively widen date range, exclude bad-rated articles
  if (recent) {
    where.rating = { not: -1 };

    const now = new Date();
    const periods = [3, 7, 30]; // days
    let papers: ReturnType<typeof formatPaper>[] = [];

    for (const days of periods) {
      const since = new Date(now);
      since.setDate(since.getDate() - days);

      const found = await prisma.paper.findMany({
        where: { ...where, createdAt: { gte: since } },
        orderBy: { score: "desc" },
        take: pageSize,
      });

      papers = found.map(formatPaper);
      if (papers.length >= pageSize) break;
    }

    // Fallback to all-time if still not enough — prioritize high reliability
    if (papers.length < pageSize) {
      const found = await prisma.paper.findMany({
        where,
        orderBy: [{ reliability: "desc" }, { score: "desc" }],
        take: pageSize,
      });
      papers = found.map(formatPaper);
    }

    return NextResponse.json({
      papers,
      total: papers.length,
      page: 1,
      pageSize,
      totalPages: 1,
    });
  }

  const orderBy = bookmarked
    ? { bookmarkedAt: "desc" as const }
    : { score: "desc" as const };

  const [papers, total] = await Promise.all([
    prisma.paper.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.paper.count({ where }),
  ]);

  return NextResponse.json({
    papers: papers.map(formatPaper),
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

  const paper = await prisma.paper.update({ where: { id }, data });
  return NextResponse.json(formatPaper(paper));
}
