# tampermonkey-scripts

個人用Tampermonkeyユーザースクリプト集。

## スクリプト一覧

| スクリプト | 説明 | インストール |
|---|---|---|
| (スクリプト追加後に記載) | | |

---

## 開発者向け

### 必要環境

- Node.js 22+
- pnpm 10+

### セットアップ

```bash
pnpm install
```

### 新規スクリプト作成

```bash
pnpm new <script-name>
```

生成後、`packages/<script-name>/vite.config.ts` の `match` URLを対象サイトに変更する。

### 開発（HMR）

```bash
pnpm dev --filter @scripts/<script-name>
```

ブラウザでTampermonkeyにプロキシスクリプトをインストールすると、ソース変更が即座に反映される。

### テスト

```bash
pnpm test          # 全スクリプト
pnpm test:watch    # ウォッチモード
```

### ビルド

```bash
pnpm build         # 全スクリプト
pnpm --filter @scripts/<script-name> run build  # 特定スクリプト
```

### リリース

```bash
git tag <script-name>@1.0.0
git push origin <script-name>@1.0.0
```

GitHub Actionsが自動的にビルドしてGitHub Releaseを作成する。

## ライセンス

MIT
