/**
 * amazon-embed-link
 *
 * 目的: Amazon.co.jpの商品ページにブログ埋め込み用HTMLカードを生成するボタンを追加する
 * 対象: https://www.amazon.co.jp/dp/* 等の商品詳細ページ
 *
 * 動作:
 * 1. Amazonアソシエイトのサイトストライプ（SiteStripe）ツールバーに「埋め込みリンク」ボタンを追加する
 * 2. ボタンクリック時に商品情報をページから取得し、埋め込みHTMLカードを生成する
 * 3. モーダルでプレビューを表示し、HTMLをクリップボードにコピーできる
 */

import { extractProductInfo, generateEmbedHtml } from './logic';

/** モーダルオーバーレイのID */
const MODAL_OVERLAY_ID = 'amazon-embed-modal-overlay';

/** ボタンコンテナのID */
const BUTTON_CONTAINER_ID = 'amazon-embed-button-container';

/** SiteStripeのリンク生成コンテナのセレクタ */
const SITESTRIPE_LINK_CONTAINER_SELECTOR = '#amzn-ss-get-link-container';

/**
 * 埋め込みリンク生成ボタンを作成する
 * Amazon SiteStripeの「リンク生成」ボタンと同じスタイルで表示する
 *
 * @param onClick - ボタンクリック時のコールバック
 * @returns 生成したボタン要素
 */
export function createEmbedButton(onClick: () => void): HTMLButtonElement {
  const button = document.createElement('button');
  button.id = 'amazon-embed-link-button';
  button.className = 'a-button-text';
  button.textContent = '埋め込みリンク';
  button.setAttribute('aria-label', '埋め込みリンク');
  button.type = 'button';
  button.style.cssText = `
    background: #e77600;
    border: 1px solid #c45500;
    border-radius: 3px;
    color: #111;
    cursor: pointer;
    font-size: 13px;
    font-weight: 700;
    padding: 0 10px 0 11px;
    height: 29px;
    line-height: 29px;
    white-space: nowrap;
  `;
  button.addEventListener('click', onClick);
  return button;
}

/**
 * SiteStripeツールバーの「リンク生成」ボタンの隣に埋め込みボタンを挿入する
 *
 * @param onClick - ボタンクリック時のコールバック
 */
export function insertButtonAfterSiteStripe(onClick: () => void): void {
  const linkContainer = document.querySelector(SITESTRIPE_LINK_CONTAINER_SELECTOR);
  if (!linkContainer) {
    return;
  }

  // 既にボタンが挿入済みの場合はスキップする
  if (document.getElementById(BUTTON_CONTAINER_ID)) {
    return;
  }

  const container = document.createElement('div');
  container.id = BUTTON_CONTAINER_ID;
  container.className = 'amzn-ss-link-container';
  container.style.cssText = 'display: inline-block; margin-left: 8px; vertical-align: middle;';

  const button = createEmbedButton(onClick);
  container.appendChild(button);

  // 「リンク生成」コンテナの直後に挿入する
  linkContainer.insertAdjacentElement('afterend', container);
}

/**
 * 埋め込みHTMLカードのプレビューモーダルを表示する
 *
 * @param html - 表示する埋め込みHTML文字列
 */
export function showModal(html: string): void {
  // 既にモーダルが存在する場合は一度削除する
  hideModal();

  const overlay = document.createElement('div');
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

  // オーバーレイクリックで閉じる（モーダル内部のクリックは伝播しない）
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      hideModal();
    }
  });

  const modal = document.createElement('div');
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

  // ヘッダー
  const header = document.createElement('div');
  header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;';
  const title = document.createElement('h2');
  title.textContent = '埋め込みHTMLカード';
  title.style.cssText = 'margin: 0; font-size: 18px; color: #111;';
  const closeButton = document.createElement('button');
  closeButton.id = 'amazon-embed-close-button';
  closeButton.textContent = '✕ 閉じる';
  closeButton.style.cssText = `
    background: none;
    border: 1px solid #ccc;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    padding: 4px 12px;
    color: #555;
  `;
  closeButton.addEventListener('click', hideModal);
  header.appendChild(title);
  header.appendChild(closeButton);

  // プレビューセクション
  const previewLabel = document.createElement('p');
  previewLabel.textContent = 'プレビュー';
  previewLabel.style.cssText = 'font-weight: 600; margin: 0 0 8px 0; font-size: 14px; color: #555;';

  const preview = document.createElement('div');
  preview.id = 'amazon-embed-preview';
  preview.style.cssText = 'border: 1px solid #ddd; border-radius: 4px; padding: 16px; margin-bottom: 16px; background: #fafafa;';
  // プレビューにHTMLを安全に挿入する（ユーザーが生成したHTML）
  preview.innerHTML = html;

  // HTMLコードセクション
  const codeLabel = document.createElement('p');
  codeLabel.textContent = 'HTMLコード';
  codeLabel.style.cssText = 'font-weight: 600; margin: 0 0 8px 0; font-size: 14px; color: #555;';

  const textarea = document.createElement('textarea');
  textarea.id = 'amazon-embed-textarea';
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

  // コピーボタン
  const copyButton = document.createElement('button');
  copyButton.id = 'amazon-embed-copy-button';
  copyButton.textContent = 'HTMLをコピー';
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
  // コピー後のラベル復元タイマーID（モーダル閉鎖時にキャンセルするため保持する）
  let copyResetTimerId: ReturnType<typeof setTimeout> | undefined;
  copyButton.addEventListener('click', () => {
    GM_setClipboard(html, 'text');
    copyButton.textContent = 'コピーしました！';
    // 既存のタイマーをキャンセルしてから新しいタイマーを設定する
    clearTimeout(copyResetTimerId);
    copyResetTimerId = setTimeout(() => {
      // モーダルがすでに閉じている場合はDOMを操作しない
      if (document.getElementById(MODAL_OVERLAY_ID)) {
        copyButton.textContent = 'HTMLをコピー';
      }
    }, 2000);
  });

  modal.appendChild(header);
  modal.appendChild(previewLabel);
  modal.appendChild(preview);
  modal.appendChild(codeLabel);
  modal.appendChild(textarea);
  modal.appendChild(copyButton);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}

/**
 * モーダルオーバーレイをDOMから削除する
 */
export function hideModal(): void {
  const overlay = document.getElementById(MODAL_OVERLAY_ID);
  overlay?.remove();
}

/**
 * SiteStripeツールバーの読み込みを待機し、ボタンを挿入する
 * SiteStripeは非同期で読み込まれるため、setIntervalでポーリングする
 */
function waitForSiteStripeAndInsertButton(): void {
  const MAX_RETRIES = 30;
  let retries = 0;

  const intervalId = setInterval(() => {
    retries++;
    const linkContainer = document.querySelector(SITESTRIPE_LINK_CONTAINER_SELECTOR);

    if (linkContainer) {
      clearInterval(intervalId);
      insertButtonAfterSiteStripe(() => {
        const productInfo = extractProductInfo(document, location.href);
        const embedHtml = generateEmbedHtml(productInfo);
        showModal(embedHtml);
      });
      return;
    }

    if (retries >= MAX_RETRIES) {
      clearInterval(intervalId);
      // MAX_RETRIES回試行してもSiteStripeが見つからなかった場合はデバッグ用にログを出力する
      console.warn(
        `[amazon-embed-link] SiteStripeが見つかりませんでした。`,
        `セレクタ: ${SITESTRIPE_LINK_CONTAINER_SELECTOR}`,
        `URL: ${location.href}`,
      );
    }
  }, 500);
}

try {
  waitForSiteStripeAndInsertButton();
} catch (err) {
  console.error('[amazon-embed-link] 初期化に失敗しました:', err);
}
