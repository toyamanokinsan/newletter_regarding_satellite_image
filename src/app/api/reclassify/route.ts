import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { classifyTopics } from "@/lib/openai";
import { Topic } from "@/types";

export async function POST() {
  const allPapers = await prisma.paper.findMany({
    select: { id: true, title: true, abstract: true },
  });
  const allNews = await prisma.newsArticle.findMany({
    select: { id: true, title: true, content: true },
  });

  const classifyItems = [
    ...allPapers.map((p) => ({ id: `paper:${p.id}`, title: p.title, text: p.abstract })),
    ...allNews.map((a) => ({ id: `news:${a.id}`, title: a.title, text: a.content })),
  ];

  const classifications = await classifyTopics(classifyItems);

  let updated = 0;
  let deleted = 0;

  // Re-classify papers
  for (const paper of allPapers) {
    const classified = classifications[`paper:${paper.id}`];
    if (!classified) continue;

    if (classified === "none") {
      await prisma.rating.deleteMany({
        where: { itemId: paper.id, itemType: "paper" },
      });
      await prisma.paper.delete({ where: { id: paper.id } });
      deleted++;
    } else {
      await prisma.paper.update({
        where: { id: paper.id },
        data: { topic: classified as Topic },
      });
      updated++;
    }
  }

  // Re-classify news
  for (const article of allNews) {
    const classified = classifications[`news:${article.id}`];
    if (!classified) continue;

    if (classified === "none") {
      // Delete related ratings first
      await prisma.rating.deleteMany({
        where: { itemId: article.id, itemType: "news" },
      });
      await prisma.newsArticle.delete({ where: { id: article.id } });
      deleted++;
    } else {
      await prisma.newsArticle.update({
        where: { id: article.id },
        data: { topic: classified as Topic },
      });
      updated++;
    }
  }

  return NextResponse.json({
    success: true,
    total: classifyItems.length,
    updated,
    deleted,
    message: `Re-classified: ${updated} updated, ${deleted} deleted as irrelevant`,
  });
}
