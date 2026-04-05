# CLAUDE.md

## リポジトリ概要

個人用Tampermonkeyユーザースクリプトを管理するpublic monorepo。
各スクリプトはTypeScriptで開発し、vite-plugin-monkeyでビルドする。

## ディレクトリ構造

```
packages/<name>/          # 各スクリプト（完全に独立）
  src/main.ts             # エントリポイント（DOM操作）
  src/logic.ts            # ロジック層（純粋関数・テスト容易）
  tests/                  # テスト
  dist/<name>.user.js     # ビルド成果物（gitにコミット）
  vite.config.ts          # ビルド設定
  vitest.config.ts        # テスト設定
templates/script/         # 新規スクリプト用テンプレート
scripts/create-script.sh  # スキャフォールドスクリプト
```

## 主要コマンド

| コマンド | 内容 |
|---|---|
| `pnpm new <name>` | 新規スクリプト作成 |
| `pnpm dev --filter @scripts/<name>` | 開発サーバー起動（HMR） |
| `pnpm build` | 全スクリプトビルド |
| `pnpm test` | 全テスト実行 |
| `pnpm lint` | ESLint実行 |
| `pnpm type-check` | TypeScript型チェック |

## 開発ルール

- テスト先行（TDD）で開発すること
- ロジック（純粋関数）を `logic.ts` に分離してテスタビリティを確保する
- DOM操作は `main.ts` に集約する
- `GM_*` APIは `vi.stubGlobal` でモックする

## Gitルール

- `main` への直接コミット禁止
- ブランチ命名: `feature/<script-name>/<description>`
- リリースタグ: `<script-name>@<version>` (例: `my-script@1.0.0`)
- `git tag my-script@1.0.0 && git push origin my-script@1.0.0` でリリース

## distの扱い

- `dist/` はgitにコミットする（Raw URLでワンクリックインストール可能にするため）
- `dist/` への手動コミットは禁止。ビルドコマンド経由で生成すること
