// ==UserScript==
// @name         GM_fetch
// @namespace    https://github.com/mtane0412/tampermonkey-scripts
// @version      0.1.0
// @author       mtane0412
// @description  GM_xmlhttpRequestを使ったFetch API互換ライブラリ。unsafeWindow.GM_fetchとして提供する。
// @match        *://*/*
// @connect      *
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// ==/UserScript==

(function () {
  'use strict';

  const parseHeaders = (rawHeaders) => new Headers(
    rawHeaders.replace(/\r?\n[\t ]+/g, " ").split(/\r\n|\r|\n/).flatMap((header) => {
      const colonIndex = header.indexOf(":");
      if (colonIndex <= 0) return [];
      const key = header.slice(0, colonIndex).trim();
      const value = header.slice(colonIndex + 1).trim();
      if (!key) return [];
      return [[key, value]];
    })
  );
  const gmFetch = (input, init) => new Promise((resolve, reject) => {
    var _a, _b, _c;
    const headers = Object.fromEntries(
      new Headers(input instanceof Request ? input.headers : init == null ? void 0 : init.headers).entries()
    );
    if (input instanceof Request) {
      headers["Referer"] = input.referrer;
      headers["Referrer-Policy"] = input.referrerPolicy;
    }
    if (init == null ? void 0 : init.referrer) {
      headers["Referer"] = init.referrer;
    }
    if (init == null ? void 0 : init.referrerPolicy) {
      headers["Referrer-Policy"] = init.referrerPolicy;
    }
    const request = new Request(input, init);
    if ((_a = request.signal) == null ? void 0 : _a.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const { abort } = GM_xmlhttpRequest({
method: request.method,
      url: request.url,
      headers,
...(init == null ? void 0 : init.body) ? { data: init.body } : {},
anonymous: request.credentials === "omit",
responseType: "stream",
      fetch: true,
      onerror: () => {
        reject(new TypeError("Network request failed"));
      },
      ontimeout: () => {
        reject(new TypeError("Network request timeout"));
      },
      onabort: () => {
        reject(new DOMException("Aborted", "AbortError"));
      },

onreadystatechange: (res) => {
        var _a2, _b2;
        switch (res.readyState) {
          case 2: {
            const body = res.responseText ?? null;
            const response = new Response(body, {
              status: res.status,
              statusText: res.statusText,
              headers: parseHeaders(res.responseHeaders)
            });
            Object.defineProperty(response, "url", { value: res.finalUrl });
            resolve(response);
            break;
          }
          case 4:
            (_b2 = (_a2 = request.signal) == null ? void 0 : _a2.removeEventListener) == null ? void 0 : _b2.call(_a2, "abort", abort);
            break;
        }
      }
    });
    (_c = (_b = request.signal) == null ? void 0 : _b.addEventListener) == null ? void 0 : _c.call(_b, "abort", abort);
  });
  unsafeWindow["GM_fetch"] = gmFetch;

})();