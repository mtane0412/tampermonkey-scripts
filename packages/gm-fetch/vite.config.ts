/**
 * gm-fetch ビルド設定
 * vite-plugin-monkey によって ==UserScript== ヘッダーが自動生成される
 */
import { defineConfig } from 'vite'
import monkey from 'vite-plugin-monkey'

export default defineConfig({
  plugins: [
    monkey({
      entry: 'src/main.ts',
      userscript: {
        name: 'GM_fetch',
        namespace: 'https://github.com/mtane0412/tampermonkey-scripts',
        version: '0.1.0',
        description: 'GM_xmlhttpRequestを使ったFetch API互換ライブラリ。unsafeWindow.GM_fetchとして提供する。',
        author: 'mtane0412',
        match: ['*://*/*'],
        connect: ['*'],
        grant: ['GM_xmlhttpRequest', 'unsafeWindow'],
      },
      build: {
        fileName: 'gm-fetch.user.js',
      },
    }),
  ],
})
