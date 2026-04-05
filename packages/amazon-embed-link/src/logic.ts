/**
 * Amazon商品ページの情報抽出と埋め込みHTMLカード生成ロジック
 *
 * このモジュールはすべて純粋関数で構成され、DOMへの副作用を持たない。
 * テスト容易性のため、すべてのDOM依存は引数として受け取る。
 */

/** アソシエイトタグ */
const ASSOCIATE_TAG = 'mtane0412-22';

/** AmazonベースURL */
const AMAZON_BASE_URL = 'https://www.amazon.co.jp';

/** 説明文の最大表示文字数 */
const MAX_DESCRIPTION_LENGTH = 120;

/**
 * Amazon商品情報
 */
export interface ProductInfo {
  /** 商品タイトル */
  title: string;
  /** 商品画像URL */
  imageUrl: string;
  /** 商品説明文 */
  description: string;
  /** 価格（例: ¥4,158） */
  price: string;
  /** Amazon ASIN（10文字の英数字） */
  asin: string;
}

/**
 * URLからASINを抽出する
 * /dp/XXXXXXXXXX または /gp/product/XXXXXXXXXX 形式のURLに対応
 *
 * @param url - AmazonのURL
 * @returns ASIN（10文字の英数字）またはnull
 */
export function extractAsin(url: string): string | null {
  const match = /\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i.exec(url);
  return match?.[1] ?? null;
}

/**
 * テキストを指定した最大文字数で切り詰める
 *
 * @param text - 元のテキスト
 * @param maxLength - 最大文字数
 * @returns 切り詰めたテキスト（超過時は末尾に"..."を付加）
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength) + '...';
}

/**
 * アフィリエイトリンクURLを生成する
 *
 * @param asin - Amazon ASIN
 * @returns アソシエイトタグ付きのURL
 */
export function generateAffiliateUrl(asin: string): string {
  return `${AMAZON_BASE_URL}/dp/${asin}/ref=nosim?tag=${ASSOCIATE_TAG}`;
}

/**
 * ページDOMから商品情報を抽出する
 *
 * セレクタのフォールバック:
 * - title: #productTitle → document.title
 * - imageUrl: #landingImage → #imgBlkFront → #main-image
 * - description: meta[name="description"]
 * - price: .a-price .a-offscreen → #priceblock_ourprice → .a-price-whole
 * - asin: URLから抽出
 *
 * @param doc - Documentオブジェクト
 * @param url - 現在のページURL
 * @returns 抽出した商品情報
 */
export function extractProductInfo(doc: Document, url: string): ProductInfo {
  // タイトル抽出: #productTitle → document.title
  const title =
    doc.querySelector('#productTitle')?.textContent?.trim() ??
    doc.querySelector('#title')?.textContent?.trim() ??
    doc.title;

  // 画像URL抽出: #landingImage → #imgBlkFront → #main-image
  const imageUrl =
    (doc.querySelector('#landingImage') as HTMLImageElement | null)?.src ??
    (doc.querySelector('#imgBlkFront') as HTMLImageElement | null)?.src ??
    (doc.querySelector('#main-image') as HTMLImageElement | null)?.src ??
    '';

  // 説明文抽出: meta[name="description"]
  const rawDescription =
    (doc.querySelector('meta[name="description"]') as HTMLMetaElement | null)?.content ??
    doc.querySelector('#productDescription')?.textContent?.trim() ??
    '';
  const description = truncateText(rawDescription, MAX_DESCRIPTION_LENGTH);

  // 価格抽出: .a-price .a-offscreen → #priceblock_ourprice → .a-price-whole
  const price =
    doc.querySelector('.a-price .a-offscreen')?.textContent?.trim() ??
    doc.querySelector('#priceblock_ourprice')?.textContent?.trim() ??
    doc.querySelector('.a-price-whole')?.textContent?.trim() ??
    '';

  // ASIN抽出
  const asin = extractAsin(url) ?? '';

  return { title, imageUrl, description, price, asin };
}

/**
 * Amazon商品情報からブログ埋め込み用HTMLカードを生成する
 *
 * 生成されるHTMLはすべてインラインスタイルで記述されており、
 * 外部スタイルシートなしでブログに貼り付けて使用できる。
 * レスポンシブ対応のため <style> ブロックも含む。
 *
 * @param product - Amazon商品情報
 * @returns 自己完結型の埋め込みHTML文字列
 */
export function generateEmbedHtml(product: ProductInfo): string {
  const affiliateUrl = generateAffiliateUrl(product.asin);

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
      <img src="${product.imageUrl}"
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

/**
 * HTMLの特殊文字をエスケープする
 * XSSを防ぐため、生成するHTMLに埋め込むテキストに適用する
 *
 * @param text - エスケープするテキスト
 * @returns エスケープ済みテキスト
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
