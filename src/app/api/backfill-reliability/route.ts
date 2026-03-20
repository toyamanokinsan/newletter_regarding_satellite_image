import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import OpenAI from "openai";

let _client: OpenAI | null = null;
function getClient(): OpenAI {
  if (!_client) _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _client;
}

async function assessPaperReliability(
  title: string,
  authors: string[],
  abstract: string
): Promise<{ reliability: number; reliabilityReason: string }> {
  const client = getClient();
  const authorsStr = authors.length > 0 ? `著者: ${authors.slice(0, 10).join(", ")}` : "";

  const prompt = `以下の論文の信頼度を0〜1の数値で判定してください。

タイトル: ${title}
${authorsStr}
アブストラクト: ${abstract.slice(0, 500)}

判定基準:
- 0.9〜1.0: トップ学会(CVPR,NeurIPS,ECCV,ICCV,ICML,ICLR)採択またはGoogle/MIT/Stanford等の著名機関
- 0.7〜0.9: 有名学会(WACV,AAAI,IGARSS等)採択または大手研究機関
- 0.5〜0.7: 査読付きジャーナルまたは中堅機関
- 0.3〜0.5: arXivプレプリント・所属不明
- 0〜0.3: 信頼性に懸念

以下のJSONのみ返してください:
{"reliability": 0.5, "reliabilityReason": "根拠を1〜2文で（日本語）"}`;

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0,
    max_tokens: 200,
    response_format: { type: "json_object" },
  });

  const parsed = JSON.parse(response.choices[0]?.message?.content || "{}");
  return {
    reliability: typeof parsed.reliability === "number" ? Math.max(0, Math.min(1, parsed.reliability)) : 0.4,
    reliabilityReason: parsed.reliabilityReason || "",
  };
}

async function assessNewsReliability(
  title: string,
  source: string,
  content: string
): Promise<{ reliability: number; reliabilityReason: string }> {
  const client = getClient();

  const prompt = `以下のニュース記事の信頼度を0〜1の数値で判定してください。

タイトル: ${title}
ソース: ${source}
本文: ${content.slice(0, 500)}

判定基準:
- 0.9〜1.0: NASA/ESA/IEEE等の公式発表やNature/Science掲載
- 0.7〜0.9: 大手テックメディアや査読付き情報源
- 0.5〜0.7: 一般ニュースメディアやプレスリリース
- 0.3〜0.5: ブログや個人メディア
- 0〜0.3: 信頼性に懸念

以下のJSONのみ返してください:
{"reliability": 0.5, "reliabilityReason": "根拠を1〜2文で（日本語）"}`;

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0,
    max_tokens: 200,
    response_format: { type: "json_object" },
  });

  const parsed = JSON.parse(response.choices[0]?.message?.content || "{}");
  return {
    reliability: typeof parsed.reliability === "number" ? Math.max(0, Math.min(1, parsed.reliability)) : 0.4,
    reliabilityReason: parsed.reliabilityReason || "",
  };
}

export async function POST() {
  const results = { papers: 0, news: 0, errors: [] as string[] };

  const papers = await prisma.paper.findMany({ where: { reliability: 0 } });
  for (const paper of papers) {
    try {
      const authors = JSON.parse(paper.authors) as string[];
      const { reliability, reliabilityReason } = await assessPaperReliability(
        paper.title, authors, paper.abstract
      );
      await prisma.paper.update({
        where: { id: paper.id },
        data: { reliability, reliabilityReason },
      });
      results.papers++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.errors.push(`Paper ${paper.id}: ${msg}`);
    }
  }

  const articles = await prisma.newsArticle.findMany({ where: { reliability: 0 } });
  for (const article of articles) {
    try {
      const { reliability, reliabilityReason } = await assessNewsReliability(
        article.title, article.source, article.content
      );
      await prisma.newsArticle.update({
        where: { id: article.id },
        data: { reliability, reliabilityReason },
      });
      results.news++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.errors.push(`News ${article.id}: ${msg}`);
    }
  }

  return NextResponse.json({
    success: true,
    message: `Updated ${results.papers} papers, ${results.news} news`,
    ...results,
  });
}
