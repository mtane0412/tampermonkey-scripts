// ==UserScript==
// @name         amazon-embed-link
// @namespace    https://github.com/mtane0412/tampermonkey-scripts
// @version      1.0.0
// @author       mtane0412
// @description  Amazon.co.jpの商品ページに埋め込み用HTMLカードを生成するボタンを追加する
// @license      MIT
// @match        https://www.amazon.co.jp/*/dp/*
// @match        https://www.amazon.co.jp/dp/*
// @match        https://www.amazon.co.jp/gp/product/*
// @grant        GM_setClipboard
// ==/UserScript==

(function () {
  'use strict';

  const ASSOCIATE_TAG = "mtane0412-22";
  const AMAZON_BASE_URL = "https://www.amazon.co.jp";
  const MAX_DESCRIPTION_LENGTH = 120;
  function extractAsin(url) {
    const match = /\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i.exec(url);
    return (match == null ? void 0 : match[1]) ?? null;
  }
  function truncateText(text, maxLength) {
    if (text.length <= maxLength) {
      return text;
    }
    const sliceLength = maxLength - 3;
    return text.slice(0, sliceLength) + "...";
  }
  function generateAffiliateUrl(asin) {
    if (!/^[A-Z0-9]{10}$/i.test(asin)) {
      throw new Error("Invalid ASIN: ASIN must be a 10-character alphanumeric string");
    }
    return `${AMAZON_BASE_URL}/dp/${asin.toUpperCase()}/ref=nosim?tag=${ASSOCIATE_TAG}`;
  }
  function extractProductInfo(doc, url) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j;
    const firstNonEmpty = (...values) => {
      var _a2;
      return ((_a2 = values.find((v) => v == null ? void 0 : v.trim())) == null ? void 0 : _a2.trim()) ?? "";
    };
    const title = firstNonEmpty(
      (_a = doc.querySelector("#productTitle")) == null ? void 0 : _a.textContent,
      (_b = doc.querySelector("#title")) == null ? void 0 : _b.textContent,
      doc.title
    );
    const imageUrl = firstNonEmpty(
      (_c = doc.querySelector("#landingImage")) == null ? void 0 : _c.src,
      (_d = doc.querySelector("#imgBlkFront")) == null ? void 0 : _d.src,
      (_e = doc.querySelector("#main-image")) == null ? void 0 : _e.src
    );
    const rawDescription = firstNonEmpty(
      (_f = doc.querySelector('meta[name="description"]')) == null ? void 0 : _f.content,
      (_g = doc.querySelector("#productDescription")) == null ? void 0 : _g.textContent
    );
    const description = truncateText(rawDescription, MAX_DESCRIPTION_LENGTH);
    const price = firstNonEmpty(
      (_h = doc.querySelector(".a-price .a-offscreen")) == null ? void 0 : _h.textContent,
      (_i = doc.querySelector("#priceblock_ourprice")) == null ? void 0 : _i.textContent,
      (_j = doc.querySelector(".a-price-whole")) == null ? void 0 : _j.textContent
    );
    const asin = extractAsin(url) ?? "";
    return { title, imageUrl, description, price, asin };
  }
  function generateEmbedHtml(product) {
    const affiliateUrl = escapeHtml(generateAffiliateUrl(product.asin));
    const safeImageUrl = escapeHtml(product.imageUrl);
    return `<div class="amazon-link-card" style="
  max-width: 600px;
  border: 1px solid #ddd;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  margin: 20px auto;
">
  <a href="${affiliateUrl}"
     target="_blank"
     rel="noopener noreferrer"
     style="text-decoration: none; color: inherit; display: flex; flex-direction: row; width: 100%;">

    <div style="flex: 0 0 180px; background: #f7f7f7; display: flex; align-items: center; justify-content: center; padding: 16px;">
      <img src="${safeImageUrl}"
           alt="${escapeHtml(product.title)}"
           style="max-width: 100%; max-height: 200px; object-fit: contain;">
    </div>

    <div style="flex: 1; padding: 16px; display: flex; flex-direction: column; justify-content: space-between;">
      <div>
        <div style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; line-height: 1.4; color: #111;">
          ${escapeHtml(product.title)}
        </div>
        <p style="margin: 0 0 12px 0; font-size: 14px; color: #666; line-height: 1.5;">
          ${escapeHtml(product.description)}
        </p>
      </div>

      <div style="display: flex; align-items: center; justify-content: space-between;">
        <span style="font-size: 18px; font-weight: 700; color: #B12704;">
          ${escapeHtml(product.price)}
        </span>
        <span style="font-size: 12px; color: #0066c0; font-weight: 500;">
          Amazonで見る →
        </span>
      </div>
    </div>
  </a>
</div>

<style>
@media (max-width: 600px) {
  .amazon-link-card a {
    flex-direction: column !important;
  }
  .amazon-link-card a > div:first-child {
    flex: 0 0 auto !important;
    padding: 20px !important;
  }
}
</style>`;
  }
  function escapeHtml(text) {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }
  const MODAL_OVERLAY_ID = "amazon-embed-modal-overlay";
  const BUTTON_CONTAINER_ID = "amazon-embed-button-container";
  const SITESTRIPE_LINK_CONTAINER_SELECTOR = "#amzn-ss-get-link-container";
  let copyResetTimerId;
  function createEmbedButton(onClick) {
    const button = document.createElement("button");
    button.id = "amazon-embed-link-button";
    button.className = "a-button a-button-primary";
    button.textContent = "埋め込みリンク";
    button.setAttribute("aria-label", "埋め込みリンク");
    button.type = "button";
    button.addEventListener("click", onClick);
    return button;
  }
  function insertButtonAfterSiteStripe(onClick) {
    const linkContainer = document.querySelector(SITESTRIPE_LINK_CONTAINER_SELECTOR);
    if (!linkContainer) {
      return;
    }
    if (document.getElementById(BUTTON_CONTAINER_ID)) {
      return;
    }
    const container = document.createElement("div");
    container.id = BUTTON_CONTAINER_ID;
    container.className = "amzn-ss-link-container amzn-ss-get-link-container";
    const button = createEmbedButton(onClick);
    container.appendChild(button);
    linkContainer.insertAdjacentElement("afterend", container);
  }
  function showModal(html) {
    hideModal();
    const overlay = document.createElement("div");
    overlay.id = MODAL_OVERLAY_ID;
    overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.6);
    z-index: 999999;
    display: flex;
    align-items: center;
    justify-content: center;
  `;
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        hideModal();
      }
    });
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        hideModal();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    overlay.dataset["keydownCleanup"] = "true";
    overlay.addEventListener("remove-keydown", () => {
      document.removeEventListener("keydown", handleKeyDown);
    });
    const TITLE_ID = "amazon-embed-modal-title";
    const modal = document.createElement("div");
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", TITLE_ID);
    modal.style.cssText = `
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
    max-width: 720px;
    width: 90%;
    max-height: 90vh;
    overflow-y: auto;
    padding: 24px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  `;
    const header = document.createElement("div");
    header.style.cssText = "display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;";
    const title = document.createElement("h2");
    title.id = TITLE_ID;
    title.textContent = "埋め込みHTMLカード";
    title.style.cssText = "margin: 0; font-size: 18px; color: #111;";
    const closeButton = document.createElement("button");
    closeButton.id = "amazon-embed-close-button";
    closeButton.textContent = "✕ 閉じる";
    closeButton.style.cssText = `
    background: none;
    border: 1px solid #ccc;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    padding: 4px 12px;
    color: #555;
  `;
    closeButton.addEventListener("click", hideModal);
    header.appendChild(title);
    header.appendChild(closeButton);
    const previewLabel = document.createElement("p");
    previewLabel.textContent = "プレビュー";
    previewLabel.style.cssText = "font-weight: 600; margin: 0 0 8px 0; font-size: 14px; color: #555;";
    const preview = document.createElement("div");
    preview.id = "amazon-embed-preview";
    preview.style.cssText = "border: 1px solid #ddd; border-radius: 4px; padding: 16px; margin-bottom: 16px; background: #fafafa;";
    preview.innerHTML = html;
    const codeLabel = document.createElement("p");
    codeLabel.textContent = "HTMLコード";
    codeLabel.style.cssText = "font-weight: 600; margin: 0 0 8px 0; font-size: 14px; color: #555;";
    const textarea = document.createElement("textarea");
    textarea.id = "amazon-embed-textarea";
    textarea.value = html;
    textarea.readOnly = true;
    textarea.style.cssText = `
    width: 100%;
    height: 160px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-family: monospace;
    font-size: 12px;
    padding: 8px;
    resize: vertical;
    box-sizing: border-box;
    color: #333;
    background: #f5f5f5;
  `;
    const copyButton = document.createElement("button");
    copyButton.id = "amazon-embed-copy-button";
    copyButton.textContent = "HTMLをコピー";
    copyButton.style.cssText = `
    background: #e77600;
    border: 1px solid #c45500;
    border-radius: 3px;
    color: #111;
    cursor: pointer;
    font-size: 14px;
    font-weight: 700;
    padding: 8px 20px;
    margin-top: 12px;
  `;
    copyButton.addEventListener("click", () => {
      GM_setClipboard(html, "text");
      copyButton.textContent = "コピーしました！";
      clearTimeout(copyResetTimerId);
      copyResetTimerId = setTimeout(() => {
        if (document.getElementById(MODAL_OVERLAY_ID)) {
          copyButton.textContent = "HTMLをコピー";
        }
      }, 2e3);
    });
    modal.appendChild(header);
    modal.appendChild(previewLabel);
    modal.appendChild(preview);
    modal.appendChild(codeLabel);
    modal.appendChild(textarea);
    modal.appendChild(copyButton);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    closeButton.focus();
  }
  function hideModal() {
    const overlay = document.getElementById(MODAL_OVERLAY_ID);
    if (overlay) {
      overlay.dispatchEvent(new Event("remove-keydown"));
      overlay.remove();
    }
    clearTimeout(copyResetTimerId);
    copyResetTimerId = void 0;
  }
  function waitForSiteStripeAndInsertButton() {
    const MAX_RETRIES = 30;
    let retries = 0;
    const intervalId = setInterval(() => {
      retries++;
      const linkContainer = document.querySelector(SITESTRIPE_LINK_CONTAINER_SELECTOR);
      if (linkContainer) {
        clearInterval(intervalId);
        insertButtonAfterSiteStripe(() => {
          try {
            const productInfo = extractProductInfo(document, location.href);
            const embedHtml = generateEmbedHtml(productInfo);
            showModal(embedHtml);
          } catch (err) {
            console.error("[amazon-embed-link] 商品情報の取得に失敗しました:", err);
            alert(
              "[amazon-embed-link] 商品情報の取得に失敗しました。\nこのページはAmazon商品ページではないか、ASINを取得できませんでした。"
            );
          }
        });
        return;
      }
      if (retries >= MAX_RETRIES) {
        clearInterval(intervalId);
        console.warn(
          `[amazon-embed-link] SiteStripeが見つかりませんでした。`,
          `セレクタ: ${SITESTRIPE_LINK_CONTAINER_SELECTOR}`,
          `URL: ${location.href}`
        );
      }
    }, 500);
  }
  try {
    waitForSiteStripeAndInsertButton();
  } catch (err) {
    console.error("[amazon-embed-link] 初期化に失敗しました:", err);
  }

})();