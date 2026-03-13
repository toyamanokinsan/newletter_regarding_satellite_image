import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { MapMarker, Category } from "@/types";

export async function GET() {
  const [papers, articles] = await Promise.all([
    prisma.paper.findMany({
      where: { lat: { not: null }, lng: { not: null } },
      select: { id: true, title: true, category: true, lat: true, lng: true },
    }),
    prisma.newsArticle.findMany({
      where: { lat: { not: null }, lng: { not: null } },
      select: { id: true, title: true, category: true, lat: true, lng: true },
    }),
  ]);

  const markers: MapMarker[] = [
    ...papers
      .filter((p) => p.lat !== null && p.lng !== null)
      .map((p) => ({
        lat: p.lat as number,
        lng: p.lng as number,
        title: p.title,
        type: "paper" as const,
        id: p.id,
        category: p.category as Category,
      })),
    ...articles
      .filter((a) => a.lat !== null && a.lng !== null)
      .map((a) => ({
        lat: a.lat as number,
        lng: a.lng as number,
        title: a.title,
        type: "news" as const,
        id: a.id,
        category: a.category as Category,
      })),
  ];

  return NextResponse.json({ markers });
}
