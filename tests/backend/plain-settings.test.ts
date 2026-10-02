// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { parseContact, parsePopup, parsePostCreate, parsePostPatch } from '@/lib/domain/validation';
import { mapPost, mapRevision, mapSettings } from '@/lib/server/mappers';
import { getContactRevisions } from '@/lib/server/admin-repository';
import { whatsappUrl } from '@/lib/public/html';
import { whatsappLink } from '@/lib/admin/helpers';
import { PublicInteractions } from '@/components/public/Interactions';
import { renderCapturedHtml } from '@/lib/public/render';
import { templates } from '@/lib/public/catalog';

const requireAdmin = vi.hoisted(() => vi.fn());
vi.mock('@/lib/server/auth', () => ({ requireAdmin }));
vi.mock('server-only', () => ({}));
let reactRoot: Root | undefined;
const showModal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal');
afterEach(async () => {
  if (reactRoot) await act(async () => reactRoot?.unmount());
  reactRoot = undefined;
  document.body.innerHTML = '';
  sessionStorage.clear();
  if (showModal) Object.defineProperty(HTMLDialogElement.prototype, 'showModal', showModal);
  else Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal');
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  requireAdmin.mockReset();
});

const popup = { title: '', text: '', active: false, startsAt: null, endsAt: null };
const timestamp = '2026-10-01T00:00:00Z';

describe('literal plain-text settings', () => {
  it('preserves literal message characters through save parsing and both WhatsApp links', () => {
    for (const message of ['Consultas & exames', '5 < 10 e 20 > 15', 'Marcar <avaliação> hoje', 'Exemplo literal &amp; e &lt;', 'Primeira linha\nSegunda & terceira']) {
      let parsed = parseContact({ whatsapp: '+55 (21) 99999-1234', message: `  ${message}  `, version: 1 });
      expect(parsed.message).toBe(message);
      for (let repeat = 0; repeat < 3; repeat++) parsed = parseContact(parsed);
      expect(parsed.message).toBe(message);
      expect(new URL(whatsappUrl(parsed)).searchParams.get('text')).toBe(message);
      expect(new URL(whatsappLink(parsed.whatsapp, parsed.message)!).searchParams.get('text')).toBe(message);
    }
  });

  it('returns stored contact and popup text unchanged rather than serializing it as HTML on GET', () => {
    const settings = mapSettings([
      { key: 'contact', value: { whatsapp: '5521999991234', message: 'Consultas & exames <avaliação>' }, version: 2, updated_at: timestamp },
      { key: 'popup', value: { ...popup, title: 'Aviso & feriado <2026>', text: 'Horário > 8h & < 18h\nTexto &amp; literal' }, version: 3, updated_at: timestamp },
    ]);
    expect(settings.contact.message).toBe('Consultas & exames <avaliação>');
    expect(settings.popup.title).toBe('Aviso & feriado <2026>');
    expect(settings.popup.text).toBe('Horário > 8h & < 18h\nTexto &amp; literal');
    expect(settings.contact.version).toBe(2);
    expect(settings.popup.version).toBe(3);
  });

  it('shows popup angle brackets and ampersands as text without creating executable elements', async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value: function (this: HTMLDialogElement) { this.open = true; } });
    const parsed = parsePopup({ ...popup, title: 'Aviso & <feriado>', text: 'Comparação: 5 < 10 & 20 > 15\n<script>alert("teste")</script>', active: true, version: 908 });
    document.body.innerHTML = '<div class="public-site"><div id="mount"></div></div>';
    reactRoot = createRoot(document.querySelector('#mount')!);
    await act(async () => reactRoot!.render(createElement(PublicInteractions, { popup: { ...parsed, updatedAt: timestamp } })));
    expect(document.querySelector('dialog')?.open).toBe(true);
    expect(document.querySelector('#public-dialog-title')?.textContent).toBe('Aviso & <feriado>');
    expect(document.querySelector('.public-notice-text')?.textContent).toBe('Comparação: 5 < 10 & 20 > 15\n<script>alert("teste")</script>');
    expect(document.querySelector('dialog script, dialog feriado')).toBeNull();
  });

  it('preserves the literal message in contact revision previews as well as current settings', async () => {
    const row = { id: 'revision-2', version: 2, created_at: timestamp, actor_name: 'Gabriel & equipe <admin>', snapshot: { value: { whatsapp: '5521999991234', message: 'Histórico & revisão <anterior>' }, version: 1, updated_at: timestamp } };
    const query = { select: () => query, eq: () => query, order: () => query, range: async () => ({ data: [row], error: null }) };
    requireAdmin.mockResolvedValue({ client: { from: () => query } });
    const revisions = await getContactRevisions();
    expect(revisions).toHaveLength(1);
    expect(revisions[0].actorName).toBe('Gabriel & equipe <admin>');
    expect(revisions[0].snapshot.message).toBe('Histórico & revisão <anterior>');
    expect(new URL(whatsappUrl(revisions[0].snapshot)).searchParams.get('text')).toBe('Histórico & revisão <anterior>');
  });
});

describe('literal post editorial fields', () => {
  it('preserves characters and literal entities in create and patch without weakening rich HTML sanitization', () => {
    for (const value of ['Clínica & equipe', 'Comparação < 10 e > 5', '<script>alert("texto")</script>', 'Entidade literal &amp;']) {
      const input = { title: `  ${value}  `, slug: 'texto-literal', authorName: value, featuredAlt: value, excerptHtml: '<p>Texto & exame<script>alert(1)</script></p>', bodyHtml: '<h2>Texto & exame</h2><script>alert(1)</script>' };
      const created = parsePostCreate(input);
      const patched = parsePostPatch({ ...input, status: 'draft', version: 1, publishedAt: null });
      for (const parsed of [created, patched]) {
        expect(parsed.title).toBe(value);
        expect(parsed.authorName).toBe(value);
        expect(parsed.featuredAlt).toBe(value);
        expect(parsed.excerptHtml).toBe('<p>Texto &amp; exame</p>');
        expect(parsed.bodyHtml).toBe('<h2>Texto &amp; exame</h2>');
      }
      expect(patched.publishedAt).toBeNull();
    }
  });

  it('maps current posts and revisions to literal text and safely escapes it at the real article HTML sink', () => {
    const title = 'Consultas & <script>alert("título")</script> &amp;';
    const author = 'Clínica & equipe <médica>';
    const alt = 'Olho & retina <imagem> &amp;';
    const row = { id: 'post-literal', wp_id: null, slug: 'texto-literal', public_path: '/texto-literal/', title, author_name: author, featured_alt: alt, featured_image: '/wp-content/uploads/teste.webp', excerpt_html: '<p>Resumo & exame</p>', body_html: '<h2>Seção & exame</h2><p>Texto & exame</p>', status: 'published', published_at: timestamp, created_at: timestamp, updated_at: timestamp, version: 1, category_ids: [], tag_ids: [], body_edit_mode: 'rich', publication_sync: 'current' };
    const mapped = mapPost(row);
    const revision = mapRevision({ id: 'post-revision', post_id: row.id, version: 1, created_at: timestamp, actor_name: 'Gabriel & equipe <editor>', snapshot: row });
    for (const post of [mapped, revision.snapshot]) {
      expect(post.title).toBe(title);
      expect(post.authorName).toBe(author);
      expect(post.featuredAlt).toBe(alt);
    }
    expect(revision.actorName).toBe('Gabriel & equipe <editor>');
    document.body.innerHTML = renderCapturedHtml(templates.article.html, { post: mapped });
    expect(document.querySelector('h1.post-title')?.textContent).toBe(title);
    expect(document.querySelector('.post-author')?.textContent).toBe(author);
    expect(document.querySelector('.public-article-body')?.textContent).toBe('Seção & exameTexto & exame');
    expect(document.querySelector('.elementor-widget-theme-post-featured-image img')?.getAttribute('alt')).toBe(alt);
    expect(document.querySelector('script, médica, imagem')).toBeNull();
  });
});
