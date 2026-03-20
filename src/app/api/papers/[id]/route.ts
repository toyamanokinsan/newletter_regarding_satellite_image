import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Paper, PaperSummary } from "@/types";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const paper = await prisma.paper.findUnique({ where: { id } });

  if (!paper) {
    return NextResponse.json({ error: "Paper not found" }, { status: 404 });
  }

  const formatted: Paper = {
    id: paper.id,
    title: paper.title,
    abstract: paper.abstract,
    authors: JSON.parse(paper.authors) as string[],
    publishedAt: paper.publishedAt.toISOString(),
    pdfUrl: paper.pdfUrl,
    category: paper.category as Paper["category"],
    topic: paper.topic as Paper["topic"],
    summaryJson: paper.summaryJson
      ? (JSON.parse(paper.summaryJson) as PaperSummary)
      : undefined,
    recommendationReason: paper.recommendationReason ?? undefined,
    reliability: paper.reliability,
    reliabilityReason: paper.reliabilityReason ?? undefined,
    score: paper.score,
    lat: paper.lat ?? undefined,
    lng: paper.lng ?? undefined,
    bookmarked: paper.bookmarked,
    bookmarkedAt: paper.bookmarkedAt?.toISOString(),
    memo: paper.memo ?? undefined,
    rating: paper.rating,
    isFallback: paper.isFallback,
    createdAt: paper.createdAt.toISOString(),
  };

  return NextResponse.json(formatted);
}
