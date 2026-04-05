/**
 * logic.ts の純粋関数テスト
 * 商品情報抽出・HTML生成ロジックの単体テスト
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  extractAsin,
  extractProductInfo,
  generateAffiliateUrl,
  generateEmbedHtml,
  truncateText,
} from '../src/logic';

describe('extractAsin', () => {
  it('/dp/ASIN形式のURLからASINを抽出できる', () => {
    expect(extractAsin('https://www.amazon.co.jp/dp/B08NNJZGXN/')).toBe('B08NNJZGXN');
  });

  it('/*/dp/ASIN形式のURLからASINを抽出できる', () => {
    expect(extractAsin('https://www.amazon.co.jp/商品名/dp/B08NNJZGXN/')).toBe('B08NNJZGXN');
  });

  it('/gp/product/ASIN形式のURLからASINを抽出できる', () => {
    expect(extractAsin('https://www.amazon.co.jp/gp/product/B08NNJZGXN')).toBe('B08NNJZGXN');
  });

  it('クエリパラメータ付きURLからASINを抽出できる', () => {
    expect(extractAsin('https://www.amazon.co.jp/dp/B08NNJZGXN?ref=sr_1_1')).toBe('B08NNJZGXN');
  });

  it('商品URLでない場合はnullを返す', () => {
    expect(extractAsin('https://www.amazon.co.jp/')).toBeNull();
    expect(extractAsin('https://www.amazon.co.jp/s?k=テスト')).toBeNull();
  });
});

describe('truncateText', () => {
  it('最大文字数以下のテキストはそのまま返す', () => {
    expect(truncateText('短いテキスト', 100)).toBe('短いテキスト');
  });

  it('最大文字数を超えるテキストは最大文字数以内に切り詰め省略記号を付ける', () => {
    const テキスト = 'あ'.repeat(150);
    const 結果 = truncateText(テキスト, 100);
    // maxLength以内に収まる（省略記号3文字分を考慮して97文字 + '...' = 100文字）
    expect(結果.length).toBeLessThanOrEqual(100);
    expect(結果.endsWith('...')).toBe(true);
  });

  it('ちょうど最大文字数のテキストはそのまま返す', () => {
    const テキスト = 'あ'.repeat(100);
    expect(truncateText(テキスト, 100)).toBe(テキスト);
  });

  it('maxLength=0の場合は空文字を返す', () => {
    expect(truncateText('テキスト', 0)).toBe('');
  });

  it('maxLength=1の場合は長さ1以内に収まる', () => {
    const 結果 = truncateText('テキスト', 1);
    expect(結果.length).toBeLessThanOrEqual(1);
  });

  it('maxLength=2の場合は長さ2以内に収まる', () => {
    const 結果 = truncateText('テキスト', 2);
    expect(結果.length).toBeLessThanOrEqual(2);
  });
});

describe('generateAffiliateUrl', () => {
  it('正しいアフィリエイトURLを生成する', () => {
    expect(generateAffiliateUrl('B08NNJZGXN')).toBe(
      'https://www.amazon.co.jp/dp/B08NNJZGXN/ref=nosim?tag=mtane0412-22',
    );
  });

  it('空のASINの場合はエラーをスローする', () => {
    expect(() => generateAffiliateUrl('')).toThrow('Invalid ASIN');
  });

  it('10文字未満のASINの場合はエラーをスローする', () => {
    expect(() => generateAffiliateUrl('B08NNJ')).toThrow('Invalid ASIN');
  });

  it('英数字以外を含むASINの場合はエラーをスローする', () => {
    expect(() => generateAffiliateUrl('B08NNJZGX!')).toThrow('Invalid ASIN');
  });
});

describe('extractProductInfo', () => {
  let doc: Document;

  beforeEach(() => {
    doc = document.implementation.createHTMLDocument('テスト商品ページ');
  });

  it('#productTitleからタイトルを抽出できる', () => {
    doc.body.innerHTML = `
      <span id="productTitle">テスト商品タイトル　</span>
      <img id="landingImage" src="https://example.com/image.jpg" />
    `;
    const info = extractProductInfo(doc, 'https://www.amazon.co.jp/dp/B08NNJZGXN');
    expect(info.title).toBe('テスト商品タイトル');
  });

  it('#productTitleがない場合はdocument.titleにフォールバックする', () => {
    doc.title = 'ドキュメントタイトル';
    doc.body.innerHTML = `
      <img id="landingImage" src="https://example.com/image.jpg" />
    `;
    const info = extractProductInfo(doc, 'https://www.amazon.co.jp/dp/B08NNJZGXN');
    expect(info.title).toBe('ドキュメントタイトル');
  });

  it('#landingImageから画像URLを抽出できる', () => {
    doc.body.innerHTML = `
      <span id="productTitle">テスト商品</span>
      <img id="landingImage" src="https://m.media-amazon.com/images/product.jpg" />
    `;
    const info = extractProductInfo(doc, 'https://www.amazon.co.jp/dp/B08NNJZGXN');
    expect(info.imageUrl).toBe('https://m.media-amazon.com/images/product.jpg');
  });

  it('meta[name="description"]から説明を抽出できる', () => {
    // metaタグはheadに挿入する（bodyではなくheadが正しい位置）
    const meta = doc.createElement('meta');
    meta.setAttribute('name', 'description');
    meta.setAttribute('content', 'これは商品の説明文です。');
    doc.head.appendChild(meta);
    doc.body.innerHTML = `<span id="productTitle">テスト商品</span>`;
    const info = extractProductInfo(doc, 'https://www.amazon.co.jp/dp/B08NNJZGXN');
    expect(info.description).toBe('これは商品の説明文です。');
  });

  it('.a-price .a-offscreenから価格を抽出できる', () => {
    doc.body.innerHTML = `
      <span id="productTitle">テスト商品</span>
      <span class="a-price"><span class="a-offscreen">¥1,234</span></span>
    `;
    const info = extractProductInfo(doc, 'https://www.amazon.co.jp/dp/B08NNJZGXN');
    expect(info.price).toBe('¥1,234');
  });

  it('URLからASINを抽出できる', () => {
    doc.body.innerHTML = `<span id="productTitle">テスト商品</span>`;
    const info = extractProductInfo(doc, 'https://www.amazon.co.jp/dp/B08NNJZGXN');
    expect(info.asin).toBe('B08NNJZGXN');
  });

  it('#productTitleが空文字の場合は#titleにフォールバックする', () => {
    // 空のプレースホルダ要素が存在してもフォールバックが機能すること
    doc.body.innerHTML = `
      <span id="productTitle">   </span>
      <span id="title">フォールバックタイトル</span>
    `;
    const info = extractProductInfo(doc, 'https://www.amazon.co.jp/dp/B08NNJZGXN');
    expect(info.title).toBe('フォールバックタイトル');
  });

  it('要素が見つからない場合は空文字を返す', () => {
    const info = extractProductInfo(doc, 'https://www.amazon.co.jp/dp/B08NNJZGXN');
    expect(info.imageUrl).toBe('');
    expect(info.price).toBe('');
    expect(info.description).toBe('');
  });
});

describe('generateEmbedHtml', () => {
  const サンプル商品 = {
    title: 'テスト商品タイトル',
    imageUrl: 'https://m.media-amazon.com/images/test.jpg',
    description: 'テスト商品の説明文です。',
    price: '¥4,158',
    asin: 'B08NNJZGXN',
  };

  it('アフィリエイトURLを含む', () => {
    const html = generateEmbedHtml(サンプル商品);
    expect(html).toContain('https://www.amazon.co.jp/dp/B08NNJZGXN/ref=nosim?tag=mtane0412-22');
  });

  it('商品タイトルを含む', () => {
    const html = generateEmbedHtml(サンプル商品);
    expect(html).toContain('テスト商品タイトル');
  });

  it('商品画像URLを含む', () => {
    const html = generateEmbedHtml(サンプル商品);
    expect(html).toContain('https://m.media-amazon.com/images/test.jpg');
  });

  it('価格を含む', () => {
    const html = generateEmbedHtml(サンプル商品);
    expect(html).toContain('¥4,158');
  });

  it('"Amazonで見る"テキストを含む', () => {
    const html = generateEmbedHtml(サンプル商品);
    expect(html).toContain('Amazonで見る');
  });

  it('レスポンシブ用<style>ブロックを含む', () => {
    const html = generateEmbedHtml(サンプル商品);
    expect(html).toContain('<style>');
    expect(html).toContain('@media');
  });

  it('amazon-link-cardクラスを含む', () => {
    const html = generateEmbedHtml(サンプル商品);
    expect(html).toContain('amazon-link-card');
  });

  it('タイトルにHTMLタグが含まれる場合はエスケープされる（XSS対策）', () => {
    const XSS危険商品 = {
      ...サンプル商品,
      title: '<script>alert("xss")</script>悪意のある商品',
      description: '<img src=x onerror=alert(1)>説明文',
    };
    const html = generateEmbedHtml(XSS危険商品);
    // 生のスクリプトタグが含まれていないことを確認
    expect(html).not.toContain('<script>alert("xss")</script>');
    // エスケープされた形式が含まれていることを確認
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<img src=x onerror=alert(1)>');
  });
});
