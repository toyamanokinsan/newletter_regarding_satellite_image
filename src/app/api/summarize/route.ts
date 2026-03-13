import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { summarizePaper, summarizeNews } from "@/lib/openai";

export async function POST(request: NextRequest) {
  const { type, id } = await request.json();

  if (!type || !id) {
    return NextResponse.json({ error: "type and id required" }, { status: 400 });
  }

  if (type === "paper") {
    const paper = await prisma.paper.findUnique({ where: { id } });
    if (!paper) {
      return NextResponse.json({ error: "Paper not found" }, { status: 404 });
    }

    const result = await summarizePaper(paper.title, paper.abstract);
    if (!result) {
      return NextResponse.json({ error: "Summarization failed" }, { status: 500 });
    }

    await prisma.paper.update({
      where: { id },
      data: {
        summaryJson: JSON.stringify(result.summary),
        recommendationReason: result.recommendationReason,
      },
    });

    return NextResponse.json({ summary: result.summary, recommendationReason: result.recommendationReason });
  }

  if (type === "news") {
    const article = await prisma.newsArticle.findUnique({ where: { id } });
    if (!article) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    const result = await summarizeNews(article.title, article.content);
    if (!result) {
      return NextResponse.json({ error: "Summarization failed" }, { status: 500 });
    }

    await prisma.newsArticle.update({
      where: { id },
      data: {
        summaryText: result.summary.summary,
        summaryJson: JSON.stringify(result.summary),
        recommendationReason: result.recommendationReason,
      },
    });

    return NextResponse.json({ summary: result.summary, recommendationReason: result.recommendationReason });
  }

  return NextResponse.json({ error: "Invalid type" }, { status: 400 });
}
