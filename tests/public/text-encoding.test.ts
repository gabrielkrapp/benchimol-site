import { describe, expect, it } from 'vitest';
import { JSDOM } from 'jsdom';
import { publicText } from '@/lib/public/html';
import { metadataForPost, articleJsonLd } from '@/lib/public/seo';
import { renderCapturedHtml } from '@/lib/public/render';
import { templates } from '@/lib/public/catalog';
import type { Post } from '@/lib/domain/types';

const post: Post = {
  id: 'encoding-fixture', wpId: null, slug: 'encoding-fixture', legacyPath: '/encoding-fixture/',
  title: 'Título & < > <termo> ação', authorName: 'Autoria literal',
  bodyHtml: '<h2>Seção &amp; &lt;termo&gt; ação</h2><p>Texto de teste.</p>',
  excerptHtml: '<p>Resumo &amp; &lt;termo&gt; ação</p>', status: 'published',
  publishedAt: '2026-10-01T12:00:00.000Z', createdAt: '2026-10-01T12:00:00.000Z',
  updatedAt: '2026-10-01T12:00:00.000Z', version: 1, featuredImage: null, featuredAlt: '',
  categoryIds: [], tagIds: [], seo: { title: 'SEO & < > <termo> ação', description: 'Descrição & <termo> ação' },
  bodyEditMode: 'rich', publicationSync: 'current',
};

describe('public editorial text encoding', () => {
  it('extracts decoded visible HTML text for consumers that escape their own output', () => {
    expect(publicText('<p>Texto &amp; &lt;termo&gt; &quot;ação&quot; &#231;</p><script>oculto</script>'))
      .toBe('Texto & <termo> "ação" ç');
  });

  it('preserves literal plain SEO fields without treating angle brackets as HTML', () => {
    const metadata = metadataForPost(post);
    expect(metadata.title).toBe('SEO & < > <termo> ação');
    expect(metadata.description).toBe('Descrição & <termo> ação');
    expect(metadata.openGraph).toMatchObject({ title: 'SEO & < > <termo> ação', description: 'Descrição & <termo> ação' });
    expect(articleJsonLd(post).description).toBe('Descrição & <termo> ação');
  });

  it('uses literal post title and decoded excerpt as SEO fallbacks', () => {
    const withoutSeo = { ...post, seo: { title: '', description: '' } };
    expect(metadataForPost(withoutSeo).title).toBe('Título & < > <termo> ação');
    expect(metadataForPost(withoutSeo).description).toBe('Resumo & <termo> ação');
    expect(articleJsonLd(withoutSeo).description).toBe('Resumo & <termo> ação');
  });

  it('renders table-of-contents and archive excerpt with the same visible characters as the article', () => {
    const article = new JSDOM(renderCapturedHtml(templates.article.html, { post }));
    const document = article.window.document;
    expect(document.querySelector('h1.post-title')?.textContent).toBe('Título & < > <termo> ação');
    expect([...document.querySelectorAll('.elementor-toc__body a')].map(link => link.textContent))
      .toEqual(['Título & < > <termo> ação', 'Seção & <termo> ação']);
    expect(document.querySelector('.public-article-body h2')?.textContent).toBe('Seção & <termo> ação');
    const archive = new JSDOM(renderCapturedHtml(templates.blog.html, { posts: [post] }));
    expect(archive.window.document.querySelector('.jkit-post-excerpt')?.textContent).toContain('Resumo & <termo> ação');
    article.window.close(); archive.window.close();
  });
});
