# My News Letter — Claude Code 指示書

衛星画像・リモートセンシング AI 特化のニュースアグリゲーションアプリ。

## 開発ワークフロー（必ず従うこと）

### フェーズ 1: 要件理解（PLAN → SPEC）

1. ユーザーから新しい機能要望やアイデアを受け取ったら、まず `docs/PLAN.md` に追記する
2. PLAN.md の内容を元に、ユーザーに質問しながら仕様を具体化する
   - 「この機能の目的は何ですか？」「どういう操作感を想定していますか？」など、曖昧な点を必ず確認する
   - 技術的な選択肢がある場合は、メリット・デメリットを提示してユーザーに選んでもらう
   - 一度に全部決めようとせず、対話を通じて段階的に固める
3. 仕様が固まったら `docs/SPEC.md` に追記し、ユーザーに最終確認を取る
4. **SPEC.md の該当仕様がユーザーに承認されるまで実装に着手しないこと**

### フェーズ 2: 実装（TODO + KNOWLEDGE で管理）

1. SPEC.md の確定仕様を元に `docs/TODO.md` にタスクを分解して追記する
2. タスクを上から順に実装する。着手時に `[>]`、完了時に `[x]` に更新する
3. 実装中にハマったこと・学んだことがあれば `docs/KNOWLEDGE.md` に即座に記録する
4. コンテキストがリセットされても TODO.md を読めば再開できる状態を常に維持する

### フェーズ 3: 確認

1. `npm run build` で型チェック + ビルドが通ることを確認
2. Docker 環境の場合は `docker compose up -d --build` で反映・動作確認
3. 完了したタスクを TODO.md で `[x]` にマークする

## ドキュメント

@docs/PLAN.md
@docs/SPEC.md
@docs/TODO.md
@docs/KNOWLEDGE.md

## ビルド・実行

```bash
npm run dev              # 開発サーバー
npm run build            # ビルド（型チェック含む）
npm run db:push          # スキーマ適用
npm run collect          # 手動データ収集
docker compose up -d     # Docker 起動
docker compose up -d --build  # 再ビルド + 起動
```

## コーディング規約

- TypeScript strict。型は `src/types/index.ts` に集約
- Next.js App Router。API は `src/app/api/` 配下
- Tailwind CSS v4。インラインクラスで記述
- Prisma (SQLite)。スキーマ変更後は `prisma generate` + `db:push`
- OpenAI は `gpt-4o-mini` を使用（gpt-4o は quota エラーになるため）

## 実装時の注意

- `node_modules/.bin/next` は壊れやすい。`node node_modules/next/dist/bin/next` を使う
- Docker ビルド後は `docker compose up -d --build` で反映を確認する
- DB スキーマに新フィールドを追加する際は `@default()` を付けて既存データを壊さない
- 要約 API の max_tokens: 論文=1000、ニュース=500
