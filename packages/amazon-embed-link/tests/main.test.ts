/**
 * main.ts のDOM操作テスト
 * ボタン挿入・モーダル表示・クリップボードコピーの動作を検証する
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createEmbedButton, insertButtonAfterSiteStripe, showModal, hideModal } from '../src/main';

/** テスト用のモックSiteStripeツールバーHTMLを生成する */
function createMockSiteStripe(): HTMLElement {
  const toolbar = document.createElement('div');
  toolbar.id = 'nav-AssociateStripe';
  toolbar.innerHTML = `
    <div class="amzn-ss-wrap" id="amzn-ss-wrap">
      <div class="amzn-ss-link-container amzn-ss-get-link-container" id="amzn-ss-get-link-container">
        <span id="amzn-ss-text-link">
          <button id="amzn-ss-get-link-button" class="a-button a-button-primary">リンク生成</button>
        </span>
      </div>
    </div>
  `;
  return toolbar;
}

describe('createEmbedButton', () => {
  it('AmazonのDOMボタン構造（span.a-button > span.a-button-inner > button.a-button-text）で生成できる', () => {
    // AmazonのCSSはspan.a-button > span.a-button-inner > button.a-button-textという
    // 3層構造を前提としており、この構造に合わせることで高さ・幅が正しく表示される
    const container = createEmbedButton(() => {});
    expect(container).toBeInstanceOf(HTMLSpanElement);
    const inner = container.querySelector('.a-button-inner');
    const button = inner?.querySelector('button.a-button-text');
    expect(inner).not.toBeNull();
    expect(button).toBeInstanceOf(HTMLButtonElement);
    expect(container.textContent).toContain('埋め込みリンク');
  });

  it('外側のspanにAmazonのa-button a-button-primaryクラスが設定されている（スタイル統一）', () => {
    // Amazonのa-buttonコンポーネント構造に合わせて外側spanにクラスを設定する
    const container = createEmbedButton(() => {});
    expect(container.classList.contains('a-button')).toBe(true);
    expect(container.classList.contains('a-button-primary')).toBe(true);
  });

  it('外側のspanにaria-labelが設定されている（アクセシビリティ）', () => {
    const container = createEmbedButton(() => {});
    expect(container.getAttribute('aria-label')).toBe('埋め込みリンク');
  });

  it('内側のbuttonクリック時にコールバックが呼ばれる', () => {
    const コールバック = vi.fn();
    const container = createEmbedButton(コールバック);
    // クリックイベントは内側のbutton要素に登録されている
    const innerButton = container.querySelector('button');
    innerButton?.click();
    expect(コールバック).toHaveBeenCalledOnce();
  });
});

describe('showModal / hideModal', () => {
  afterEach(() => {
    // 各テスト後にモーダルを後片付けし、グローバルスタブをリセットする
    hideModal();
    vi.unstubAllGlobals();
  });

  it('showModalを呼ぶとDOMにオーバーレイが追加される', () => {
    showModal('<p>テスト用HTML</p>');
    const overlay = document.getElementById('amazon-embed-modal-overlay');
    expect(overlay).not.toBeNull();
  });

  it('モーダル内にプレビューが表示される', () => {
    showModal('<p>プレビューテスト</p>');
    const preview = document.getElementById('amazon-embed-preview');
    expect(preview).not.toBeNull();
  });

  it('モーダル内にHTMLコードのtextareaが表示される', () => {
    const サンプルHTML = '<div>テスト埋め込みHTML</div>';
    showModal(サンプルHTML);
    const textarea = document.getElementById('amazon-embed-textarea') as HTMLTextAreaElement | null;
    expect(textarea).not.toBeNull();
    expect(textarea?.value).toBe(サンプルHTML);
  });

  it('hideModalを呼ぶとオーバーレイがDOMから削除される', () => {
    showModal('<p>テスト</p>');
    hideModal();
    const overlay = document.getElementById('amazon-embed-modal-overlay');
    expect(overlay).toBeNull();
  });

  it('コピーボタンクリック時にGM_setClipboardが呼ばれる', () => {
    // GM_setClipboardをスタブとして設定する（afterEachでunstubAllGlobalsが呼ばれる）
    const クリップボードスタブ = vi.fn();
    vi.stubGlobal('GM_setClipboard', クリップボードスタブ);

    const サンプルHTML = '<div>コピーテスト用HTML</div>';
    showModal(サンプルHTML);

    const コピーボタン = document.getElementById('amazon-embed-copy-button');
    expect(コピーボタン).not.toBeNull();
    コピーボタン?.click();

    expect(クリップボードスタブ).toHaveBeenCalledWith(サンプルHTML, 'text');
  });

  it('閉じるボタンクリック時にモーダルが閉じる', () => {
    showModal('<p>テスト</p>');
    const 閉じるボタン = document.getElementById('amazon-embed-close-button');
    閉じるボタン?.click();
    const overlay = document.getElementById('amazon-embed-modal-overlay');
    expect(overlay).toBeNull();
  });
});

describe('SiteStripeへのボタン挿入', () => {
  let toolbar: HTMLElement;

  beforeEach(() => {
    toolbar = createMockSiteStripe();
    document.body.appendChild(toolbar);
  });

  afterEach(() => {
    document.body.removeChild(toolbar);
    hideModal();
  });

  it('SiteStripeツールバーにボタンが挿入される', () => {
    insertButtonAfterSiteStripe(() => {});
    const container = document.getElementById('amazon-embed-button-container');
    expect(container).not.toBeNull();
  });

  it('コンテナにamzn-ss-link-containerとamzn-ss-get-link-containerクラスが設定される', () => {
    // 「リンク生成」コンテナと同じクラス構成でレイアウトを統一する
    insertButtonAfterSiteStripe(() => {});
    const container = document.getElementById('amazon-embed-button-container');
    expect(container?.classList.contains('amzn-ss-link-container')).toBe(true);
    expect(container?.classList.contains('amzn-ss-get-link-container')).toBe(true);
  });

  it('コンテナにstyle属性が付かない（Amazonのクラスに委ねる）', () => {
    // 独自インラインスタイルを使わずAmazon既存CSSクラスに従う
    insertButtonAfterSiteStripe(() => {});
    const container = document.getElementById('amazon-embed-button-container');
    expect(container?.getAttribute('style')).toBeFalsy();
  });

  it('ボタンにwidth:100%が設定される（コンテナ幅に合わせて表示）', () => {
    // リンク生成ボタンはa-declarativeスパンでラップされブロック表示されるため
    // 同等の幅を確保するためbuttonにwidth:100%を設定する
    insertButtonAfterSiteStripe(() => {});
    const button = document.getElementById('amazon-embed-link-button');
    expect(button).not.toBeNull();
    expect((button as HTMLElement).style.width).toBe('100%');
  });
});
