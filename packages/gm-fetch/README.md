# gm-fetch

## インストール

[クリックしてインストール](https://github.com/mtane0412/tampermonkey-scripts/raw/main/packages/gm-fetch/dist/gm-fetch.user.js)

## 概要

`GM_xmlhttpRequest` をラップした Fetch API 互換ライブラリ。Tampermonkey の CORS 制限を回避して任意のドメインへの HTTP リクエストを可能にする。インストールすると `window.GM_fetch` として公開され、他のユーザースクリプトやページスクリプトから利用できる。`fetch()` と同じインターフェースを持ち、AbortSignal やカスタムヘッダー（Referer を含む）にも対応する。

## 対象サイト

全サイト（`*://*/*`）

## 使い方

このスクリプト自体はライブラリです。依存するスクリプト（例: scrapbox-url-customizer）をインストールすると自動的に `window.GM_fetch` が利用可能になります。

```javascript
// 他のスクリプトから利用する例
const response = await window.GM_fetch('https://api.example.com/data')
const data = await response.json()
```

### 制限事項

- `input` に body 付きの `Request` オブジェクトを渡した場合、body は送信されない（`Request.body` は `ReadableStream` であり非同期読み取りが必要なため）
- body を送信する場合は `init.body` を使用すること

```javascript
// ❌ body が送信されない
const req = new Request(url, { method: 'POST', body: 'data' })
await window.GM_fetch(req)

// ✅ init.body を使用する
await window.GM_fetch(url, { method: 'POST', body: 'data' })
```

### 必要な UserScript メタデータ（依存スクリプト側）

```javascript
// @require   <gm-fetch の URL>
// @connect   <アクセスしたいドメイン>
// @grant     GM_xmlhttpRequest
// @grant     unsafeWindow
```
