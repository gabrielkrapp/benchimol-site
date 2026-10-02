// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, createElement, Fragment, StrictMode, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { Editor } from '@tiptap/core';
import { RichEditor } from '@/components/admin/RichEditor';

let root: Root | undefined;
const savedHtml = '<p>QA &amp; &lt; &gt; ação.</p><h2>Seção QA</h2><p><strong>Texto forte</strong> e normal &amp; &lt; &gt;.</p><ul><li><p>Primeiro item</p></li><li><p>Segundo item</p></li></ul><figure><img src="/api/media/11111111-1111-4111-8111-111111111111" alt="QA &amp; &lt; &gt;" /><figcaption>Legenda &amp; &lt; &gt; ação\nSegunda linha: ç, á, ñ</figcaption></figure><p></p>';

function SavedDraft({ disabled = false }: { disabled?: boolean }) {
  const [body, setBody] = useState(savedHtml);
  return createElement(Fragment, null,
    createElement('output', { 'aria-label': 'Estado do rascunho' }, body === savedHtml ? 'Salvo' : 'Alterado'),
    createElement(RichEditor, { html: body, onChange: setBody, disabled }),
  );
}

async function renderDraft(disabled = false) {
  if (!root) {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    document.body.innerHTML = '<div id="mount"></div>';
    root = createRoot(document.querySelector('#mount')!);
  }
  await act(async () => root!.render(createElement(StrictMode, null, createElement(SavedDraft, { disabled }))));
  await act(async () => {
    await vi.waitFor(() => expect(document.querySelector('[aria-label="Conteúdo do post"]')).not.toBeNull());
  });
}

afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  root = undefined;
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
});

describe('saved rich-editor state', () => {
  it('keeps the draft clean when opening sanitized HTML and toggling read-only state', async () => {
    await renderDraft();
    expect(document.querySelector('output')?.textContent).toBe('Salvo');
    expect(document.querySelector('[aria-label="Conteúdo do post"] img')?.getAttribute('alt')).toBe('QA & < >');
    await renderDraft(true);
    expect(document.querySelector('output')?.textContent).toBe('Salvo');
    expect(document.querySelector('.admin-editor')?.hasAttribute('inert')).toBe(true);
    await renderDraft(false);
    expect(document.querySelector('output')?.textContent).toBe('Salvo');
    expect(document.querySelector('.admin-editor')?.hasAttribute('inert')).toBe(false);
  });

  it('still propagates a real document edit to the draft', async () => {
    await renderDraft();
    const editor = (document.querySelector('[aria-label="Conteúdo do post"]') as HTMLElement & { editor: Editor }).editor;
    await act(async () => { editor.commands.insertContent('<p>Alteração real &amp; &lt; &gt;</p>'); });
    expect(document.querySelector('output')?.textContent).toBe('Alterado');
    expect(document.querySelector('[aria-label="Conteúdo do post"]')?.textContent).toContain('Alteração real & < >');
  });
});
