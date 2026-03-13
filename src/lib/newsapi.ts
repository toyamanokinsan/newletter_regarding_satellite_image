import { Category, Topic } from "@/types";

const NEWSAPI_BASE = "https://newsapi.org/v2/everything";

const TRUSTED_DOMAINS = [
  "esri.com",
  "spaceflightnow.com",
  "spacenews.com",
  "nasaspaceflight.com",
  "eos.com",
  "planet.com",
  "maxar.com",
  "airbus.com",
  "geospatialworld.net",
  "gisgeography.com",
  "remotesensing.org",
];

interface QueryConfig {
  query: string;
  topic: Topic;
}

const QUERIES: QueryConfig[] = [
  // 衛星関連
  { query: "satellite imagery AI deep learning", topic: "satellite" },
  { query: "remote sensing machine learning", topic: "satellite" },
  { query: "satellite observation earth observation AI", topic: "satellite" },
  { query: "geospatial AI analysis", topic: "satellite" },
  { query: "SAR satellite radar imagery", topic: "satellite" },
  { query: "optical satellite image analysis", topic: "satellite" },
  // 画像認識関連
  { query: "computer vision AI deep learning", topic: "vision" },
  { query: "image recognition neural network", topic: "vision" },
  // 業務改善関連
  { query: "AI business automation tools", topic: "productivity" },
  { query: "LLM developer productivity", topic: "productivity" },
  { query: "DevOps AI automation", topic: "productivity" },
];

export interface NewsApiArticle {
  id: string;
  title: string;
  content: string;
  source: string;
  url: string;
  publishedAt: string;
  category: Category;
  topic: Topic;
}

function detectCategory(title: string, description: string): Category {
  const text = (title + " " + description).toLowerCase();
  if (text.includes("change detection") || text.includes("change monitor"))
    return "ChangeDetection";
  if (text.includes("super resolution") || text.includes("super-resolution"))
    return "SuperResolution";
  if (text.includes("segmentation")) return "Segmentation";
  if (text.includes("object detection") || text.includes("detection"))
    return "ObjectDetection";
  if (
    text.includes("foundation model") ||
    text.includes("large model") ||
    text.includes("vision language")
  )
    return "FoundationModel";
  return "Other";
}

function hashUrl(url: string): string {
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    const char = url.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

export async function fetchNewsArticles(
  pageSize = 20
): Promise<NewsApiArticle[]> {
  return fetchNewsByQueries(QUERIES, pageSize);
}

async function fetchNewsByQueries(
  queries: QueryConfig[],
  pageSize: number
): Promise<NewsApiArticle[]> {
  const apiKey = process.env.NEWS_API_KEY;
  if (!apiKey) {
    console.warn("NEWS_API_KEY not set, skipping news fetch");
    return [];
  }

  const allArticles: NewsApiArticle[] = [];
  const seenUrls = new Set<string>();

  for (const { query, topic } of queries) {
    const params = new URLSearchParams({
      q: query,
      pageSize: pageSize.toString(),
      language: "en",
      sortBy: "publishedAt",
      apiKey,
    });

    const url = `${NEWSAPI_BASE}?${params}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        console.error(`NewsAPI error: ${response.status} for query ${query}`);
        continue;
      }

      const data = await response.json();

      if (data.status !== "ok" || !data.articles) continue;

      for (const article of data.articles) {
        if (!article.url || seenUrls.has(article.url)) continue;
        if (!article.title || article.title === "[Removed]") continue;

        seenUrls.add(article.url);

        allArticles.push({
          id: hashUrl(article.url),
          title: article.title,
          content: article.content || article.description || "",
          source: article.source?.name || "Unknown",
          url: article.url,
          publishedAt: article.publishedAt || new Date().toISOString(),
          category: detectCategory(
            article.title,
            article.description || ""
          ),
          topic,
        });
      }
    } catch (error) {
      console.error(`Failed to fetch news for query ${query}:`, error);
    }
  }

  return allArticles;
}
