/**
 * gm-fetch
 *
 * 目的: GM_xmlhttpRequest を使った Fetch API 互換ライブラリ
 * 詳細: unsafeWindow.GM_fetch として全ページから利用可能にする
 *       CORS を回避した fetch が必要なスクリプトの依存ライブラリとして機能する
 */

import { gmFetch } from './logic'

// 他のスクリプトやページスクリプトから window.GM_fetch としてアクセスできるよう
// ページのグローバルオブジェクト（unsafeWindow）に公開する
// unsafeWindow の型定義には GM_fetch が含まれないため unknown 経由でキャストする
(unsafeWindow as unknown as Record<string, unknown>)['GM_fetch'] = gmFetch
