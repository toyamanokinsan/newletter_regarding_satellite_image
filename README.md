# My News Letter

arXiv の研究論文や NewsAPI のニュース記事を収集し、OpenAI で要約・スコアリングして表示するニュースアグリゲーションアプリです。Leaflet による地図上での地理的可視化にも対応しています。

## 技術スタック

- Next.js 16 / React 19 / TypeScript
- Prisma (SQLite)
- OpenAI API (GPT-4o)
- Leaflet / React-Leaflet
- Tailwind CSS v4
- Docker

## セットアップ

### 環境変数

`.env.example` を `.env` にコピーして値を設定してください。

```bash
cp .env.example .env
```

| 変数名 | 説明 |
|---|---|
| `DATABASE_URL` | SQLite のパス（例: `file:./dev.db`） |
| `OPENAI_API_KEY` | OpenAI API キー |
| `NEWS_API_KEY` | NewsAPI キー |
| `CRON_SECRET` | 収集 API の Bearer トークン（任意） |

### ローカル開発

```bash
npm install
npm run db:generate   # Prisma Client 生成
npm run db:push       # スキーマ適用
npm run dev           # http://localhost:3000
```

### Docker

```bash
docker-compose up -d
```

- **app**: Next.js アプリ（ポート 3000）
- **collector**: 毎日定時にデータ収集を実行する cron コンテナ（`NOTIFY_AT` で時刻指定、デフォルト 07:00 JST）

### データ収集（手動）

```bash
npm run collect
```

## 主な npm スクリプト

| コマンド | 説明 |
|---|---|
| `npm run dev` | 開発サーバー起動 |
| `npm run build` | プロダクションビルド |
| `npm run start` | プロダクションサーバー起動 |
| `npm run db:push` | Prisma スキーマを DB に適用 |
| `npm run db:generate` | Prisma Client 生成 |
| `npm run db:studio` | Prisma Studio 起動 |
| `npm run collect` | データ収集 API を実行 |

## 主な API エンドポイント

| メソッド | パス | 説明 |
|---|---|---|
| POST | `/api/collect` | データ収集（論文 + ニュース） |
| GET | `/api/papers` | 論文一覧（ページネーション） |
| GET | `/api/news` | ニュース一覧（ページネーション） |
| GET | `/api/map` | 地図用の位置情報付きデータ |
| POST | `/api/summarize` | AI 要約生成 |
| POST | `/api/ratings` | 記事評価（👍/👎） |
| POST | `/api/preferences` | ユーザー設定更新 |

## ソースコード見取り図

```
my_news_letter/
├── prisma/
│   └── schema.prisma            # DB スキーマ定義
│
├── docker/
│   ├── entrypoint.sh            # コンテナ起動スクリプト (db push → next start)
│   └── cron.sh                  # 定時データ収集スクリプト
│
├── src/
│   ├── types/
│   │   └── index.ts             # 全共通型定義 (Paper, NewsArticle, Category, Persona 等)
│   │
│   ├── lib/                     # ── ビジネスロジック層 ──
│   │   ├── db.ts                # Prisma クライアント初期化
│   │   ├── arxiv.ts             # arXiv API から論文取得
│   │   ├── newsapi.ts           # NewsAPI からニュース取得
│   │   ├── openai.ts            # GPT-4o-mini (要約生成 / 地名抽出)
│   │   ├── scoring.ts           # スコアリングアルゴリズム (権威性 / 新鮮度 / 関連度 / トレンド)
│   │   └── geocoding.ts         # 地名 → 緯度経度変換
│   │
│   ├── app/                     # ── Next.js App Router ──
│   │   ├── layout.tsx           # ルートレイアウト (Header + BottomNav)
│   │   ├── globals.css          # グローバル CSS (Tailwind)
│   │   │
│   │   ├── page.tsx             # トップ = フィード画面 (DailyDigest + タブ切替 + カテゴリフィルタ)
│   │   ├── papers/
│   │   │   ├── page.tsx         # 論文一覧ページ
│   │   │   └── [id]/page.tsx    # 論文詳細ページ
│   │   ├── news/
│   │   │   ├── page.tsx         # ニュース一覧ページ
│   │   │   └── [id]/page.tsx    # ニュース詳細ページ
│   │   ├── map/page.tsx         # 地図ページ (Leaflet)
│   │   ├── settings/page.tsx    # 設定ページ (ペルソナ / カテゴリ / 通知時刻)
│   │   │
│   │   └── api/                 # ── API ルート ──
│   │       ├── collect/route.ts    # POST: arXiv + NewsAPI → 要約 → スコア計算 → DB 保存
│   │       ├── papers/route.ts     # GET: 論文一覧 / PATCH: ブックマーク更新
│   │       ├── papers/[id]/route.ts# GET: 論文詳細
│   │       ├── news/route.ts       # GET: ニュース一覧 / PATCH: ブックマーク更新
│   │       ├── news/[id]/route.ts  # GET: ニュース詳細
│   │       ├── ratings/route.ts    # POST: 👍/👎 評価 → CategoryWeight 再計算
│   │       ├── summarize/route.ts  # POST: オンデマンド要約生成
│   │       ├── map/route.ts        # GET: 位置情報付きデータ
│   │       └── preferences/route.ts# GET/POST: ユーザー設定
│   │
│   └── components/              # ── UI コンポーネント ──
│       ├── feed/
│       │   ├── DailyDigest.tsx     # 今日のダイジェスト (Top3 論文 + Top3 ニュース、要約自動生成)
│       │   ├── FeedCard.tsx        # 記事カード (スコアバー / ブックマーク / 👍👎 ボタン)
│       │   ├── PaperCard.tsx       # 論文カード (FeedCard ラッパー)
│       │   └── NewsCard.tsx        # ニュースカード (FeedCard ラッパー)
│       ├── detail/
│       │   ├── PaperDetail.tsx     # 論文詳細表示 (5項目 AI サマリー)
│       │   └── NewsDetail.tsx      # ニュース詳細表示
│       ├── map/
│       │   ├── InteractiveMap.tsx   # Leaflet 地図本体
│       │   └── ArticleMarker.tsx   # 地図マーカー
│       ├── layout/
│       │   ├── Header.tsx          # 上部ヘッダー
│       │   └── BottomNav.tsx       # 下部ナビゲーションバー
│       └── ui/
│           ├── CategoryBadge.tsx   # カテゴリバッジ
│           ├── ScoreBar.tsx        # スコアバー (0〜1 の棒グラフ)
│           ├── SkeletonCard.tsx    # ローディングスケルトン
│           └── TimeSlider.tsx      # 時間範囲スライダー
│
├── Dockerfile                   # マルチステージビルド (builder → runner)
├── docker-compose.yml           # app + collector の2コンテナ構成
└── package.json
```

### データフロー

```
┌─────────────────────── 収集 (collect) ───────────────────────┐
│                                                              │
│  arXiv API ──┐                                               │
│              ├→ GPT-4o-mini 要約 → scoring.ts → DB 保存      │
│  NewsAPI ────┘     └→ 地名抽出 → geocoding                   │
│                                                              │
│  CategoryWeight (👍👎の傾向) → スコアの relevance に反映      │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────── 表示 (UI) ────────────────────────────┐
│                                                              │
│  page.tsx  ← GET /api/papers + /api/news                     │
│    ├→ DailyDigest (Top3、要約なければ /api/summarize で生成)  │
│    └→ FeedCard 一覧 (スコア順、カテゴリフィルタ、ページング)  │
│         ├→ ブックマーク → PATCH /api/papers or /api/news      │
│         └→ 👍/👎 → POST /api/ratings → CategoryWeight 更新   │
│                                                              │
│  map/page.tsx ← GET /api/map → Leaflet 地図にマーカー表示    │
└──────────────────────────────────────────────────────────────┘

┌─────────────────────── DB モデル ─────────────────────────────┐
│  Paper          論文 (arXiv ID, スコア, 要約, 位置, 評価)     │
│  NewsArticle    ニュース (URL hash, スコア, 要約, 位置, 評価) │
│  Rating         評価記録 (1記事1評価、カテゴリ付き)            │
│  CategoryWeight カテゴリ重み (-0.3〜+0.3 の adjustment)       │
│  UserPreferences ユーザー設定 (ペルソナ, カテゴリ, 通知時刻)  │
└──────────────────────────────────────────────────────────────┘
```

### 記事の選定・表示ロジック

記事は **収集 → カテゴリ分類 → スコアリング → 表示順決定** の流れで選定されます。

#### 1. 収集（どの記事を取得するか）

**論文** (`src/lib/arxiv.ts`)
arXiv API に対して以下の 5 クエリを順に実行し、新着順で取得します（重複排除済み）。

| # | 検索クエリ |
|---|---|
| 1 | `satellite imagery deep learning` |
| 2 | `cs.CV` カテゴリ × `remote sensing` |
| 3 | `cs.CV` カテゴリ × `satellite observation deep learning` |
| 4 | `change detection satellite imagery` |
| 5 | `semantic segmentation remote sensing` |

**ニュース** (`src/lib/newsapi.ts`)
NewsAPI に対して以下の 4 クエリを英語記事対象で実行し、新着順で取得します。

| # | 検索クエリ |
|---|---|
| 1 | `satellite imagery AI deep learning` |
| 2 | `remote sensing machine learning` |
| 3 | `satellite observation earth observation AI` |
| 4 | `geospatial AI analysis` |

#### 2. カテゴリ自動分類

取得した記事のタイトル・本文からキーワードマッチで 6 カテゴリに分類します（`detectCategory()`）。

| カテゴリ | 判定キーワード例 |
|---|---|
| ChangeDetection | `change detection`, `change monitor` |
| SuperResolution | `super resolution`, `super-resolution` |
| Segmentation | `segmentation`, `semantic` |
| ObjectDetection | `object detection`, `detector`, `yolo` |
| FoundationModel | `foundation model`, `SAM`, `segment anything`, `vision-language` |
| Other | 上記に該当しないもの |

#### 3. スコアリング（表示順の決定）

各記事に 0〜1 のスコアを算出し、**スコアの高い順**に表示します（`src/lib/scoring.ts`）。

```
最終スコア = 0.30 × 権威性 + 0.30 × 新鮮度 + 0.25 × 関連度 + 0.15 × トレンド
```

| 要素 | 計算方法 |
|---|---|
| **権威性** (authority) | 論文: 基本 0.7 + カテゴリ補正 + 学会・ジャーナル補正（後述）。ニュース: 信頼ドメインに応じて 0.4〜1.0 |
| **新鮮度** (recency) | `e^(-0.05 × 経過時間h)`。公開から時間が経つほど指数的に減衰 |
| **関連度** (relevance) | ペルソナ設定に基づくカテゴリ重み（例: `urban` ペルソナなら Segmentation = 1.0、Other = 0.3）。さらに👍/👎の傾向による CategoryWeight 補正（-0.3〜+0.3）を加算 |
| **トレンド** (trending) | `log(類似記事数 + 1) / log(10)`。同カテゴリの記事が多いほど上昇 |

**論文の権威性（学会・ジャーナル補正）**:

論文のタイトル・アブストラクトにトップ会議・ジャーナル名や受賞への言及が含まれている場合、権威性スコアに加点されます（最大の boost のみ適用、上限 1.0）。

| Tier | 対象 | 加点 |
|---|---|---|
| Tier 1 — CV/AI トップ会議 | CVPR, ICCV, ECCV, NeurIPS, ICML, ICLR, AAAI, IJCAI | +0.25 |
| Tier 1 — 画像処理トップ会議 | ICIP, ICASSP, SIGGRAPH, MICCAI | +0.25 |
| Tier 1 — CV/画像処理トップジャーナル | IEEE TPAMI, IEEE TIP, IJCV | +0.25 |
| Tier 1 — リモセン トップジャーナル | IEEE TGRS, Remote Sensing of Environment, ISPRS, IEEE JSTARS | +0.25 |
| Tier 2 — 有力会議 | WACV, BMVC, IGARSS, ACCV, ACM MM, SPIE | +0.15 |
| Tier 2 — 有力ジャーナル | IEEE GRSL, Pattern Recognition, Image and Vision Computing, CVIU | +0.15 |
| Tier 2 — 専門誌 | Remote Sensing (MDPI), Neural Networks | +0.10 |
| 引用・受賞 | `highly cited`, `best paper` | +0.20 |
| 実績 | `oral presentation`, `state-of-the-art` | +0.10〜0.15 |

**信頼ドメイン一覧**（ニュースの権威性に影響）:

| ドメイン | スコア | 分類 |
|---|---|---|
| `nasa.gov`, `esa.int`, `spacenews.com` | 1.0 | 宇宙・衛星機関 |
| `ieee.org`, `nature.com`, `science.org` | 1.0 | 学術出版 |
| `thecvf.com`, `neurips.cc`, `icml.cc`, `iclr.cc`, `aaai.org` | 1.0 | CV/AI 学会 |
| `acm.org`, `grss-ieee.org`, `sciencedirect.com`, `springer.com` | 0.95 | 学会・出版 |
| `signalprocessingsociety.org`, `spie.org`, `optica.org`, `wiley.com` | 0.9 | 画像処理学会・出版 |
| `esri.com`, `remotesensing.org`, `earthobservations.org` | 0.9 | リモセン専門 |
| `miccai.org`, `mdpi.com`, `tandfonline.com` | 0.85 | 医用画像学会・出版 |
| `arxiv.org` | 0.8 | プレプリント |
| `planet.com`, `maxar.com`, `airbus.com` | 0.8 | 衛星企業 |
| `geospatialworld.net`, `gisgeography.com` | 0.8 | 地理空間メディア |
| `spaceflightnow.com`, `nasaspaceflight.com` | 0.7 | 宇宙ニュース |
| その他 | 0.4 | — |

#### 4. 評価フィードバック（学習ループ）

ユーザーの👍/👎評価が蓄積されると、カテゴリ単位で重み補正値が自動計算されます。

```
adjustment = 0.3 × (👍数 - 👎数) / (👍数 + 👎数)    # 範囲: -0.3 〜 +0.3
```

この補正値は次回のデータ収集時にスコアリングの **関連度** に加算され、よく👍されるカテゴリの記事がより上位に表示されるようになります。
