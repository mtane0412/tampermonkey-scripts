/**
 * main.ts のDOM操作テスト
 * ボタン挿入・モーダル表示・クリップボードコピーの動作を検証する
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createEmbedButton, showModal, hideModal } from '../src/main';

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
  it('埋め込みリンクボタンを生成できる', () => {
    const button = createEmbedButton(() => {});
    expect(button).toBeInstanceOf(HTMLButtonElement);
    expect(button.textContent).toContain('埋め込みリンク');
  });

  it('クリック時にコールバックが呼ばれる', () => {
    const コールバック = vi.fn();
    const button = createEmbedButton(コールバック);
    button.click();
    expect(コールバック).toHaveBeenCalledOnce();
  });
});

describe('showModal / hideModal', () => {
  afterEach(() => {
    // 各テスト後にモーダルを後片付けする
    hideModal();
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
    // GM_setClipboardをスタブとして設定する
    const クリップボードスタブ = vi.fn();
    vi.stubGlobal('GM_setClipboard', クリップボードスタブ);

    const サンプルHTML = '<div>コピーテスト用HTML</div>';
    showModal(サンプルHTML);

    const コピーボタン = document.getElementById('amazon-embed-copy-button');
    expect(コピーボタン).not.toBeNull();
    コピーボタン?.click();

    expect(クリップボードスタブ).toHaveBeenCalledWith(サンプルHTML, 'text');

    vi.unstubAllGlobals();
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

  it('SiteStripeツールバーにボタンが挿入される', async () => {
    // insertButtonAfterSiteStripeを呼び出す
    const { insertButtonAfterSiteStripe } = await import('../src/main');
    insertButtonAfterSiteStripe(() => {});

    const container = document.getElementById('amazon-embed-button-container');
    expect(container).not.toBeNull();
  });
});
