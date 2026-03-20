export type Category =
  | "ObjectDetection"
  | "Segmentation"
  | "ChangeDetection"
  | "SuperResolution"
  | "FoundationModel"
  | "Other";

export type Topic = "satellite" | "vision" | "productivity";

export type Persona =
  | "satellite"
  | "urban"
  | "agriculture"
  | "environment"
  | "defense"
  | "general";

export interface Paper {
  id: string;
  title: string;
  abstract: string;
  authors: string[];
  publishedAt: string;
  pdfUrl: string;
  category: Category;
  topic: Topic;
  summaryJson?: PaperSummary;
  recommendationReason?: string;
  reliability: number;
  reliabilityReason?: string;
  score: number;
  lat?: number;
  lng?: number;
  bookmarked: boolean;
  bookmarkedAt?: string;
  memo?: string;
  rating: number;
  isFallback: boolean;
  createdAt: string;
}

export interface PaperSummary {
  objective: string;
  novelty: string;
  method: string;
  results: string;
  limitations: string;
  metrics: string;
}

export interface NewsSummary {
  summary: string;
  novelty: string;
  application: string;
}

export interface NewsArticle {
  id: string;
  title: string;
  content: string;
  source: string;
  url: string;
  publishedAt: string;
  category: Category;
  topic: Topic;
  summaryText?: string;
  summaryJson?: NewsSummary;
  recommendationReason?: string;
  reliability: number;
  reliabilityReason?: string;
  score: number;
  lat?: number;
  lng?: number;
  bookmarked: boolean;
  bookmarkedAt?: string;
  memo?: string;
  rating: number;
  isFallback: boolean;
  createdAt: string;
}

export interface UserPreferences {
  id: string;
  persona: Persona;
  categories: Category[];
  notifyAt: string;
}

export interface ArxivEntry {
  id: string;
  title: string;
  abstract: string;
  authors: string[];
  publishedAt: string;
  pdfUrl: string;
  categories: string[];
}

export interface FeedItem {
  type: "paper" | "news";
  data: Paper | NewsArticle;
}

export interface MapMarker {
  lat: number;
  lng: number;
  title: string;
  type: "paper" | "news";
  id: string;
  category: Category;
}
