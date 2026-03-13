import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { fetchArxivPapers, fetchArxivFallback } from "@/lib/arxiv";
import { fetchNewsArticles } from "@/lib/newsapi";
import { summarizePaper, summarizeNews, extractPlaceName, classifyTopics } from "@/lib/openai";
import { geocodePlaceName } from "@/lib/geocoding";
import { calculateScore } from "@/lib/scoring";
import { Category, Topic } from "@/types";

const SCORE_THRESHOLD = 0.4;
const ALL_TOPICS: Topic[] = ["satellite", "vision", "productivity"];

export async function POST(request: NextRequest) {
  // CRON_SECRET が設定されている場合のみ認証チェック（未設定なら誰でも実行可）
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const results = { papers: 0, news: 0, fallbackPapers: 0, skippedByClassifier: 0, errors: [] as string[] };

  // Load category weight adjustments from user ratings
  const categoryWeights = await prisma.categoryWeight.findMany();
  const categoryAdjustments: Record<string, number> = {};
  for (const cw of categoryWeights) {
    categoryAdjustments[cw.category] = cw.adjustment;
  }

  // Fetch papers and news in parallel
  const [arxivEntries, newsArticles] = await Promise.all([
    fetchArxivPapers(20).catch((e) => {
      results.errors.push(`arXiv: ${e.message}`);
      return [];
    }),
    fetchNewsArticles(20).catch((e) => {
      results.errors.push(`NewsAPI: ${e.message}`);
      return [];
    }),
  ]);

  // --- Topic classification with GPT-4o-mini ---
  // Filter out duplicates first, then classify new items in batch
  const newPapers = [];
  for (const entry of arxivEntries) {
    const existing = await prisma.paper.findUnique({ where: { id: entry.id } });
    if (!existing) newPapers.push(entry);
  }

  const newNews = [];
  for (const article of newsArticles) {
    const existing = await prisma.newsArticle.findUnique({ where: { url: article.url } });
    if (!existing) newNews.push(article);
  }

  // Build classification items for all new entries
  const classifyItems = [
    ...newPapers.map((e) => ({ id: `paper:${e.id}`, title: e.title, text: e.abstract })),
    ...newNews.map((a) => ({ id: `news:${a.id}`, title: a.title, text: a.content })),
  ];

  const classifications = await classifyTopics(classifyItems);

  // Build lookup: id -> classified topic
  const paperTopics = new Map<string, string>();
  const newsTopics = new Map<string, string>();
  for (const [key, topic] of Object.entries(classifications)) {
    if (key.startsWith("paper:")) {
      paperTopics.set(key.slice(6), topic);
    } else if (key.startsWith("news:")) {
      newsTopics.set(key.slice(5), topic);
    }
  }

  // Process arXiv papers
  for (const entry of newPapers) {
    try {
      // Apply AI classification (skip if "none", override topic otherwise)
      const classifiedTopic = paperTopics.get(entry.id);
      if (classifiedTopic === "none") {
        results.skippedByClassifier++;
        continue;
      }
      const topic = (classifiedTopic as Topic) || entry.topic;

      // Summarize with GPT-4o-mini
      const result = await summarizePaper(entry.title, entry.abstract);

      // Extract and geocode location
      let lat: number | undefined;
      let lng: number | undefined;
      const placeName = await extractPlaceName(entry.abstract);
      if (placeName) {
        const coords = await geocodePlaceName(placeName);
        if (coords) {
          lat = coords.lat;
          lng = coords.lng;
        }
      }

      const category = (entry.categories[0] || "Other") as Category;
      const score = calculateScore({
        publishedAt: new Date(entry.publishedAt),
        isPaper: true,
        category,
        text: entry.title + " " + entry.abstract,
        categoryAdjustments,
      });

      await prisma.paper.create({
        data: {
          id: entry.id,
          title: entry.title,
          abstract: entry.abstract,
          authors: JSON.stringify(entry.authors),
          publishedAt: new Date(entry.publishedAt),
          pdfUrl: entry.pdfUrl,
          category,
          topic,
          summaryJson: result ? JSON.stringify(result.summary) : null,
          recommendationReason: result?.recommendationReason || null,
          score,
          lat: lat ?? null,
          lng: lng ?? null,
        },
      });

      results.papers++;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      results.errors.push(`Paper ${entry.id}: ${msg}`);
    }
  }

  // Process news articles
  for (const article of newNews) {
    try {
      // Apply AI classification (skip if "none", override topic otherwise)
      const classifiedTopic = newsTopics.get(article.id);
      if (classifiedTopic === "none") {
        results.skippedByClassifier++;
        continue;
      }
      const topic = (classifiedTopic as Topic) || article.topic;

      // Summarize with GPT-4o-mini
      const result = await summarizeNews(article.title, article.content);

      // Extract and geocode location
      let lat: number | undefined;
      let lng: number | undefined;
      const placeName = await extractPlaceName(article.title + " " + article.content);
      if (placeName) {
        const coords = await geocodePlaceName(placeName);
        if (coords) {
          lat = coords.lat;
          lng = coords.lng;
        }
      }

      const score = calculateScore({
        publishedAt: new Date(article.publishedAt),
        isPaper: false,
        category: article.category,
        source: article.source,
        categoryAdjustments,
      });

      await prisma.newsArticle.create({
        data: {
          id: article.id,
          title: article.title,
          content: article.content,
          source: article.source,
          url: article.url,
          publishedAt: new Date(article.publishedAt),
          category: article.category,
          topic,
          summaryText: result ? result.summary.summary : null,
          summaryJson: result ? JSON.stringify(result.summary) : null,
          recommendationReason: result?.recommendationReason || null,
          score,
          lat: lat ?? null,
          lng: lng ?? null,
        },
      });

      results.news++;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      results.errors.push(`News ${article.id}: ${msg}`);
    }
  }

  // Fallback: check each topic for insufficient articles
  for (const topic of ALL_TOPICS) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const topicPapers = await prisma.paper.findMany({
        where: {
          topic,
          createdAt: { gte: today },
          isFallback: false,
        },
        orderBy: { score: "desc" },
        take: 3,
      });

      const needsFallback =
        topicPapers.length === 0 ||
        topicPapers.every((p) => p.score <= SCORE_THRESHOLD);

      if (needsFallback) {
        console.log(`Fallback triggered for topic: ${topic}`);
        const fallbackEntries = await fetchArxivFallback(topic, 5);

        for (const entry of fallbackEntries) {
          const existing = await prisma.paper.findUnique({ where: { id: entry.id } });
          if (existing) continue;

          const result = await summarizePaper(entry.title, entry.abstract);
          const category = (entry.categories[0] || "Other") as Category;
          const score = calculateScore({
            publishedAt: new Date(entry.publishedAt),
            isPaper: true,
            category,
            text: entry.title + " " + entry.abstract,
            categoryAdjustments,
          });

          await prisma.paper.create({
            data: {
              id: entry.id,
              title: entry.title,
              abstract: entry.abstract,
              authors: JSON.stringify(entry.authors),
              publishedAt: new Date(entry.publishedAt),
              pdfUrl: entry.pdfUrl,
              category,
              topic: entry.topic,
              summaryJson: result ? JSON.stringify(result.summary) : null,
              recommendationReason: result?.recommendationReason || null,
              score,
              lat: null,
              lng: null,
              isFallback: true,
            },
          });

          results.fallbackPapers++;
        }
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      results.errors.push(`Fallback ${topic}: ${msg}`);
    }
  }

  return NextResponse.json({
    success: true,
    ...results,
    message: `Collected ${results.papers} papers, ${results.news} news, ${results.fallbackPapers} fallback papers, ${results.skippedByClassifier} skipped by classifier`,
  });
}

// Allow GET for simple health check / manual trigger in dev
export async function GET() {
  return NextResponse.json({ message: "POST to /api/collect to trigger data collection" });
}
