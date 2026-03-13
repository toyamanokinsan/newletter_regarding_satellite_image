import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { itemId, itemType, value } = body as {
    itemId: string;
    itemType: "paper" | "news";
    value: number;
  };

  // Validate input
  if (!itemId || !itemType || ![1, -1].includes(value)) {
    return NextResponse.json(
      { error: "itemId, itemType ('paper'|'news'), and value (+1|-1) required" },
      { status: 400 }
    );
  }

  // Get the item's category
  let category: string;
  if (itemType === "paper") {
    const paper = await prisma.paper.findUnique({ where: { id: itemId } });
    if (!paper) {
      return NextResponse.json({ error: "Paper not found" }, { status: 404 });
    }
    category = paper.category;
  } else {
    const article = await prisma.newsArticle.findUnique({ where: { id: itemId } });
    if (!article) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }
    category = article.category;
  }

  // Upsert Rating (1 rating per item)
  await prisma.rating.upsert({
    where: { itemId_itemType: { itemId, itemType } },
    create: { itemId, itemType, value, category },
    update: { value, category },
  });

  // Update item's rating field
  if (itemType === "paper") {
    await prisma.paper.update({
      where: { id: itemId },
      data: { rating: value },
    });
  } else {
    await prisma.newsArticle.update({
      where: { id: itemId },
      data: { rating: value },
    });
  }

  // Recalculate CategoryWeight for this category
  const upCount = await prisma.rating.count({
    where: { category, value: 1 },
  });
  const downCount = await prisma.rating.count({
    where: { category, value: -1 },
  });
  const total = upCount + downCount;
  const adjustment = total > 0 ? 0.3 * (upCount - downCount) / total : 0;

  await prisma.categoryWeight.upsert({
    where: { category },
    create: { category, adjustment, upCount, downCount },
    update: { adjustment, upCount, downCount },
  });

  return NextResponse.json({
    success: true,
    rating: value,
    categoryWeight: { category, adjustment, upCount, downCount },
  });
}
