import OpenAI from "openai";
import { PaperSummary, Topic } from "@/types";

export interface SummaryWithReason<T> {
  summary: T;
  recommendationReason: string;
  reliability: number;
  reliabilityReason: string;
}

let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!_client) {
    _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _client;
}

export async function summarizePaper(
  title: string,
  abstract: string,
  authors?: string[]
): Promise<SummaryWithReason<PaperSummary> | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn("OPENAI_API_KEY not set, skipping paper summarization");
    return null;
  }

  const client = getClient();

  const authorsStr = authors && authors.length > 0 ? `著者: ${authors.slice(0, 10).join(", ")}` : "";

  const prompt = `あなたは衛星画像・リモートセンシングAI研究の専門家です。
以下の論文を分析し、日本語で構造化サマリーをJSON形式で出力してください。
専門家が読んで内容を把握できる程度に具体的に書いてください。

タイトル: ${title}
${authorsStr}
アブストラクト: ${abstract}

以下の9項目を含む有効なJSONオブジェクトのみ返してください：
{
  "objective": "研究が解決しようとしている具体的な課題と目的を2〜3文で。既存手法のどのような問題を解決するのかを含める（日本語）",
  "novelty": "この研究の新規性を3〜4文で。先行研究（手法名や著者名があれば明記）が抱えていた課題を述べ、それに対して本研究がどのような新しいアプローチ・着眼点で解決しているかを具体的に対比して説明する（日本語）",
  "method": "提案手法のアーキテクチャを2〜3文で。ネットワーク構成（Backbone、Encoder-Decoder構造、Attention機構など）、主要モジュール名、損失関数や学習戦略を具体的に（日本語）",
  "results": "主要な実験結果と性能を2〜3文で。ベンチマークデータセット名、既存手法との比較数値（精度差）を含める（日本語）",
  "limitations": "制限事項や今後の課題を1〜2文で（日本語）",
  "metrics": "使用された評価指標をカンマ区切りで（例：mAP, IoU, SSIM, PSNR, F1-score）",
  "recommendationReason": "この論文をおすすめする理由を1〜2文で。エンジニアにとってどのような点が注目に値するか（日本語）",
  "reliability": "この論文の信頼度を0〜1の数値で。判定基準: 0.9〜1.0=トップ学会(CVPR,NeurIPS,ECCV,ICCV,ICML,ICLR)採択またはGoogle/MIT/Stanford等の著名機関, 0.7〜0.9=有名学会(WACV,AAAI,IGARSS等)採択または大手研究機関, 0.5〜0.7=査読付きジャーナルまたは中堅機関, 0.3〜0.5=arXivプレプリント・所属不明, 0〜0.3=信頼性に懸念。著者の所属機関、学会採択の有無、ベンチマーク評価の充実度を総合的に判断すること",
  "reliabilityReason": "信頼度スコアの根拠を1〜2文で。学会名、所属機関名、評価の充実度など判断材料を具体的に記述（日本語）"
}`;

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 1000,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content);
    const { recommendationReason, reliability, reliabilityReason, ...summaryFields } = parsed;
    return {
      summary: summaryFields as PaperSummary,
      recommendationReason: recommendationReason || "",
      reliability: typeof reliability === "number" ? Math.max(0, Math.min(1, reliability)) : 0,
      reliabilityReason: reliabilityReason || "",
    };
  } catch (error) {
    console.error("Failed to summarize paper:", error);
    return null;
  }
}

export interface NewsSummaryResult {
  summary: string;
  novelty: string;
  application: string;
}

export async function summarizeNews(
  title: string,
  content: string
): Promise<SummaryWithReason<NewsSummaryResult> | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn("OPENAI_API_KEY not set, skipping news summarization");
    return null;
  }

  const client = getClient();

  const prompt = `あなたは衛星画像・地理空間AI・ソフトウェアエンジニアリングの専門家です。
以下のニュース記事を分析し、日本語で構造化サマリーをJSON形式で出力してください。
専門家が読んで内容を把握できる程度に具体的に書いてください。

タイトル: ${title}
本文: ${content.slice(0, 1500)}

以下の6項目を含む有効なJSONオブジェクトのみ返してください：
{
  "summary": "何が起きたか・何が発表されたかを2〜3文で。結論ファーストで、具体的な製品名・組織名・数値があれば含める（日本語）",
  "novelty": "従来と比べて何が新しいか・なぜ重要かを2〜3文で。既存の技術や製品との違い、業界にとっての意義を具体的に（日本語）",
  "application": "どのように使えそうかを2〜3文で。想定される応用先（農業、防災、都市計画、防衛など）、実用面でのインパクト、導入メリットを具体的に（日本語）",
  "recommendationReason": "このニュースをおすすめする理由を1〜2文で。エンジニアにとってどのような点が注目に値するか（日本語）",
  "reliability": "この記事の信頼度を0〜1の数値で。判定基準: 0.9〜1.0=NASA/ESA/IEEE等の公式発表やNature/Science掲載, 0.7〜0.9=大手テックメディア(TechCrunch等)や査読付き情報源, 0.5〜0.7=一般ニュースメディアやプレスリリース, 0.3〜0.5=ブログや個人メディア, 0〜0.3=信頼性に懸念。ソースの権威性、引用されている研究機関、記事の具体性を総合判断すること",
  "reliabilityReason": "信頼度スコアの根拠を1〜2文で。ソース名、引用機関、記事の具体性など判断材料を記述（日本語）"
}`;

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 800,
      response_format: { type: "json_object" },
    });

    const result = response.choices[0]?.message?.content;
    if (!result) return null;
    const parsed = JSON.parse(result);
    const { recommendationReason, reliability, reliabilityReason, ...summaryFields } = parsed;
    return {
      summary: summaryFields as NewsSummaryResult,
      recommendationReason: recommendationReason || "",
      reliability: typeof reliability === "number" ? Math.max(0, Math.min(1, reliability)) : 0,
      reliabilityReason: reliabilityReason || "",
    };
  } catch (error) {
    console.error("Failed to summarize news:", error);
    return null;
  }
}

export type TopicClassification = Topic | "none";

export interface ClassifyItem {
  id: string;
  title: string;
  text: string;
}

/**
 * Classify multiple articles into topics using GPT-4o-mini in a single batch call.
 * Returns a map of id -> classified topic (or "none" if irrelevant).
 */
export async function classifyTopics(
  items: ClassifyItem[]
): Promise<Record<string, TopicClassification>> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    // If no API key, keep original topics
    return {};
  }

  if (items.length === 0) return {};

  const client = getClient();
  const results: Record<string, TopicClassification> = {};

  // Process in batches of 10
  for (let i = 0; i < items.length; i += 10) {
    const batch = items.slice(i, i + 10);

    const itemList = batch
      .map(
        (item, idx) =>
          `[${idx}] id="${item.id}" title="${item.title}" text="${item.text.slice(0, 300)}"`
      )
      .join("\n");

    const prompt = `あなたは論文・ニュース記事の分類器です。以下の記事をそれぞれ分類してください。

カテゴリ:
- "satellite": 衛星画像、SAR、光学衛星、リモートセンシング、地球観測、航空画像に関する記事
- "vision": コンピュータビジョン、画像認識、物体検出、セグメンテーション、画像処理に関する記事（衛星以外の一般的な画像処理）
- "productivity": LLM、コード生成、AI業務効率化、DevOps、ソフトウェアエンジニアリングの生産性向上に関する記事
- "none": 上記のいずれにも該当しない記事（医療、金融、自然言語処理のみ、ロボティクスのみ、など）

判定基準:
- 記事の主題が上記カテゴリのいずれかに明確に該当する場合のみ分類する
- 記事がAI/ML全般の話題で特定カテゴリに属さない場合は "none"
- 衛星+画像処理の記事は "satellite" を優先

記事一覧:
${itemList}

以下の形式で有効なJSONオブジェクトのみ返してください:
{
  "classifications": [
    {"id": "記事ID", "topic": "satellite|vision|productivity|none"}
  ]
}`;

    try {
      const response = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0,
        max_tokens: 500,
        response_format: { type: "json_object" },
      });

      const content = response.choices[0]?.message?.content;
      if (content) {
        const parsed = JSON.parse(content);
        for (const item of parsed.classifications || []) {
          if (["satellite", "vision", "productivity", "none"].includes(item.topic)) {
            results[item.id] = item.topic as TopicClassification;
          }
        }
      }
    } catch (error) {
      console.error("Failed to classify topics:", error);
      // On error, skip classification for this batch (keep original topics)
    }
  }

  return results;
}

export async function extractPlaceName(
  text: string
): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const client = getClient();

  const prompt = `Extract the most prominent geographic location mentioned in this text.
Return ONLY the location name (city, region, or country), or null if no specific location is mentioned.
Do not return general terms like "urban area" or "agricultural field".

Text: ${text.slice(0, 500)}

Respond with just the location name or the word "null".`;

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0,
      max_tokens: 50,
    });

    const result = response.choices[0]?.message?.content?.trim();
    if (!result || result.toLowerCase() === "null") return null;
    return result;
  } catch (error) {
    console.error("Failed to extract place name:", error);
    return null;
  }
}

export async function getEmbedding(text: string): Promise<number[] | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const client = getClient();

  try {
    const response = await client.embeddings.create({
      model: "text-embedding-3-small",
      input: text.slice(0, 8000),
    });

    return response.data[0]?.embedding || null;
  } catch (error) {
    console.error("Failed to get embedding:", error);
    return null;
  }
}
