/**
 * example-script テスト設定
 */
import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      name: 'example-script',
      environment: 'happy-dom',
      globals: true,
      include: ['tests/**/*.test.ts'],
    },
  }),
)
