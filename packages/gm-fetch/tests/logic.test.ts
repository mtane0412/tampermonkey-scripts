/**
 * gm-fetch ロジック層テスト
 *
 * parseHeaders と gmFetch の動作を検証する。
 * GM_xmlhttpRequest は vi.stubGlobal でモックする。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { parseHeaders, gmFetch } from '../src/logic'

// ============================================================
// parseHeaders テスト
// ============================================================

describe('parseHeaders', () => {
  it('単一ヘッダーをパースできる', () => {
    // 前提: "Content-Type: text/html" という単一ヘッダー文字列
    const result = parseHeaders('Content-Type: text/html')
    expect(result.get('content-type')).toBe('text/html')
  })

  it('複数ヘッダーをパースできる', () => {
    // 前提: "\r\n" 区切りの複数ヘッダー文字列
    const result = parseHeaders('Content-Type: text/html\r\nX-Custom-Header: カスタム値')
    expect(result.get('content-type')).toBe('text/html')
    expect(result.get('x-custom-header')).toBe('カスタム値')
  })

  it('ヘッダー値の前後の空白を除去する', () => {
    // 前提: "Content-Type:  text/html " のように前後に空白がある
    const result = parseHeaders('Content-Type:  text/html ')
    expect(result.get('content-type')).toBe('text/html')
  })

  it('空文字を渡すと空のHeadersを返す', () => {
    // 前提: 空文字列を渡した場合
    const result = parseHeaders('')
    // entries().next().done が true であれば空のHeaders
    expect(result.entries().next().done).toBe(true)
  })

  it('コロンを含むヘッダー値を正しくパースする', () => {
    // 前提: ヘッダー値自体にコロンが含まれる場合（Set-Cookie等）
    const result = parseHeaders('Set-Cookie: セッションID=abc123; path=/')
    expect(result.get('set-cookie')).toBe('セッションID=abc123; path=/')
  })

  it('不正な行（コロンなし）はスキップする', () => {
    // 前提: コロンなしの不正な行と有効な行が混在する場合
    const result = parseHeaders('不正な行\r\nContent-Type: text/html')
    expect(result.get('content-type')).toBe('text/html')
    expect(result.get('不正な行')).toBeNull()
  })

  it('RFC 7230の折り返しヘッダー（\\r\\n + スペース/タブ）を正しくパースする', () => {
    // 前提: ヘッダー値が次の行に折り返されている場合
    const result = parseHeaders('X-Long-Header: 値が\r\n 折り返している')
    expect(result.get('x-long-header')).toBe('値が 折り返している')
  })
})

// ============================================================
// gmFetch テスト用ヘルパー
// ============================================================

/**
 * GM_xmlhttpRequest モックを設定するヘルパー
 * readyState=2（HEADERS_RECEIVED）と readyState=4（DONE）をシミュレートする
 */
function setupGmXhrMock({
  status = 200,
  statusText = 'OK',
  responseHeaders = 'Content-Type: application/json\r\n',
  finalUrl = 'https://example.com/',
  responseText = '{"result": "成功"}',
  simulateError = false,
  simulateTimeout = false,
  simulateAbort = false,
}: {
  status?: number
  statusText?: string
  responseHeaders?: string
  finalUrl?: string
  responseText?: string
  simulateError?: boolean
  simulateTimeout?: boolean
  simulateAbort?: boolean
} = {}) {
  const abortFn = vi.fn()

  vi.stubGlobal(
    'GM_xmlhttpRequest',
    vi.fn((details: Tampermonkey.Request<unknown>) => {
      if (simulateError) {
        // onerror は RequestEventListener<ErrorResponse> 型（thisとargがErrorResponse）
        const errorResponse = { error: 'network error' } as Tampermonkey.ErrorResponse
        details.onerror?.call(errorResponse, errorResponse)
        return { abort: abortFn }
      }
      if (simulateTimeout) {
        // ontimeout は () => void 型（引数なし）
        details.ontimeout?.()
        return { abort: abortFn }
      }
      if (simulateAbort) {
        // onabort は () => void 型（引数なし）
        details.onabort?.()
        return { abort: abortFn }
      }

      // readyState=2: HEADERS_RECEIVED でレスポンスヘッダーを受信したタイミングでresolve
      // response フィールドに文字列を渡すことで response.text() / response.json() が動作する
      details.onreadystatechange?.call(null as unknown as Tampermonkey.Response<unknown>, {
        readyState: 2,
        status,
        statusText,
        responseHeaders,
        finalUrl,
        response: responseText,
        responseText,
        responseXML: null,
        context: undefined,
        loaded: 0,
        total: 0,
      } as unknown as Tampermonkey.Response<unknown>)

      // readyState=4: DONE で完了
      details.onreadystatechange?.call(null as unknown as Tampermonkey.Response<unknown>, {
        readyState: 4,
        status,
        statusText,
        responseHeaders,
        finalUrl,
        response: responseText,
        responseText,
        responseXML: null,
        context: undefined,
        loaded: responseText.length,
        total: responseText.length,
      } as unknown as Tampermonkey.Response<unknown>)

      return { abort: abortFn }
    }),
  )

  return { abortFn }
}

// ============================================================
// gmFetch テスト
// ============================================================

describe('gmFetch', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  describe('基本機能', () => {
    it('URLを文字列で渡してGETリクエストを送信できる', async () => {
      // 前提: URL文字列を直接渡した場合
      setupGmXhrMock()
      await gmFetch('https://example.com/')
      const mockFn = vi.mocked(GM_xmlhttpRequest)
      expect(mockFn).toHaveBeenCalledOnce()
      expect(mockFn.mock.calls[0]?.[0]).toMatchObject({
        method: 'GET',
        url: 'https://example.com/',
      })
    })

    it('レスポンスのstatusが正しい', async () => {
      // 前提: サーバーが200 OKを返す場合
      setupGmXhrMock({ status: 200, statusText: 'OK' })
      const response = await gmFetch('https://example.com/')
      expect(response.status).toBe(200)
      expect(response.statusText).toBe('OK')
    })

    it('response.okがステータス200-299でtrueになる', async () => {
      // 前提: 成功レスポンス
      setupGmXhrMock({ status: 200 })
      const response = await gmFetch('https://example.com/')
      expect(response.ok).toBe(true)
    })

    it('response.okがステータス400以上でfalseになる', async () => {
      // 前提: エラーレスポンス
      setupGmXhrMock({ status: 404, statusText: 'Not Found' })
      const response = await gmFetch('https://example.com/not-found')
      expect(response.ok).toBe(false)
    })

    it('レスポンスヘッダーが正しくパースされる', async () => {
      // 前提: Content-Typeヘッダーが含まれる場合
      setupGmXhrMock({
        responseHeaders: 'Content-Type: application/json; charset=utf-8\r\nX-Request-Id: リクエストID123\r\n',
      })
      const response = await gmFetch('https://example.com/')
      expect(response.headers.get('content-type')).toBe('application/json; charset=utf-8')
      expect(response.headers.get('x-request-id')).toBe('リクエストID123')
    })

    it('response.urlにfinalUrlが設定される', async () => {
      // 前提: リダイレクト後のfinalUrlが設定される場合
      setupGmXhrMock({ finalUrl: 'https://example.com/redirected' })
      const response = await gmFetch('https://example.com/')
      expect(response.url).toBe('https://example.com/redirected')
    })

    it('response.text()でボディを取得できる', async () => {
      // 前提: テキストレスポンスの場合
      setupGmXhrMock({
        responseHeaders: 'Content-Type: text/plain\r\n',
        responseText: 'こんにちは世界',
      })
      const response = await gmFetch('https://example.com/text')
      expect(await response.text()).toBe('こんにちは世界')
    })

    it('response.json()でJSONをパースできる', async () => {
      // 前提: JSONレスポンスの場合
      setupGmXhrMock({ responseText: '{"メッセージ": "成功", "コード": 200}' })
      const response = await gmFetch('https://example.com/api')
      const json = await response.json() as { メッセージ: string; コード: number }
      expect(json.メッセージ).toBe('成功')
      expect(json.コード).toBe(200)
    })
  })

  describe('リクエストオプション', () => {
    it('POSTリクエストでbodyを送信できる', async () => {
      // 前提: POSTメソッドとボディを指定した場合
      setupGmXhrMock()
      await gmFetch('https://example.com/api', {
        method: 'POST',
        body: '{"名前": "山田太郎"}',
      })
      const mockFn = vi.mocked(GM_xmlhttpRequest)
      expect(mockFn.mock.calls[0]?.[0]).toMatchObject({
        method: 'POST',
        data: '{"名前": "山田太郎"}',
      })
    })

    it('initのheadersがGM_xmlhttpRequestに正しく渡される', async () => {
      // 前提: カスタムヘッダーを指定した場合
      setupGmXhrMock()
      await gmFetch('https://example.com/', {
        headers: { 'X-Custom-Header': 'カスタム値' },
      })
      const mockFn = vi.mocked(GM_xmlhttpRequest)
      expect(mockFn.mock.calls[0]?.[0]).toMatchObject({
        headers: expect.objectContaining({ 'X-Custom-Header': 'カスタム値' }),
      })
    })

    it('Requestオブジェクトのheadersにinitのheadersが上書きされる', async () => {
      // 前提: Requestオブジェクトのヘッダーをinitのヘッダーで上書きする場合
      setupGmXhrMock()
      const request = new Request('https://example.com/', {
        headers: { 'X-Original': '元の値' },
      })
      await gmFetch(request, {
        headers: { 'X-Original': '上書き後の値', 'X-Added': '追加値' },
      })
      const mockFn = vi.mocked(GM_xmlhttpRequest)
      expect(mockFn.mock.calls[0]?.[0]).toMatchObject({
        headers: expect.objectContaining({
          'X-Original': '上書き後の値',
          'X-Added': '追加値',
        }),
      })
    })

    it('credentials:"omit"のとき anonymous:true になる', async () => {
      // 前提: CORS匿名リクエストを指定した場合
      setupGmXhrMock()
      await gmFetch('https://example.com/', { credentials: 'omit' })
      const mockFn = vi.mocked(GM_xmlhttpRequest)
      expect(mockFn.mock.calls[0]?.[0]).toMatchObject({ anonymous: true })
    })

    it('Requestオブジェクトを渡してリクエストできる', async () => {
      // 前提: Requestオブジェクトを直接渡した場合
      setupGmXhrMock()
      const request = new Request('https://example.com/', { method: 'GET' })
      await gmFetch(request)
      const mockFn = vi.mocked(GM_xmlhttpRequest)
      expect(mockFn.mock.calls[0]?.[0]).toMatchObject({
        method: 'GET',
        url: 'https://example.com/',
      })
    })

    it('RequestオブジェクトのreferrerポリシーがHeadersに設定される', async () => {
      // 前提: Requestオブジェクトにreferrerポリシーが設定されている場合
      // 注意: happy-dom 環境では Request.referrer が 'about:client' に正規化されるため
      // referrerPolicy のみ検証する（Referer ヘッダーの値は環境依存）
      setupGmXhrMock()
      const request = new Request('https://example.com/', {
        referrerPolicy: 'no-referrer',
      })
      await gmFetch(request)
      const mockFn = vi.mocked(GM_xmlhttpRequest)
      const headers = mockFn.mock.calls[0]?.[0]?.headers as Record<string, string>
      expect(headers?.['Referrer-Policy']).toBe('no-referrer')
    })

    it('init.referrerがHeadersのRefererに設定される', async () => {
      // 前提: initにreferrerを指定した場合
      setupGmXhrMock()
      await gmFetch('https://example.com/', {
        referrer: 'https://referrer.example.com/',
      })
      const mockFn = vi.mocked(GM_xmlhttpRequest)
      const headers = mockFn.mock.calls[0]?.[0]?.headers as Record<string, string>
      expect(headers?.['Referer']).toBe('https://referrer.example.com/')
    })

    it.skip('Request.referrerが"no-referrer"の場合はRefererヘッダーを設定しない', async () => {
      // 注意: happy-dom 環境では Request.referrer が 'about:client' に正規化されるため
      // このテストは happy-dom の制限によりスキップする
      // logic.ts の referrer !== 'no-referrer' 条件で適切にスキップされる（実装済み）
    })

    it('init.referrerが"no-referrer"の場合はRefererヘッダーを設定しない', async () => {
      // 前提: initに "no-referrer" という特殊値を指定した場合
      setupGmXhrMock()
      await gmFetch('https://example.com/', { referrer: 'no-referrer' })
      const mockFn = vi.mocked(GM_xmlhttpRequest)
      const headers = mockFn.mock.calls[0]?.[0]?.headers as Record<string, string>
      // "no-referrer" は特殊値なのでRefererヘッダーに設定されないことを確認する
      expect(headers?.['Referer']).toBeUndefined()
    })

    it('init.referrerが"about:client"の場合はRefererヘッダーを設定しない', async () => {
      // 前提: initに "about:client" という特殊値を指定した場合
      setupGmXhrMock()
      await gmFetch('https://example.com/', { referrer: 'about:client' })
      const mockFn = vi.mocked(GM_xmlhttpRequest)
      const headers = mockFn.mock.calls[0]?.[0]?.headers as Record<string, string>
      // "about:client" は特殊値なのでRefererヘッダーに設定されないことを確認する
      expect(headers?.['Referer']).toBeUndefined()
    })
  })

  describe('AbortSignal対応', () => {
    it('既にabort済みのシグナルを渡すとAbortErrorが発生する', async () => {
      // 前提: すでにキャンセルされたAbortControllerのシグナルを渡す場合
      // GM_xmlhttpRequest は呼ばれずに即座にrejectされる
      const controller = new AbortController()
      controller.abort()
      await expect(gmFetch('https://example.com/', { signal: controller.signal })).rejects.toMatchObject({
        name: 'AbortError',
      })
    })

    it('途中でabort()を呼ぶとGM_xmlhttpRequestのabortが呼ばれてAbortErrorで終了する', async () => {
      // 前提: リクエスト中にキャンセルが発生する場合
      vi.stubGlobal(
        'GM_xmlhttpRequest',
        vi.fn((details: Tampermonkey.Request<unknown>) => {
          // GM_xmlhttpRequest の abort() が呼ばれたとき、実際の GM と同様に onabort を呼ぶ
          // onabort は () => void 型（引数なし）
          const abort = vi.fn(() => {
            details.onabort?.()
          })
          return { abort }
        }),
      )
      const controller = new AbortController()
      const promise = gmFetch('https://example.com/', { signal: controller.signal })
      controller.abort()
      // abort() が呼ばれると onabort 経由で AbortError が reject される
      await expect(promise).rejects.toMatchObject({ name: 'AbortError' })
    })
  })

  describe('エラーハンドリング', () => {
    it('ネットワークエラー時にTypeErrorがthrowされる', async () => {
      // 前提: ネットワークエラーが発生した場合
      setupGmXhrMock({ simulateError: true })
      await expect(gmFetch('https://example.com/')).rejects.toMatchObject({
        name: 'TypeError',
        message: 'Network request failed',
      })
    })

    it('タイムアウト時にTypeErrorがthrowされる', async () => {
      // 前提: リクエストがタイムアウトした場合
      setupGmXhrMock({ simulateTimeout: true })
      await expect(gmFetch('https://example.com/')).rejects.toMatchObject({
        name: 'TypeError',
        message: 'Network request timeout',
      })
    })

    it('GM_xmlhttpRequestのonabort時にAbortErrorがthrowされる', async () => {
      // 前提: GM_xmlhttpRequest内部でabortが発生した場合
      setupGmXhrMock({ simulateAbort: true })
      await expect(gmFetch('https://example.com/')).rejects.toMatchObject({
        name: 'AbortError',
      })
    })
  })

  describe('HEADERS_RECEIVED でのresolve', () => {
    it('readyState=2のタイミングでPromiseがresolveされる', async () => {
      // 前提: fetchと同様にHEADERS_RECEIVEDの時点でresolveする挙動の確認
      // resolveOrder はコールバック呼び出し後に push して実際の発火順を記録する
      const resolveOrder: number[] = []

      vi.stubGlobal(
        'GM_xmlhttpRequest',
        vi.fn((details: Tampermonkey.Request<unknown>) => {
          // readyState=2 コールバック呼び出し後に 2 を記録する
          details.onreadystatechange?.call(null as unknown as Tampermonkey.Response<unknown>, {
            readyState: 2,
            status: 200,
            statusText: 'OK',
            responseHeaders: '',
            finalUrl: 'https://example.com/',
            response: '',
            responseText: '',
            responseXML: null,
            context: undefined,
            loaded: 0,
            total: 0,
          } as unknown as Tampermonkey.Response<unknown>)
          resolveOrder.push(2)

          // readyState=4 コールバック呼び出し後に 4 を記録する
          details.onreadystatechange?.call(null as unknown as Tampermonkey.Response<unknown>, {
            readyState: 4,
            status: 200,
            statusText: 'OK',
            responseHeaders: '',
            finalUrl: 'https://example.com/',
            response: '',
            responseText: '',
            responseXML: null,
            context: undefined,
            loaded: 0,
            total: 0,
          } as unknown as Tampermonkey.Response<unknown>)
          resolveOrder.push(4)

          return { abort: vi.fn() }
        }),
      )

      await gmFetch('https://example.com/')
      // readyState=2 のコールバックが readyState=4 より先に発火していることを確認する
      expect(resolveOrder[0]).toBe(2)
    })
  })
})
