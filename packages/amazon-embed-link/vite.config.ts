/**
 * amazon-embed-link ビルド設定
 * vite-plugin-monkey によって ==UserScript== ヘッダーが自動生成される
 */
import { defineConfig } from 'vite'
import monkey from 'vite-plugin-monkey'

export default defineConfig({
  plugins: [
    monkey({
      entry: 'src/main.ts',
      userscript: {
        name: 'amazon-embed-link',
        namespace: 'https://github.com/mtane0412/tampermonkey-scripts',
        version: '1.0.0',
        description: 'Amazon.co.jpの商品ページに埋め込み用HTMLカードを生成するボタンを追加する',
        author: 'mtane0412',
        match: [
          'https://www.amazon.co.jp/*/dp/*',
          'https://www.amazon.co.jp/dp/*',
          'https://www.amazon.co.jp/gp/product/*',
        ],
        grant: ['GM_setClipboard'],
      },
      build: {
        fileName: 'amazon-embed-link.user.js',
      },
    }),
  ],
})
