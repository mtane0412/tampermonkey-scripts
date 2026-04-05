/**
 * Vitest ルート設定
 * packages/ 配下の各スクリプトを自動検出してテストプロジェクトとして登録する
 */
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: ['packages/*/vitest.config.ts'],
  },
})
