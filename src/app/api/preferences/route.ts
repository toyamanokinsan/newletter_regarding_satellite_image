import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { UserPreferences, Persona, Category } from "@/types";

function formatPrefs(p: {
  id: string;
  persona: string;
  categories: string;
  notifyAt: string;
}): UserPreferences {
  return {
    id: p.id,
    persona: p.persona as Persona,
    categories: JSON.parse(p.categories) as Category[],
    notifyAt: p.notifyAt,
  };
}

export async function GET() {
  const prefs = await prisma.userPreferences.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default" },
  });

  return NextResponse.json(formatPrefs(prefs));
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { persona, categories, notifyAt } = body;

  const prefs = await prisma.userPreferences.upsert({
    where: { id: "default" },
    update: {
      ...(persona !== undefined && { persona }),
      ...(categories !== undefined && {
        categories: JSON.stringify(categories),
      }),
      ...(notifyAt !== undefined && { notifyAt }),
    },
    create: {
      id: "default",
      persona: persona || "general",
      categories: JSON.stringify(categories || []),
      notifyAt: notifyAt || "07:00",
    },
  });

  return NextResponse.json(formatPrefs(prefs));
}
