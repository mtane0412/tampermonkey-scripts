/**
 * gm-fetch main.ts テスト
 *
 * unsafeWindow.GM_fetch へのエクスポートを検証する。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('main', () => {
  beforeEach(() => {
    // モジュールキャッシュをリセットして副作用が毎回実行されるようにする
    vi.resetModules()
    vi.unstubAllGlobals()
    // GM_xmlhttpRequest と unsafeWindow をスタブ化する
    vi.stubGlobal('GM_xmlhttpRequest', vi.fn())
    vi.stubGlobal('unsafeWindow', window)
  })

  it('unsafeWindow.GM_fetchにgmFetch関数がエクスポートされる', async () => {
    // 前提: main.ts を動的インポートすることでスクリプトの副作用が実行される
    await import('../src/main')
    // unsafeWindow.GM_fetch が関数として設定されていることを確認する
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(typeof (window as any).GM_fetch).toBe('function')
  })
})
