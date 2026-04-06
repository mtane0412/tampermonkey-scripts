/**
 * gm-fetch main.ts テスト
 *
 * unsafeWindow.GM_fetch へのエクスポートを検証する。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('main', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
    // GM_xmlhttpRequest と unsafeWindow をスタブ化する
    vi.stubGlobal('GM_xmlhttpRequest', vi.fn())
    vi.stubGlobal('unsafeWindow', window)
  })

  it('unsafeWindow.GM_fetchにgmFetch関数がエクスポートされる', async () => {
    // 前提: main.ts を動的インポートすることでスクリプトの副作用が実行される
    await import('../src/main')
    // unsafeWindow.GM_fetch が関数として設定されていることを確認する
    expect(typeof (window as Window & typeof globalThis & { GM_fetch?: unknown }).GM_fetch).toBe('function')
  })
})
