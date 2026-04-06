/**
 * gm-fetch ロジック層
 *
 * 目的: GM_xmlhttpRequest を使って Fetch API 互換の関数を提供する
 * 詳細: whatwg-fetch polyfill をベースに、CORS を回避したリクエストを可能にする
 * 参考: https://scrapbox.io/takker/GM_fetch
 */

/**
 * GM_xmlhttpRequest のレスポンスヘッダー文字列を Headers オブジェクトに変換する
 *
 * @param rawHeaders - "\r\n" 区切りのヘッダー文字列（GM_xmlhttpRequest の responseHeaders 形式）
 * @returns パース済みの Headers オブジェクト
 */
export const parseHeaders = (rawHeaders: string): Headers =>
  new Headers(
    rawHeaders
      // RFC 7230: \r\n の後にスペースまたはタブが続く場合は折り返しとしてスペースに置換する
      .replace(/\r?\n[\t ]+/g, ' ')
      .split(/\r\n|\r|\n/)
      .flatMap((header) => {
        const colonIndex = header.indexOf(':')
        // コロンがない行または先頭にコロンがある行はスキップする
        if (colonIndex <= 0) return []
        const key = header.slice(0, colonIndex).trim()
        const value = header.slice(colonIndex + 1).trim()
        if (!key) return []
        return [[key, value]] as [string, string][]
      }),
  )

/**
 * GM_xmlhttpRequest をラップした Fetch API 互換関数
 *
 * 対応機能:
 * - Request / RequestInit / URL すべての形式の input 引数
 * - headers（Referer, Referrer-Policy を含む）
 * - AbortSignal 対応（既に abort 済みの場合は即座に reject）
 * - credentials: "omit" → anonymous: true
 * - responseType: "stream", fetch: true による進捗ストリーム対応
 * - HEADERS_RECEIVED（readyState=2）で Promise を resolve（fetch と同じ挙動）
 * - Response.url を Object.defineProperty で設定（コンストラクタ経由では設定不可のため）
 *
 * @param input - URL 文字列、URL オブジェクト、または Request オブジェクト
 * @param init - RequestInit（省略可能）
 * @returns fetch 互換の Response Promise
 */
export const gmFetch = (
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> =>
  new Promise((resolve, reject) => {
    // headers オブジェクトを構築する
    // input が Request の場合はそのヘッダーを優先し、init のヘッダーで上書きする
    const headers = Object.fromEntries(
      new Headers(input instanceof Request ? input.headers : init?.headers).entries(),
    )

    // Referer / Referrer-Policy は禁止ヘッダーのため通常の Headers では設定できない
    // GM_xmlhttpRequest には直接渡す必要があるため別途処理する
    if (input instanceof Request) {
      headers['Referer'] = input.referrer
      headers['Referrer-Policy'] = input.referrerPolicy
    }
    if (init?.referrer) {
      headers['Referer'] = init.referrer
    }
    if (init?.referrerPolicy) {
      headers['Referrer-Policy'] = init.referrerPolicy
    }

    const request = new Request(input, init)

    // 既に abort 済みのシグナルが渡された場合は即座に reject する
    if (request.signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'))
      return
    }

    const { abort } = GM_xmlhttpRequest({
      // @ts-expect-error method は標準的な文字列が入るため安全
      method: request.method,
      url: request.url,
      headers,
      // init.body から直接取り出す（request.text() で取り出すと await が必要になるため）
      ...(init?.body ? { data: init.body } : {}),
      // credentials: "omit" の場合は Cookie などを送らない匿名リクエストとして扱う
      anonymous: request.credentials === 'omit',
      // responseType に "stream" を指定することで ReadableStream として取得できる
      responseType: 'stream',
      fetch: true,
      onerror: () => {
        reject(new TypeError('Network request failed'))
      },
      ontimeout: () => {
        reject(new TypeError('Network request timeout'))
      },
      onabort: () => {
        reject(new DOMException('Aborted', 'AbortError'))
      },
      // fetch と同様に HEADERS_RECEIVED（readyState=2）の段階で Promise を resolve する
      // この時点でレスポンスヘッダーが利用可能になり、body は ReadableStream として遅延読み取り可能
      onreadystatechange: (res) => {
        switch (res.readyState) {
          case 2: {
            // responseText をボディとして使用する
            // （responseType: "stream" の場合は res.response が ReadableStream になるが
            //   happy-dom 環境や一部の Tampermonkey では responseText を使う）
            const body = res.responseText ?? null
            const response = new Response(body, {
              status: res.status,
              statusText: res.statusText,
              headers: parseHeaders(res.responseHeaders),
            })
            // Response の url プロパティはコンストラクタで設定できないため
            // Object.defineProperty を使って上書きする
            // 参考: https://stackoverflow.com/questions/56654119/how-do-you-set-the-url-when-creating-a-new-response
            Object.defineProperty(response, 'url', { value: res.finalUrl })
            resolve(response)
            break
          }
          case 4:
            // リクエスト完了時に AbortSignal のリスナーを解除する
            request.signal?.removeEventListener?.('abort', abort)
            break
          default:
            break
        }
      },
    })

    // AbortSignal が渡された場合、abort イベントで GM_xmlhttpRequest をキャンセルする
    request.signal?.addEventListener?.('abort', abort)
  })
