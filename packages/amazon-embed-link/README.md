# amazon-embed-link

## インストール

[クリックしてインストール](../../../raw/main/packages/amazon-embed-link/dist/amazon-embed-link.user.js)

## 概要

Amazon.co.jpの商品ページに **「埋め込みリンク」** ボタンを追加するTampermonkeyスクリプト。

- Amazonアソシエイトのサイトストライプ（SiteStripe）ツールバーにボタンを追加する
- ボタンクリックで商品タイトル・画像・価格・説明を自動取得し、アフィリエイトURL付きのHTMLカードを生成する
- モーダルでプレビューを確認し、HTMLをワンクリックでクリップボードにコピーできる
- 生成されたHTMLはインラインスタイル付きで、ブログや記事にそのまま貼り付けて使用できる

## 対象サイト

- `https://www.amazon.co.jp/dp/*`（商品詳細ページ）
- `https://www.amazon.co.jp/*/dp/*`（商品名付きURLの商品詳細ページ）
- `https://www.amazon.co.jp/gp/product/*`（旧形式の商品詳細ページ）

※ Amazonアソシエイト（アフィリエイト）の登録が必要です。スクリプト内のアソシエイトタグ（`mtane0412-22`）は自分のタグに変更してください。

## 使い方

1. Tampermonkeyをブラウザにインストールし、上記の「インストール」リンクからスクリプトを追加する
2. Amazon.co.jpの商品ページを開く（Amazonアソシエイトのサイトストライプが表示される必要あり）
3. ページ上部のサイトストライプに表示される **「埋め込みリンク」** ボタンをクリックする
4. モーダルが開き、以下が表示される：
   - **プレビュー**: 生成されるHTMLカードの見た目
   - **HTMLコード**: テキストエリアにコピー可能なHTMLコード
5. **「HTMLをコピー」** ボタンをクリックしてHTMLをクリップボードにコピーする
6. ブログの記事エディタ（HTML編集モード）に貼り付ける

### 生成されるHTMLの例

```html
<div class="amazon-link-card" style="...">
  <a href="https://www.amazon.co.jp/dp/XXXXXXXXXX/ref=nosim?tag=mtane0412-22" ...>
    <!-- 商品画像 -->
    <!-- 商品タイトル・説明・価格 -->
    <!-- "Amazonで見る →" リンク -->
  </a>
</div>
```

## カスタマイズ

`src/logic.ts` 内の `ASSOCIATE_TAG` 定数を自分のアソシエイトタグに変更してビルドしてください。

```bash
pnpm build --filter @scripts/amazon-embed-link
```
