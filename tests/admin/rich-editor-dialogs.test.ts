// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, createElement, Fragment, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { Editor } from '@tiptap/core';
import { RichEditor } from '@/components/admin/RichEditor';

let root: Root | undefined;
const savedHtml = '<p>Texto para link.</p><figure><img src="/api/media/11111111-1111-4111-8111-111111111111" alt="Alt salvo" /><figcaption>Legenda salva\nSegunda linha</figcaption></figure><p></p>';
const showModal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal');
const close = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'close');
const rangeRects = Object.getOwnPropertyDescriptor(Range.prototype, 'getClientRects');
const rangeBounds = Object.getOwnPropertyDescriptor(Range.prototype, 'getBoundingClientRect');
let nativePrompt: typeof window.prompt;

function Draft() {
  const [html, setHtml] = useState(savedHtml);
  return createElement(Fragment, null,
    createElement('output', { 'aria-label': 'HTML do rascunho' }, html),
    createElement(RichEditor, { html, onChange: setHtml }),
  );
}

async function setup() {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  // JSDOM has no native dialog UI. Supply only its platform open/close boundary;
  // form state, validation, focus and editor commands stay real.
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value: function (this: HTMLDialogElement) { this.open = true; } });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value: function (this: HTMLDialogElement) { this.open = false; this.dispatchEvent(new Event('close')); } });
  // ProseMirror scrolls the selection after focus; JSDOM does not lay out ranges.
  Object.defineProperty(Range.prototype, 'getClientRects', { configurable: true, value: () => [new DOMRect()] });
  Object.defineProperty(Range.prototype, 'getBoundingClientRect', { configurable: true, value: () => new DOMRect() });
  nativePrompt = window.prompt;
  window.prompt = () => null;
  document.body.innerHTML = '<div id="mount"></div>';
  root = createRoot(document.querySelector('#mount')!);
  await act(async () => root!.render(createElement(Draft)));
  await act(async () => { await vi.waitFor(() => expect(document.querySelector('[aria-label="Conteúdo do post"]')).not.toBeNull()); });
  return (document.querySelector('[aria-label="Conteúdo do post"]') as HTMLElement & { editor: Editor }).editor;
}

function button(text: string, scope: ParentNode = document) {
  const found = [...scope.querySelectorAll<HTMLButtonElement>('button')].find(item => item.textContent?.trim() === text);
  expect(found, `button ${text}`).toBeDefined();
  return found!;
}
function dialog() {
  const found = document.querySelector<HTMLDialogElement>('dialog[open]');
  expect(found, 'accessible editor dialog').not.toBeNull();
  return found!;
}
async function click(text: string, scope: ParentNode = document) {
  await act(async () => button(text, scope).click());
}
async function fill(name: string, value: string) {
  const field = [...dialog().querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input,textarea')].find(item => item.closest('label')?.textContent?.includes(name));
  expect(field, name).toBeDefined();
  const prototype = field instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  await act(async () => {
    Object.getOwnPropertyDescriptor(prototype, 'value')!.set!.call(field, value);
    field!.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
async function submit() {
  await act(async () => dialog().querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
}

afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  root = undefined;
  document.body.innerHTML = '';
  window.prompt = nativePrompt;
  if (showModal) Object.defineProperty(HTMLDialogElement.prototype, 'showModal', showModal);
  else Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal');
  if (close) Object.defineProperty(HTMLDialogElement.prototype, 'close', close);
  else Reflect.deleteProperty(HTMLDialogElement.prototype, 'close');
  if (rangeRects) Object.defineProperty(Range.prototype, 'getClientRects', rangeRects);
  else Reflect.deleteProperty(Range.prototype, 'getClientRects');
  if (rangeBounds) Object.defineProperty(Range.prototype, 'getBoundingClientRect', rangeBounds);
  else Reflect.deleteProperty(Range.prototype, 'getBoundingClientRect');
  vi.unstubAllGlobals();
});

describe('rich-editor accessible input dialogs', () => {
  it('adds and removes a selected text link through the form without native prompts', async () => {
    const editor = await setup();
    await act(async () => { editor.commands.setTextSelection({ from: 1, to: 6 }); });
    await click('Link');
    expect(dialog().querySelector('h2')?.textContent).toBe('Configurar link');
    await fill('Endereço do link', '/exames/');
    await submit();
    expect(document.querySelector('[aria-label="Conteúdo do post"] a')?.getAttribute('href')).toBe('/exames/');
    expect(document.querySelector('dialog[open]')).toBeNull();
    await act(async () => { editor.commands.setTextSelection({ from: 1, to: 6 }); });
    await click('Link');
    expect(dialog().querySelector('input')?.value).toBe('/exames/');
    await fill('Endereço do link', '');
    await submit();
    expect(document.querySelector('[aria-label="Conteúdo do post"] a')).toBeNull();
    expect(document.querySelector('[aria-label="Conteúdo do post"]')?.textContent).toContain('Texto para link.');
  });

  it('keeps an invalid link in the dialog without modifying the draft', async () => {
    await setup();
    await click('Link');
    await fill('Endereço do link', 'javascript:alert(1)');
    await submit();
    expect(dialog().querySelector('[role="alert"]')?.textContent).toContain('Use um endereço');
    expect(dialog().querySelector('input')?.value).toBe('javascript:alert(1)');
    expect(document.querySelector('output')?.textContent).toBe(savedHtml);
  });

  it('rejects other video providers and inserts an HTTPS YouTube video', async () => {
    await setup();
    await click('Vídeo');
    await fill('Endereço do vídeo', 'https://example.invalid/video');
    await submit();
    expect(dialog().querySelector('[role="alert"]')?.textContent).toContain('HTTPS do YouTube');
    expect(document.querySelector('[aria-label="Conteúdo do post"] iframe')).toBeNull();
    await fill('Endereço do vídeo', 'https://www.youtube.com/watch?v=abcdefghijk');
    await submit();
    expect(document.querySelector('[aria-label="Conteúdo do post"] iframe')?.getAttribute('src')).toContain('https://www.youtube-nocookie.com/embed/abcdefghijk');
    expect(document.querySelector('dialog[open]')).toBeNull();
  });

  it('keeps a YouTube URL without an embeddable video open without changing the draft', async () => {
    await setup();
    await click('Vídeo');
    await fill('Endereço do vídeo', 'https://www.youtube.com/channel/clinic');
    await submit();
    expect(dialog().querySelector('[role="alert"]')?.textContent).toContain('vídeo do YouTube');
    expect(dialog().querySelector('input')?.value).toBe('https://www.youtube.com/channel/clinic');
    expect(document.querySelector('output')?.textContent).toBe(savedHtml);
    expect(document.querySelector('[aria-label="Conteúdo do post"] iframe')).toBeNull();
  });

  it('edits the selected image alt and multiline caption without losing literal characters', async () => {
    const editor = await setup();
    let imagePosition = -1;
    editor.state.doc.descendants((node, position) => { if (node.type.name === 'image') imagePosition = position; });
    await act(async () => { editor.commands.setNodeSelection(imagePosition); });
    await click('Alt e legenda');
    expect(dialog().querySelector('input')?.value).toBe('Alt salvo');
    expect(dialog().querySelector('textarea')?.value).toBe('Legenda salva\nSegunda linha');
    await fill('Texto alternativo da imagem', 'Olho & < > ação');
    await fill('Legenda da imagem', 'Legenda & < > ação\nSegunda linha');
    await submit();
    expect(document.querySelector('[aria-label="Conteúdo do post"] img')?.getAttribute('alt')).toBe('Olho & < > ação');
    expect(document.querySelector('[aria-label="Conteúdo do post"] figcaption')?.textContent).toBe('Legenda & < > ação\nSegunda linha');
  });

  it('cancels and dismisses with Escape without changing the saved draft', async () => {
    await setup();
    const trigger = button('Vídeo');
    trigger.focus();
    await click('Vídeo');
    expect(document.activeElement).toBe(dialog().querySelector('input'));
    await fill('Endereço do vídeo', 'https://www.youtube.com/watch?v=abcdefghijk');
    await click('Cancelar', dialog());
    expect(document.querySelector('output')?.textContent).toBe(savedHtml);
    expect(document.activeElement).toBe(trigger);
    trigger.focus();
    await click('Vídeo');
    await act(async () => dialog().dispatchEvent(new Event('cancel', { cancelable: true })));
    expect(document.querySelector('dialog[open]')).toBeNull();
    expect(document.querySelector('output')?.textContent).toBe(savedHtml);
    expect(document.activeElement).toBe(trigger);
  });
});
