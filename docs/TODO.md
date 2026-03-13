# TODO — タスク管理

> コンテキストをリセットしても、ここを読めば作業を再開できるようにする。
> 各タスクにはステータスと必要な背景情報を書く。

---

## ステータス凡例

- `[ ]` 未着手
- `[>]` 進行中（詳細を下に書く）
- `[x]` 完了
- `[-]` 中止・不要になった

---

## 完了済み

- [x] 基本アプリ構築（Next.js + Prisma + arXiv + NewsAPI）
- [x] AI 要約生成（GPT-4o-mini で論文・ニュースを要約）
- [x] スコアリングアルゴリズム（権威性 / 新鮮度 / 関連度 / トレンド）
- [x] 地図表示（Leaflet で位置情報付き記事を可視化）
- [x] Docker 化（app + collector の 2 コンテナ構成）
- [x] 記事評価ボタン（👍/👎）+ CategoryWeight による自動スコア調整
- [x] 学会・ジャーナル・信頼ドメインによる権威性補正の拡充
- [x] 要約の品質改善（新規性フィールド追加、文字数拡張）
- [x] フィード画面に手動データ収集ボタン追加
- [x] SPEC 2026-03-05: 論文要約の拡充（novelty/method プロンプト改善）
- [x] SPEC 2026-03-05: ニュース要約の構造化（summary/novelty/application の JSON 化）
- [x] SPEC 2026-03-05: 検索クエリ拡充（SAR 3 クエリ + 光学衛星をarXiv/NewsAPI に追加）

## 進行中（SPEC 2026-03-13: コンテンツ鮮度・多様性改善）

- [x] T12: papers API に recent モード追加（直近3→7→30日の段階的フィルタ + rating != -1）
- [x] T13: news API に recent + diverse モード追加（日付フィルタ + ソース多様性 + rating != -1）
- [x] T14: arXiv 取得改善 — maxResults 増加 + クエリシャッフル + ソート順ローテーション
- [x] T15: collect API の fetchArxivPapers 呼び出しを maxResults=20 に変更
- [x] T16: トップページの API 呼び出しに recent=true&diverse=true 追加
- [x] T17: ビルド確認（成功）
- [x] T18: openai.ts に classifyTopics() バッチ分類関数を追加
- [x] T19: collect/route.ts で要約前に分類を実行、none はスキップ、topic を AI 結果で上書き
- [x] T20: ビルド確認（成功）

## 完了済み（SPEC 2026-03-08: トップページリニューアル）

- [x] T1: DB スキーマ変更 — Paper/NewsArticle に topic, recommendationReason, isFallback 追加
- [x] T2: 型定義更新 — src/types/index.ts に Topic 型追加、既存型に新フィールド追加
- [x] T3: arXiv クエリ拡張 — 画像認識3 + 業務改善3クエリ追加、topic 分類ロジック
- [x] T4: NewsAPI クエリ拡張 — 画像認識2 + 業務改善3クエリ追加、topic 分類ロジック
- [x] T5: AI 要約に recommendationReason 追加 — openai.ts のプロンプト修正
- [x] T6: 収集 API 更新 — collect/route.ts に topic 分類 + フォールバックロジック
- [x] T7: papers/news API に topic フィルタ追加
- [x] T8: 新トップページ作成 — 3カテゴリ × (論文3+ニュース3) のキュレーション画面
- [x] T9: 既存フィード一覧を /feed に移動
- [x] T10: BottomNav にフィード一覧リンク追加
- [x] T11: ビルド確認（成功）

---

## メモ

- OpenAI API はプロジェクトキー (sk-proj-...) を使用。gpt-4o は quota エラーになるため gpt-4o-mini を使用中
- `node_modules/.bin/next` が壊れやすいため、package.json の scripts で `node node_modules/next/dist/bin/next` を直接呼んでいる
