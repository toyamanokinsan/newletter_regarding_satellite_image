import { Category, Persona } from "@/types";

const LAMBDA = 0.05; // decay rate for recency score

// Trusted news domains → authority boost
const TRUSTED_DOMAINS: Record<string, number> = {
  // 宇宙・衛星機関
  "nasa.gov": 1.0,
  "esa.int": 1.0,
  "spacenews.com": 1.0,
  // 学術出版・学会
  "ieee.org": 1.0,
  "ieeexplore.ieee.org": 1.0,
  "nature.com": 1.0,
  "science.org": 1.0,
  "sciencedirect.com": 0.95,
  "springer.com": 0.95,
  "mdpi.com": 0.85,
  "tandfonline.com": 0.85,
  "wiley.com": 0.9,
  // CV・画像処理系学会
  "thecvf.com": 1.0,            // CVF (CVPR / ICCV / WACV)
  "neurips.cc": 1.0,            // NeurIPS
  "icml.cc": 1.0,               // ICML
  "iclr.cc": 1.0,               // ICLR
  "aaai.org": 1.0,              // AAAI
  "acm.org": 0.95,              // ACM (SIGGRAPH / MM / SIGKDD)
  "grss-ieee.org": 0.95,        // IEEE GRSS (IGARSS)
  "signalprocessingsociety.org": 0.9, // IEEE SPS (ICIP / ICASSP)
  "spie.org": 0.9,              // SPIE (光学・画像)
  "optica.org": 0.9,            // Optica (旧 OSA)
  "miccai.org": 0.85,           // MICCAI (医用画像)
  "arxiv.org": 0.8,             // arXiv プレプリント
  // リモセン・地理空間専門
  "esri.com": 0.9,
  "remotesensing.org": 0.9,
  "geospatialworld.net": 0.8,
  "gisgeography.com": 0.8,
  "earthobservations.org": 0.9,
  // 衛星企業
  "planet.com": 0.8,
  "maxar.com": 0.8,
  "airbus.com": 0.8,
  // 宇宙ニュース
  "spaceflightnow.com": 0.7,
  "nasaspaceflight.com": 0.7,
};

// Top-tier conferences/journals mentioned in paper abstracts → authority boost
// { keyword (lowercase): boost value added to base score }
const VENUE_KEYWORDS: { pattern: RegExp; boost: number }[] = [
  // Tier 1 — CV/AI トップ会議 (boost +0.25)
  { pattern: /\bcvpr\b/, boost: 0.25 },
  { pattern: /\biccv\b/, boost: 0.25 },
  { pattern: /\beccv\b/, boost: 0.25 },
  { pattern: /\bneurips\b/, boost: 0.25 },
  { pattern: /\bicml\b/, boost: 0.25 },
  { pattern: /\biclr\b/, boost: 0.25 },
  { pattern: /\baaai\b/, boost: 0.25 },
  { pattern: /\bijcai\b/, boost: 0.25 },
  // Tier 1 — 画像処理・信号処理トップ会議 (boost +0.25)
  { pattern: /\bicip\b/, boost: 0.25 },            // IEEE ICIP
  { pattern: /\bicassp\b/, boost: 0.25 },          // IEEE ICASSP
  { pattern: /\bsiggraph\b/, boost: 0.25 },        // ACM SIGGRAPH
  { pattern: /\bmiccai\b/, boost: 0.25 },          // MICCAI (医用画像)
  // Tier 1 — リモセン トップジャーナル (boost +0.25)
  { pattern: /\btgrs\b/, boost: 0.25 },            // IEEE TGRS
  { pattern: /\bremote sensing of environment\b/, boost: 0.25 },
  { pattern: /\bisprs\b/, boost: 0.25 },
  { pattern: /\bjstars\b/, boost: 0.25 },          // IEEE JSTARS
  // Tier 1 — CV/画像処理トップジャーナル (boost +0.25)
  { pattern: /\btpami\b/, boost: 0.25 },           // IEEE TPAMI
  { pattern: /\btip\b/, boost: 0.25 },             // IEEE TIP
  { pattern: /\bijcv\b/, boost: 0.25 },            // IJCV
  // Tier 2 — 有力会議 (boost +0.15)
  { pattern: /\bwacv\b/, boost: 0.15 },
  { pattern: /\bbmvc\b/, boost: 0.15 },
  { pattern: /\bigarss\b/, boost: 0.15 },
  { pattern: /\bacm\s*mm\b/, boost: 0.15 },        // ACM Multimedia
  { pattern: /\baccv\b/, boost: 0.15 },            // ACCV
  { pattern: /\bmm\s*\d{4}\b/, boost: 0.15 },      // MM 2025 等
  { pattern: /\bspie\b/, boost: 0.15 },
  // Tier 2 — 有力ジャーナル (boost +0.15)
  { pattern: /\bgrs[- ]?letters?\b/, boost: 0.15 }, // IEEE GRSL
  { pattern: /\bpattern recognition\b/, boost: 0.15 },
  { pattern: /\bimage and vision computing\b/, boost: 0.15 },
  { pattern: /\bcomputer vision and image understanding\b/, boost: 0.15 },
  { pattern: /\bneural networks\b/, boost: 0.1 },
  { pattern: /\bremote sensing\b/, boost: 0.1 },   // MDPI Remote Sensing
  // 引用数・受賞への言及 (boost +0.2)
  { pattern: /\bhighly cited\b/, boost: 0.2 },
  { pattern: /\bbest paper\b/, boost: 0.2 },
  { pattern: /\boral presentation\b/, boost: 0.15 },
  { pattern: /\bstate[- ]of[- ]the[- ]art\b/, boost: 0.1 },
];

// Persona → preferred categories mapping
const PERSONA_WEIGHTS: Record<Persona, Partial<Record<Category, number>>> = {
  satellite: {
    ChangeDetection: 0.9,
    FoundationModel: 0.8,
    Segmentation: 0.8,
    ObjectDetection: 0.8,
    SuperResolution: 0.7,
    Other: 0.3,
  },
  urban: {
    Segmentation: 1.0,
    ObjectDetection: 0.9,
    ChangeDetection: 0.8,
    FoundationModel: 0.7,
    SuperResolution: 0.5,
    Other: 0.3,
  },
  agriculture: {
    ChangeDetection: 1.0,
    Segmentation: 0.9,
    SuperResolution: 0.6,
    ObjectDetection: 0.5,
    FoundationModel: 0.5,
    Other: 0.3,
  },
  environment: {
    ChangeDetection: 1.0,
    Segmentation: 0.9,
    FoundationModel: 0.6,
    SuperResolution: 0.5,
    ObjectDetection: 0.5,
    Other: 0.3,
  },
  defense: {
    ObjectDetection: 1.0,
    ChangeDetection: 0.9,
    FoundationModel: 0.7,
    Segmentation: 0.6,
    SuperResolution: 0.7,
    Other: 0.2,
  },
  general: {
    FoundationModel: 0.8,
    ObjectDetection: 0.7,
    Segmentation: 0.7,
    ChangeDetection: 0.7,
    SuperResolution: 0.6,
    Other: 0.4,
  },
};

function recencyScore(publishedAt: Date): number {
  const hoursSincePublish =
    (Date.now() - publishedAt.getTime()) / (1000 * 60 * 60);
  return Math.exp(-LAMBDA * hoursSincePublish);
}

function venueBoost(text: string): number {
  const lower = text.toLowerCase();
  let maxBoost = 0;
  for (const { pattern, boost } of VENUE_KEYWORDS) {
    if (pattern.test(lower)) {
      maxBoost = Math.max(maxBoost, boost);
    }
  }
  return maxBoost;
}

function authorityScore(
  isPaper: boolean,
  category: Category,
  source?: string,
  text?: string
): number {
  if (isPaper) {
    // arXiv papers: base score + category bonus + venue bonus
    let base = 0.7;
    if (
      category === "FoundationModel" ||
      category === "ObjectDetection" ||
      category === "Segmentation"
    )
      base += 0.1;

    // Boost if paper mentions a top conference/journal
    if (text) {
      base += venueBoost(text);
    }

    return Math.min(1.0, base);
  }

  // News: check trusted domains
  if (source) {
    for (const [domain, score] of Object.entries(TRUSTED_DOMAINS)) {
      if (source.toLowerCase().includes(domain)) return score;
    }
  }
  return 0.4;
}

function relevanceScore(category: Category, persona: Persona): number {
  const weights = PERSONA_WEIGHTS[persona];
  return weights[category] ?? 0.3;
}

export function calculateScore(params: {
  publishedAt: Date;
  isPaper: boolean;
  category: Category;
  source?: string;
  text?: string;
  persona?: Persona;
  trendingCount?: number;
  categoryAdjustments?: Record<string, number>;
  reliability?: number;
}): number {
  const {
    publishedAt,
    isPaper,
    category,
    source,
    text,
    persona = "general",
    trendingCount = 1,
    categoryAdjustments,
    reliability,
  } = params;

  const recency = recencyScore(publishedAt);
  // Use AI-assessed reliability if available (> 0), otherwise fall back to keyword-based authority
  const authority = reliability && reliability > 0
    ? reliability
    : authorityScore(isPaper, category, source, text);
  let relevance = relevanceScore(category, persona);

  // Apply category adjustment from user ratings
  if (categoryAdjustments && category in categoryAdjustments) {
    relevance = Math.max(0, Math.min(1, relevance + categoryAdjustments[category]));
  }

  const trending = Math.min(1.0, Math.log(trendingCount + 1) / Math.log(10));

  return (
    0.3 * authority + 0.3 * recency + 0.25 * relevance + 0.15 * trending
  );
}
