# SPEC — 仕様書

> PLAN.md のアイデアを Claude と壁打ちして固めた仕様をここに記録する。
> 実装前に認識齟齬をなくすためのドキュメント。

---

## 確定済み仕様

### アーキテクチャ

- **フレームワーク**: Next.js 16 (App Router) / React 19 / TypeScript
- **DB**: SQLite (Prisma ORM)
- **AI**: OpenAI GPT-4o-mini（要約生成 / 地名抽出）
- **地図**: Leaflet / React-Leaflet
- **スタイル**: Tailwind CSS v4
- **デプロイ**: Docker (app + collector の 2 コンテナ構成)

### データ収集

- **論文**: arXiv API — 衛星画像・リモセン関連の 5 クエリで新着取得
- **ニュース**: NewsAPI — 地理空間 AI 関連の 4 クエリで英語記事取得
- **スケジュール**: collector コンテナが毎日 NOTIFY_AT（デフォルト 07:00 JST）に実行
- **手動実行**: UI の「最新データを取得」ボタン or `POST /api/collect`

### スコアリング（0〜1）

```
最終スコア = 0.30 × 権威性 + 0.30 × 新鮮度 + 0.25 × 関連度 + 0.15 × トレンド
```

- **権威性**: 論文は基本 0.7 + カテゴリ補正 + 学会/ジャーナル補正。ニュースは信頼ドメインで 0.4〜1.0
- **新鮮度**: 指数減衰 `e^(-0.05 × 経過時間h)`
- **関連度**: ペルソナ × カテゴリの重み + CategoryWeight（ユーザー評価フィードバック）
- **トレンド**: `log(類似記事数 + 1) / log(10)`

### 記事評価（Rating）

- 各記事に 👍(+1) / 👎(-1) の評価
- カテゴリ単位で `adjustment = 0.3 × (up - down) / (up + down)` を算出
- 次回収集時のスコアリングの関連度に加算（-0.3〜+0.3）

### DB モデル

| モデル | 概要 |
|---|---|
| Paper | arXiv 論文（ID, スコア, 要約, 位置, 評価） |
| NewsArticle | ニュース記事（URL hash, スコア, 要約, 位置, 評価） |
| Rating | 評価記録（1 記事 1 評価） |
| CategoryWeight | カテゴリ別の重み補正値 |
| UserPreferences | ペルソナ / カテゴリ / 通知時刻 |

---

## 今回の変更仕様（PLAN.md 2026-03-05 分）

### 変更 1: 論文要約の拡充

**現状**: 6 項目（objective / novelty / method / results / limitations / metrics）
**変更後**: novelty を拡充して従来手法との対比を含める + method をアーキテクチャ寄りに

| 項目 | 内容 | 分量 |
|---|---|---|
| `objective` | 研究が解決する具体的な課題と目的 | 2〜3 文 |
| `novelty` | 新規性。従来手法（先行研究名）と比べて何が新しいか、どこが違うか | 3〜4 文 |
| `method` | モデルのアーキテクチャ。ネットワーク構成、主要モジュール、学習戦略 | 2〜3 文 |
| `results` | ベンチマーク名・数値を含む実験結果。従来手法との比較 | 2〜3 文 |
| `limitations` | 制限事項・今後の課題 | 1〜2 文 |
| `metrics` | 評価指標をカンマ区切り | 1 行 |

**変更箇所**: `src/lib/openai.ts` の `summarizePaper()` プロンプト

### 変更 2: ニュース要約の構造化

**現状**: 自由文 200〜300 字
**変更後**: 論文と同様の構造化 JSON に変更

| 項目 | 内容 | 分量 |
|---|---|---|
| `summary` | 何が起きたか・何が発表されたか（結論ファースト） | 2〜3 文 |
| `novelty` | 従来と比べて何が新しいか・なぜ重要か | 2〜3 文 |
| `application` | どのように使えそうか。実用面での応用先・インパクト | 2〜3 文 |

**変更箇所**:
- `src/types/index.ts` — `NewsSummary` 型を追加。`NewsArticle.summaryText` を `summaryJson` に変更
- `src/lib/openai.ts` — `summarizeNews()` の戻り値を構造化 JSON に
- `src/components/detail/NewsDetail.tsx` — 項目カード表示に変更
- `src/components/feed/FeedCard.tsx` — プレビュー表示を `summary + novelty` に
- `src/components/feed/DailyDigest.tsx` — 同上
- DB: `NewsArticle.summaryText` → `summaryJson`（既存データとの互換性を保つため両フィールド共存）
- API: `src/app/api/news/route.ts`, `src/app/api/news/[id]/route.ts`, `src/app/api/summarize/route.ts`

### 変更 3: 検索クエリの拡充（光学衛星・SAR の優先）

**現状の論文クエリ（5 本）**: リモセン + deep learning 中心
**追加クエリ**: SAR、光学衛星をカバー

```
# 追加
"all:SAR+image+deep+learning"
"all:synthetic+aperture+radar+detection"
"all:optical+satellite+image+deep+learning"
```

**現状のニュースクエリ（4 本）**:
**追加クエリ**:

```
# 追加
"SAR satellite radar imagery"
"optical satellite image analysis"
```

**変更箇所**: `src/lib/arxiv.ts`, `src/lib/newsapi.ts` の `QUERIES` 配列

### 変更 4: UI の設定ページからジャンル選択を削除

**現状**: 設定ページでペルソナ・優先カテゴリ・通知時刻を変更可能
**変更**: ジャンルは固定（画像処理関連）なので、設定ページの「優先カテゴリ」セクションは不要
→ **対応しない**（現状のカテゴリフィルタは表示の絞り込み用であり、収集ジャンルの変更ではないため問題なし）

---

## 実装しない（現状維持）

- 収集ジャンルの UI 変更 → 画像処理関連に固定のため不要
- 手動更新ボタン → **実装済み**（フィード画面上部の「最新データを取得」ボタン）
- 毎朝 7 時の定期更新 → **実装済み**（collector コンテナ、NOTIFY_AT=07:00）
- 学会・引用数による優先 → **実装済み**（VENUE_KEYWORDS + TRUSTED_DOMAINS）

---

## 今回の変更仕様（PLAN.md 2026-03-08 分）

### 変更 5: トップページを3カテゴリ構成にリニューアル

**現状**: トップページ（`/`）に DailyDigest（上位3論文+3ニュース）+ 全記事フィード一覧
**変更後**: トップページを3カテゴリ × (論文3件 + ニュース3件) のキュレーション画面に。既存フィード一覧は `/feed` に移動

#### カテゴリ定義

| カテゴリ ID | 表示名 | 概要 |
|---|---|---|
| `satellite` | 衛星関連 | 衛星画像・SAR・光学衛星・リモートセンシング |
| `vision` | 画像認識関連 | コンピュータビジョン・物体検出・セグメンテーション全般 |
| `productivity` | 業務改善関連 | AI/LLM による業務効率化・コード生成・DevOps・ソフトウェアエンジニアリング生産性向上 |

#### 収集クエリの追加

**arXiv 追加クエリ**:

```
# 画像認識関連
"all:image+recognition+deep+learning"
"all:computer+vision+transformer"
"all:object+detection+neural+network"

# 業務改善関連
"all:LLM+code+generation"
"all:AI+workflow+automation"
"all:software+engineering+machine+learning"
```

**NewsAPI 追加クエリ**:

```
# 画像認識関連
"computer vision AI deep learning"
"image recognition neural network"

# 業務改善関連
"AI business automation tools"
"LLM developer productivity"
"DevOps AI automation"
```

#### トップページ UI 仕様

- 3カテゴリをセクション（タブ or アコーディオン）で表示
- 各セクション内に **論文3件**（スコア上位）+ **ニュース3件**（スコア上位）
- 各記事カードに表示する情報:
  - タイトル
  - **発表日**（年月日） ← 既存フィールド `publishedAt` を表示
  - **要約全文**（構造化要約をカード内で全文展開表示）
  - **おすすめ理由** ← **新規フィールド** `recommendationReason`（AI生成、1〜2文）
  - **👍👎 ボタン**（既存の Rating システムを流用）
  - スコアバー
- カテゴリごとの「もっと見る」リンク → `/feed?topic=satellite` 等

#### フォールバック（過去の有名論文/ニュース）

- **発動条件**: あるカテゴリで **当日の収集が0件** or **全記事のスコアが0.4以下**
- **動作**: arXiv で survey/review/benchmark 系のクエリで補完検索
  - `"all:survey+{カテゴリキーワード}"`, `"all:benchmark+{カテゴリキーワード}"` 等
  - 取得した論文は通常通り要約・スコアリングして DB 保存
  - `isFallback: true` フラグで通常記事と区別

#### DB 変更

| モデル | フィールド | 型 | 説明 |
|---|---|---|---|
| Paper | `topic` | String @default("satellite") | カテゴリ分類（satellite / vision / productivity） |
| Paper | `recommendationReason` | String? | AI生成のおすすめ理由 |
| Paper | `isFallback` | Boolean @default(false) | フォールバック記事フラグ |
| NewsArticle | `topic` | String @default("satellite") | カテゴリ分類 |
| NewsArticle | `recommendationReason` | String? | AI生成のおすすめ理由 |
| NewsArticle | `isFallback` | Boolean @default(false) | フォールバック記事フラグ |

※ 既存の `category` フィールド（ObjectDetection 等の技術カテゴリ）とは別に、`topic` として収集ジャンルを管理

#### AI 要約の変更

`summarizePaper()` / `summarizeNews()` に以下を追加:
- **`recommendationReason`**: 「この論文/ニュースをおすすめする理由」を1〜2文で生成
  - 例: 「SAR画像の物体検出で従来手法を大幅に上回る精度を達成した注目論文」
  - 例: 「Google が発表した新しいコード生成AIで、開発者の生産性が40%向上したという報告」

#### ルーティング変更

| パス | 内容 | 変更 |
|---|---|---|
| `/` | 新トップページ（3カテゴリ × 6件） | **新規作成** |
| `/feed` | 全記事一覧（現 `/` の内容を移動） | **新規ページ**（既存コンポーネント流用） |
| `/papers`, `/news`, etc. | 既存ページ | 変更なし |

#### 変更対象ファイル

**新規作成**:
- `src/app/feed/page.tsx` — 既存トップページの内容を移動
- `src/components/home/TopPage.tsx` — 新トップページコンポーネント
- `src/components/home/CategorySection.tsx` — カテゴリセクション
- `src/components/home/TopArticleCard.tsx` — トップページ用記事カード（要約全文表示）

**変更**:
- `prisma/schema.prisma` — topic, recommendationReason, isFallback 追加
- `src/types/index.ts` — Topic 型追加、PaperSummary/NewsSummary に recommendationReason 追加
- `src/lib/openai.ts` — recommendationReason 生成プロンプト追加
- `src/lib/arxiv.ts` — 画像認識・業務改善クエリ追加 + topic 分類ロジック
- `src/lib/newsapi.ts` — 同上
- `src/app/page.tsx` — 新トップページに差し替え
- `src/app/api/collect/route.ts` — topic 分類 + フォールバックロジック
- `src/app/api/papers/route.ts` — topic フィルタ対応
- `src/app/api/news/route.ts` — topic フィルタ対応
- `src/components/layout/BottomNav.tsx` — フィード一覧へのリンク追加

---

## 今回の変更仕様（PLAN.md 2026-03-13 分）

### 変更 6: トップページに直近日数フィルタ（コンテンツ鮮度の確保）

**問題**: トップページが `score desc` で全期間から取得するため、古い高スコア記事が固定表示される
**対策**: トップページ API に日付フィルタを追加し、直近の記事を優先表示

#### ロジック

1. まず **直近3日以内** に `createdAt` がある記事からスコア上位3件を取得
2. 3件に満たない場合、**7日以内** → **30日以内** → **全期間** と段階的に拡大
3. 各段階で取得済みの記事は除外して追加取得

**変更箇所**:
- `src/app/api/papers/route.ts` — `recent=true` パラメータ追加時に段階的日付フィルタ
- `src/app/api/news/route.ts` — 同上
- `src/app/page.tsx` — API 呼び出しに `recent=true` を追加

### 変更 7: ニュースのソース多様性確保

**問題**: Nature.com の権威性スコアが 1.0 で、ニュースが Nature ばかりになる
**対策**: トップ表示時に同一ソースは最大1件に制限

#### ロジック

- API から取得する件数を多めに取り（例: 10件）、アプリ側で同一ソースを最大1件にフィルタして上位3件を返す
- 権威性スコア自体は変更しない（Nature の信頼性は正当）
- フィルタは API レイヤーで実施（`diverse=true` パラメータ）

**変更箇所**:
- `src/app/api/news/route.ts` — `diverse=true` パラメータ追加、ソース多様性フィルタロジック
- `src/app/page.tsx` — API 呼び出しに `diverse=true` を追加

### 変更 8: arXiv 取得数の増加とクエリローテーション

**問題**: `maxResults=10` × 14クエリだが重複排除後の実質取得数が少なく、同じ論文ばかり表示される
**対策**:

1. `maxResults` を 10 → 20 に増加
2. arXiv のソート順を一部 `relevance` に変更（日付順だけだと同じ論文セットになる）
3. 毎回の収集で全14クエリではなくランダムにサブセット（10クエリ）を選択して実行

#### ロジック

- `fetchArxivPapers()` に `querySubsetSize` パラメータ追加（デフォルト10）
- クエリ配列をシャッフルして先頭N件だけ実行
- 偶数番目のクエリは `sortBy=relevance`、奇数番目は `sortBy=submittedDate` で検索

**変更箇所**:
- `src/lib/arxiv.ts` — `maxResults` 変更、クエリシャッフル、ソート順ローテーション
- `src/app/api/collect/route.ts` — `fetchArxivPapers(20)` に変更

### 変更 9: Bad 評価記事の非表示

**問題**: 👎 を押した記事が翌日以降もトップページに表示される
**対策**: `rating = -1` の記事をトップページの取得対象から除外

#### ロジック

- papers/news API の `recent=true` 時に `rating: { not: -1 }` を WHERE 条件に追加
- `/feed` 一覧ページでは引き続き全記事表示（フィルタなし）

**変更箇所**:
- `src/app/api/papers/route.ts` — `recent=true` 時に rating != -1 フィルタ
- `src/app/api/news/route.ts` — 同上

### 変更 10: GPT-4o-mini による topic 分類バリデーション

**問題**: topic はクエリに紐づけているだけで、取得した記事の中身がそのトピックに本当に関連しているか検証していない。結果、無関係な記事が各カテゴリに混入する。
**対策**: 収集時に GPT-4o-mini で記事のタイトル+本文を分類し、3 topic のいずれにも該当しない記事は DB に保存しない

#### ロジック

1. 記事を取得後、要約 API 呼び出しの前に `classifyTopic()` を呼ぶ
2. GPT-4o-mini にタイトル+本文（先頭500文字）を渡し、`satellite` / `vision` / `productivity` / `none` を返させる
3. `none` の場合は DB に保存せずスキップ
4. クエリ由来の topic と AI 分類が異なる場合は **AI 分類を優先**
5. バッチ処理でコスト削減: 複数記事をまとめて1回の API コールで分類（最大10件）

**変更箇所**:
- `src/lib/openai.ts` — `classifyTopics()` 関数を追加
- `src/app/api/collect/route.ts` — 要約前に分類を実行、none はスキップ、topic を上書き

---

## 今回の変更仕様（PLAN.md 2026-03-14 分）

### 変更 11: 論文の信頼度（reliability）を AI 判定・数値表示

**問題**: 現在の `authorityScore` はアブストラクト中の学会名キーワードマッチで算出しているが、arXiv 論文のアブストラクトに学会名が書かれていないケースが多く、所属機関も考慮されていない。ユーザーに信頼度が見えない。
**対策**: GPT-4o-mini で論文のタイトル・著者・アブストラクトから信頼度を 0〜1 で判定し、DB に保存・UI に表示。既存の `authorityScore` をこの AI 信頼度で置き換える。

#### DB 変更

| モデル | フィールド | 型 | 説明 |
|---|---|---|---|
| Paper | `reliability` | Float @default(0) | AI判定の信頼度（0〜1） |
| Paper | `reliabilityReason` | String? | 信頼度の根拠（1〜2文） |
| NewsArticle | `reliability` | Float @default(0) | AI判定の信頼度（0〜1） |
| NewsArticle | `reliabilityReason` | String? | 信頼度の根拠（1〜2文） |

#### AI 判定ロジック（`assessReliability()` 関数）

要約生成時に GPT-4o-mini へ以下を渡す:
- タイトル、著者リスト、アブストラクト

判定基準:
- **0.9〜1.0**: トップ学会（CVPR, NeurIPS, ECCV, ICCV, ICML, ICLR）採択 or Google/MIT/Stanford 等の著名機関
- **0.7〜0.9**: 有名学会（WACV, AAAI, IGARSS 等）採択 or 大手研究機関所属
- **0.5〜0.7**: 査読付きジャーナル掲載 or 中堅機関
- **0.3〜0.5**: arXiv プレプリント、所属不明
- **0〜0.3**: 信頼性に懸念がある

返却形式:
```json
{
  "reliability": 0.85,
  "reliabilityReason": "CVPR 2025 採択論文。Google Research と MIT の共著。"
}
```

#### AI 判定（ニュース）

`summarizeNews()` にも信頼度判定を追加:
- ソース（発行元）、引用されている研究機関、記事の具体性で判定
- **0.9〜1.0**: NASA/ESA/IEEE 等の公式発表、Nature/Science 掲載
- **0.7〜0.9**: 大手テックメディア（TechCrunch, Ars Technica 等）、査読付き情報源
- **0.5〜0.7**: 一般ニュースメディア、プレスリリース
- **0.3〜0.5**: ブログ、個人メディア
- **0〜0.3**: 信頼性に懸念

#### スコアリング変更

- `scoring.ts` の `authorityScore()` を変更
- 論文・ニュース共通: DB の `reliability` フィールドをそのまま権威性スコアとして使用（0〜1）
- `reliability` が 0（未判定、既存データ）の場合は従来ロジックにフォールバック

#### UI 表示

- 論文カードに「信頼度: 0.85（CVPR 2025 採択、Google Research 所属）」を表示
- ニュースカードに「信頼度: 0.90（NASA公式発表に基づく報道）」を表示
- `TopArticleCard.tsx`, `PaperDetail.tsx`, `NewsDetail.tsx` に信頼度セクション追加

#### フォールバック時の優先

- `recent=true` の段階的フィルタで件数不足のとき、`reliability desc` でソートして信頼度の高い過去記事を優先取得

#### 変更対象ファイル

**変更**:
- `prisma/schema.prisma` — Paper, NewsArticle に `reliability`, `reliabilityReason` 追加
- `src/types/index.ts` — PaperSummary/NewsSummary に reliability 関連フィールド追加
- `src/lib/openai.ts` — `summarizePaper()`, `summarizeNews()` のプロンプトに信頼度判定を追加
- `src/lib/scoring.ts` — `authorityScore()` を `reliability` フィールドで置き換え（0 の場合は従来ロジックにフォールバック）
- `src/app/api/collect/route.ts` — reliability を DB 保存
- `src/app/api/papers/route.ts` — フォールバック時に reliability desc ソート
- `src/app/api/news/route.ts` — フォールバック時に reliability desc ソート
- `src/components/home/TopArticleCard.tsx` — 信頼度表示追加
- `src/components/detail/PaperDetail.tsx` — 信頼度表示追加
- `src/components/detail/NewsDetail.tsx` — 信頼度表示追加

---

## 今回の変更仕様（PLAN.md 2026-03-14 分 その2）

### 変更 12: ブックマーク機能の強化（ホームボタン追加 + 一覧ページ）

**現状**: ブックマークボタンは詳細ページ（PaperDetail/NewsDetail）にのみ存在。一覧ページなし。`bookmarkedAt` がないためブックマーク日時でソートできない。
**変更**: ホーム画面のカードにブックマークボタンを追加 + `/bookmarks` 一覧ページを新規作成

#### DB 変更

| モデル | フィールド | 型 | 説明 |
|---|---|---|---|
| Paper | `bookmarkedAt` | DateTime? | ブックマークした日時 |
| NewsArticle | `bookmarkedAt` | DateTime? | ブックマークした日時 |

#### API 変更

- `PATCH /api/papers`, `PATCH /api/news` — `bookmarked: true` 時に `bookmarkedAt: new Date()` をセット、`false` 時に `null`
- `GET /api/papers?bookmarked=true`, `GET /api/news?bookmarked=true` — `bookmarkedAt desc` でソート

#### UI 変更

- `TopArticleCard.tsx` — ブックマークボタン追加（既存の 👍👎 ボタンの隣）
- `/bookmarks/page.tsx` — 新規作成。論文+ニュースを `bookmarkedAt desc` で混合表示。日付ごとにグループ化
- `BottomNav.tsx` — ブックマーク一覧へのリンク追加

#### 変更対象ファイル

**新規作成**:
- `src/app/bookmarks/page.tsx` — ブックマーク一覧ページ

**変更**:
- `prisma/schema.prisma` — bookmarkedAt 追加
- `src/types/index.ts` — bookmarkedAt フィールド追加
- `src/components/home/TopArticleCard.tsx` — ブックマークボタン追加
- `src/app/api/papers/route.ts` — PATCH に bookmarkedAt 処理、GET に bookmarkedAt ソート
- `src/app/api/news/route.ts` — 同上
- `src/components/layout/BottomNav.tsx` — ブックマークリンク追加

---

## 今回の変更仕様（PLAN.md 2026-03-15 分）

### 変更 13: 記事へのメモ機能

**概要**: 全記事（ブックマーク有無問わず）にユーザーが任意のメモを追加・編集・削除できる機能

#### DB 変更

| モデル | フィールド | 型 | 説明 |
|---|---|---|---|
| Paper | `memo` | String? | ユーザーメモ |
| NewsArticle | `memo` | String? | ユーザーメモ |

#### API 変更

- `PATCH /api/papers` — `memo` パラメータ対応
- `PATCH /api/news` — `memo` パラメータ対応

#### UI 変更

- `TopArticleCard.tsx` — メモアイコンボタン追加。タップでインライン入力欄を展開、保存/削除可能。メモがある場合はカード内に表示
- `PaperDetail.tsx` / `NewsDetail.tsx` — メモ入力・編集欄を表示
- ブックマーク一覧でもメモが表示される（TopArticleCard を流用）

#### 変更対象ファイル

**変更**:
- `prisma/schema.prisma` — Paper, NewsArticle に memo 追加
- `src/types/index.ts` — memo フィールド追加
- `src/app/api/papers/route.ts` — PATCH に memo 対応、formatPaper に memo 追加
- `src/app/api/news/route.ts` — 同上
- `src/app/api/papers/[id]/route.ts` — formatに memo 追加
- `src/app/api/news/[id]/route.ts` — 同上
- `src/components/home/TopArticleCard.tsx` — メモボタン+インライン入力
- `src/components/home/CategorySection.tsx` — onMemo ハンドラ追加
- `src/app/page.tsx` — handleMemo ハンドラ追加
- `src/app/bookmarks/page.tsx` — handleMemo ハンドラ追加
- `src/components/detail/PaperDetail.tsx` — メモ入力欄追加
- `src/components/detail/NewsDetail.tsx` — メモ入力欄追加

---

## 検討中・未確定

-
