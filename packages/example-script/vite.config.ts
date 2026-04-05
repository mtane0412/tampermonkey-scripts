/**
 * example-script ビルド設定
 * vite-plugin-monkey によって ==UserScript== ヘッダーが自動生成される
 */
import { defineConfig } from 'vite'
import monkey from 'vite-plugin-monkey'

export default defineConfig({
  plugins: [
    monkey({
      entry: 'src/main.ts',
      userscript: {
        name: 'example-script',
        namespace: 'https://github.com/mtane0412/tampermonkey-scripts',
        version: '1.0.0',
        description: '',
        author: 'mtane0412',
        // TODO: 対象サイトのURLパターンに変更する
        match: ['https://example.com/*'],
      },
      build: {
        fileName: 'example-script.user.js',
      },
    }),
  ],
})
