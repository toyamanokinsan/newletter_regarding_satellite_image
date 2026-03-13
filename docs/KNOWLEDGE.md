# KNOWLEDGE — 学び・ナレッジ

> 一度ハマったことには二度とハマらない。
> トラブルシュート、設計判断の理由、落とし穴をここに記録する。

---

## 環境・ビルド

### Next.js 16 の `node_modules/.bin/next` が壊れる

- **症状**: `npx next build` が `Cannot find module '../server/require-hook'` で失敗
- **原因**: `node_modules/.bin/next` のシンボリックリンクが壊れる（npm のバージョン差異?）
- **対策**: `package.json` の scripts で直接パスを指定
  ```json
  "build": "node node_modules/next/dist/bin/next build"
  ```

### Prisma の binaryTargets

- Docker (Alpine) で動かすには `linux-musl-openssl-3.0.x` が必要
  ```prisma
  binaryTargets = ["native", "linux-musl-openssl-3.0.x"]
  ```

### Docker 起動時のスキーマ適用

- `entrypoint.sh` で `prisma db push --skip-generate` を実行
- `--skip-generate` は runner ステージに既にビルド済み Prisma Client があるため
- 新しいモデル追加時もこれだけで自動適用される（マイグレーション不要）

---

## API・外部サービス

### OpenAI API の 429 insufficient_quota エラー

- **症状**: クォータが残っているのに `429 insufficient_quota` が返る
- **原因**: プロジェクトキー (sk-proj-...) はモデルごとに rate limit が別設定。gpt-4o の上限に達していた
- **対策**: `gpt-4o-mini` に切り替え。要約品質は十分、コスト約 1/30、rate limit も緩い
- **関連ファイル**: `src/lib/openai.ts`

### arXiv API のレート制限

- 3 秒間隔を空けないとブロックされる
- `RATE_LIMIT_MS = 3000` で sleep を入れている
- **関連ファイル**: `src/lib/arxiv.ts`

---

## DB 設計

### SQLite の制約

- SQLite には `@unique` の複合ユニーク制約は使えるが、enum 型はない → category は String で管理
- `@@unique([itemId, itemType])` で 1 記事 1 評価を保証（Rating モデル）

### スキーマ変更の適用

- 開発: `npm run db:push`
- Docker: コンテナ再起動時に `entrypoint.sh` が自動実行
- データを消さずにフィールド追加したい場合は `@default()` を付ける

---

## UI・フロントエンド

### DailyDigest の「要約を生成中...」が止まらない問題

- **症状**: 要約が `null` のまま保存された記事で永久に「要約を生成中...」と表示
- **原因**: 静的テキストのプレースホルダーであり、実際のローディング状態ではなかった
- **対策**: 要約が `null` の記事に対して `/api/summarize` をオンデマンド呼び出しするよう修正。失敗時は「要約なし」表示

---

## 設計判断の理由

### なぜ SQLite か

- 個人用アプリでデータ量が少ない（1 日数十件）
- Docker volume で永続化が簡単
- PostgreSQL 等に比べてインフラコスト・複雑さがゼロ

### なぜ collector を別コンテナにしたか

- Next.js の cron 機能（Vercel 依存）を使わず、汎用的な定時実行を実現
- Alpine + curl + shell の軽量構成で、app コンテナに依存せず独立して動作
- app が再起動しても collector は待機し、healthy になったら実行を再開

### なぜ CategoryWeight をリアルタイム反映しないか

- 収集時に一括で重みを読み込んで適用する設計
- 既存記事のスコアを逐次更新すると、表示順が頻繁に変わりユーザー体験が悪い
- 「次回の収集から反映」のほうが自然なフィードバックループ
