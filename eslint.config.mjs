/**
 * ESLint設定（flat config）
 * TypeScript推奨ルールを適用する
 */
import tseslint from 'typescript-eslint'

export default tseslint.config(...tseslint.configs.recommended, {
  ignores: ['**/dist/**', '**/node_modules/**'],
})
