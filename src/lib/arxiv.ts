import { ArxivEntry, Category, Topic } from "@/types";

const ARXIV_API_BASE = "https://export.arxiv.org/api/query";
const RATE_LIMIT_MS = 3000;

interface QueryConfig {
  query: string;
  topic: Topic;
}

const QUERIES: QueryConfig[] = [
  // 衛星関連
  { query: "all:satellite+imagery+deep+learning", topic: "satellite" },
  { query: "cat:cs.CV+AND+all:remote+sensing", topic: "satellite" },
  { query: "cat:cs.CV+AND+all:satellite+observation+deep+learning", topic: "satellite" },
  { query: "all:change+detection+satellite+imagery", topic: "satellite" },
  { query: "all:semantic+segmentation+remote+sensing", topic: "satellite" },
  { query: "all:SAR+image+deep+learning", topic: "satellite" },
  { query: "all:synthetic+aperture+radar+detection", topic: "satellite" },
  { query: "all:optical+satellite+image+deep+learning", topic: "satellite" },
  // 画像認識関連
  { query: "all:image+recognition+deep+learning", topic: "vision" },
  { query: "all:computer+vision+transformer", topic: "vision" },
  { query: "all:object+detection+neural+network", topic: "vision" },
  // 業務改善関連
  { query: "all:LLM+code+generation", topic: "productivity" },
  { query: "all:AI+workflow+automation", topic: "productivity" },
  { query: "all:software+engineering+machine+learning", topic: "productivity" },
];

// Fallback queries for when no good articles are found
export const FALLBACK_QUERIES: Record<Topic, QueryConfig[]> = {
  satellite: [
    { query: "all:survey+satellite+remote+sensing+deep+learning", topic: "satellite" },
    { query: "all:benchmark+satellite+image+segmentation", topic: "satellite" },
  ],
  vision: [
    { query: "all:survey+computer+vision+deep+learning", topic: "vision" },
    { query: "all:benchmark+object+detection+state+of+the+art", topic: "vision" },
  ],
  productivity: [
    { query: "all:survey+large+language+model+code+generation", topic: "productivity" },
    { query: "all:benchmark+AI+software+engineering", topic: "productivity" },
  ],
};

function detectCategory(title: string, abstract: string): Category {
  const text = (title + " " + abstract).toLowerCase();
  if (text.includes("change detection") || text.includes("change extract"))
    return "ChangeDetection";
  if (text.includes("super resolution") || text.includes("super-resolution"))
    return "SuperResolution";
  if (
    text.includes("segmentation") ||
    text.includes("semantic") ||
    text.includes("instance segmentation")
  )
    return "Segmentation";
  if (
    text.includes("object detection") ||
    text.includes("detector") ||
    text.includes("yolo")
  )
    return "ObjectDetection";
  if (
    text.includes("foundation model") ||
    text.includes("sam ") ||
    text.includes("segment anything") ||
    text.includes("vision-language") ||
    text.includes("large model")
  )
    return "FoundationModel";
  return "Other";
}

function parseAtomXml(xml: string): ArxivEntry[] {
  const entries: ArxivEntry[] = [];

  // Simple XML parser for arXiv Atom feed
  const entryMatches = xml.match(/<entry>([\s\S]*?)<\/entry>/g);
  if (!entryMatches) return entries;

  for (const entryXml of entryMatches) {
    const getId = (xml: string): string => {
      const match = xml.match(/<id>(.+?)<\/id>/);
      if (!match) return "";
      // Extract arXiv ID from URL like http://arxiv.org/abs/2401.12345v1
      return match[1].replace("http://arxiv.org/abs/", "").replace(/v\d+$/, "");
    };

    const getText = (xml: string, tag: string): string => {
      const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
      return match ? match[1].trim().replace(/\s+/g, " ") : "";
    };

    const getAuthors = (xml: string): string[] => {
      const matches = xml.match(/<author>[\s\S]*?<name>([\s\S]*?)<\/name>[\s\S]*?<\/author>/g);
      if (!matches) return [];
      return matches.map((m) => {
        const nameMatch = m.match(/<name>([\s\S]*?)<\/name>/);
        return nameMatch ? nameMatch[1].trim() : "";
      }).filter(Boolean);
    };

    const getPdfUrl = (xml: string): string => {
      const matches = xml.match(/<link[^>]+rel="related"[^>]+title="pdf"[^>]+href="([^"]+)"/);
      if (matches) return matches[1];
      const altMatch = xml.match(/<link[^>]+href="([^"]+pdf[^"]*)"[^>]*\/>/);
      if (altMatch) return altMatch[1];
      const idMatch = xml.match(/<id>http:\/\/arxiv\.org\/abs\/(.+?)<\/id>/);
      if (idMatch) return `https://arxiv.org/pdf/${idMatch[1]}`;
      return "";
    };

    const id = getId(entryXml);
    const title = getText(entryXml, "title");
    const abstract = getText(entryXml, "summary");
    const publishedRaw = getText(entryXml, "published");

    if (!id || !title) continue;

    entries.push({
      id,
      title,
      abstract,
      authors: getAuthors(entryXml),
      publishedAt: publishedRaw || new Date().toISOString(),
      pdfUrl: getPdfUrl(entryXml),
      categories: [detectCategory(title, abstract)],
    });
  }

  return entries;
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface ArxivEntryWithTopic extends ArxivEntry {
  topic: Topic;
}

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export async function fetchArxivPapers(maxResults = 20, querySubsetSize = 10): Promise<ArxivEntryWithTopic[]> {
  // Shuffle queries and pick a subset for variety
  const shuffled = shuffleArray(QUERIES);
  const subset = shuffled.slice(0, querySubsetSize);
  return fetchArxivByQueries(subset, maxResults);
}

export async function fetchArxivFallback(topic: Topic, maxResults = 10): Promise<ArxivEntryWithTopic[]> {
  const queries = FALLBACK_QUERIES[topic] || [];
  return fetchArxivByQueries(queries, maxResults);
}

async function fetchArxivByQueries(queries: QueryConfig[], maxResults: number): Promise<ArxivEntryWithTopic[]> {
  const allEntries: ArxivEntryWithTopic[] = [];
  const seenIds = new Set<string>();

  for (let i = 0; i < queries.length; i++) {
    const { query, topic } = queries[i];
    // Alternate sort: even index = relevance, odd = submittedDate
    const sortBy = i % 2 === 0 ? "relevance" : "submittedDate";
    const url = `${ARXIV_API_BASE}?search_query=${query}&start=0&max_results=${maxResults}&sortBy=${sortBy}&sortOrder=descending`;

    try {
      const response = await fetch(url, {
        headers: { "User-Agent": "SatelliteAINewsletter/1.0" },
      });

      if (!response.ok) {
        console.error(`arXiv API error: ${response.status} for query ${query}`);
        continue;
      }

      const xml = await response.text();
      const entries = parseAtomXml(xml);

      for (const entry of entries) {
        if (!seenIds.has(entry.id)) {
          seenIds.add(entry.id);
          allEntries.push({ ...entry, topic });
        }
      }
    } catch (error) {
      console.error(`Failed to fetch arXiv query ${query}:`, error);
    }

    // Rate limit: 3 seconds between requests
    await sleep(RATE_LIMIT_MS);
  }

  return allEntries;
}
