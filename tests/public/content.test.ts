import { describe, it, expect } from 'vitest';
import { localizeUrl, sanitizePublicHtml, whatsappUrl } from '@/lib/public/html';
import { resolvePublicPath, institutionalPages, canonicalPostPath, site } from '@/lib/public/catalog';
import { articleJsonLd, clinicJsonLd, publicRobots, metadataForPost } from '@/lib/public/seo';
import type { Post } from '@/lib/domain/types';

describe('public HTML migration', () => {
  it('restores lazy image and embed URLs and keeps exact safe styling', () => {
    const html = sanitizePublicHtml('<div class="elementor-element" style="padding:20px;background-image:url(https://clinicadeolhosbenchimol.com.br/wp-content/uploads/2023/01/Clinica-Benchimol-Favicon.png)"><img src="data:image/svg+xml;base64,AA==" data-src="https://clinicadeolhosbenchimol.com.br/wp-content/uploads/2023/01/Clinica-Benchimol-Favicon.png" data-srcset="https://clinicadeolhosbenchimol.com.br/wp-content/uploads/2023/01/Clinica-Benchimol-Favicon.png 100w" alt="Clínica"><iframe src="about:blank" data-litespeed-src="https://maps.google.com/maps?q=Copacabana&amp;output=embed"></iframe></div>');
    expect(html).toContain('src="/wp-content/uploads/2023/01/Clinica-Benchimol-Favicon.png"');
    expect(html).toContain('srcset="/wp-content/uploads/2023/01/Clinica-Benchimol-Favicon.png 100w"');
    expect(html).toContain('padding:20px'); expect(html).toContain('maps.google.com/maps?q=Copacabana');
    expect(html).not.toMatch(/data-src|about:blank|data:image/);
  });
  it('restores only safe captured map URLs after a duplicate about:blank src', () => {
    const footer = sanitizePublicHtml(site.footerHtml);
    expect((footer.match(/<iframe\b/g) || []).length).toBe(2);
    expect(footer).toContain('https://maps.google.com/maps?q='); expect(footer).not.toContain('about:blank');
    const unknown = sanitizePublicHtml('<iframe src="about:blank" src="https://evil.example/maps"></iframe><iframe src="about:blank" src="https://evil.example/" src="https://maps.google.com/maps?q=Clinic"></iframe>');
    expect(unknown).not.toContain('<iframe');
  });
  it('removes executable and collection markup, blocks unknown frames and CSS execution', () => {
    const html = sanitizePublicHtml('<script>alert(1)</script><form><input name="patient"></form><a onclick="evil()" href="javascript:evil()">Leia</a><img src="x" onerror="evil()"><iframe src="https://evil.example/"></iframe><div style="background:url(javascript:evil());color:red">Texto</div><style>evil</style><section id="comments">Comentário</section>');
    expect(html).not.toMatch(/script|form|input|onclick|onerror|javascript|evil\.example|comments|Comentário/);
    expect(html).toContain('Texto');
  });
  it('preserves safe SVG gradients used by the original WhatsApp icon', () => {
    const html = sanitizePublicHtml('<svg viewBox="0 0 50 50"><defs><linearGradient id="green" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#61fd7d"/><stop offset="1" stop-color="#2bb826"/></linearGradient></defs><path d="M0 0" fill="url(#green)"/><script>alert(1)</script></svg>');
    expect(html).toMatch(/<linear[Gg]radient/); expect(html).toContain('stop-color="#2bb826"');
    expect(html).toContain('fill="url(#green)"'); expect(html).not.toContain('script');
  });
  it('localizes same-domain navigation and replaces every WhatsApp CTA centrally', () => {
    expect(localizeUrl('https://clinicadeolhosbenchimol.com.br/glaucoma?x=1#secao')).toBe('/glaucoma/?x=1#secao');
    expect(localizeUrl('https://www.google.com/maps?q=Clínica')).toContain('https://www.google.com');
    const contact = { whatsapp: '5521999999999', message: 'Olá & saúde', version: 2, updatedAt: '' };
    const html = sanitizePublicHtml('<a href="https://wa.me/5521985601000">(21) 98560-1000</a><a href="tel:2125496040">2125496040</a>', { contact });
    expect(html).toContain(whatsappUrl(contact).replace(/&/g, '&amp;'));
    expect(html).toContain('(21) 99999-9999'); expect(html).toContain('tel:2125496040');
    expect(sanitizePublicHtml('<a href="#"><span>(21) 98560-1000</span></a>', { contact })).toContain('https://wa.me/5521999999999');
  });
});
describe('public route inventory and crawlability', () => {
  it('resolves all institutional source paths and never returns Home for an unknown route', () => {
    expect(institutionalPages).toHaveLength(38);
    for (const page of institutionalPages) expect(resolvePublicPath(page.path)).not.toBeNull();
    expect(resolvePublicPath('/nao-existe-abc/')).toBeNull();
    expect(resolvePublicPath('/cirurgia-refrativa/')?.kind).toBe('page');
    expect(resolvePublicPath('/simply_galleries/')?.kind).toBe('archive');
    expect(resolvePublicPath('/simply_galleries/page/2/')?.kind).toBe('archive');
    expect(canonicalPostPath({ wpId: 34, legacyPath: '/cirurgia-refrativa/' })).toBe('/cirurgia-refrativa-artigo/');
  });
  it('allows public search bots and excludes private routes, with separate training policy', () => {
    const robots = publicRobots();
    expect(JSON.stringify(robots)).toContain('OAI-SearchBot'); expect(JSON.stringify(robots)).toContain('GPTBot');
    expect(JSON.stringify(robots)).toContain('/admin/'); expect(JSON.stringify(robots)).toContain('/api/');
    expect(JSON.stringify(robots)).not.toContain('Disallow: /wp-content/');
  });
  it('uses real unit addresses and truthful article author and publication dates', () => {
    const post = { wpId: 34, legacyPath: '/cirurgia-refrativa/', title: 'Texto <seguro>', authorName: 'Johny', publishedAt: '2023-01-01T12:00:00Z', updatedAt: '2023-02-01T12:00:00Z', featuredImage: null, seo: { description: 'Descrição' } } as Post;
    const schema = articleJsonLd(post);
    expect(schema.author).toEqual({ '@type': 'Person', name: 'Johny' }); expect(schema.datePublished).toBe(post.publishedAt);
    expect(schema.url).toBe('https://clinicadeolhosbenchimol.com.br/cirurgia-refrativa-artigo/');
    expect(JSON.stringify(clinicJsonLd())).toContain('Rua Ivo do Prado');
    expect(JSON.stringify(clinicJsonLd())).not.toContain('aggregateRating');
  });
  it('honors a custom editorial canonical while retaining the primary article route', () => {
    const post = { wpId: 34, legacyPath: '/cirurgia-refrativa/', title: 'Artigo', authorName: 'Johny', publishedAt: null, updatedAt: '2026-09-30T12:00:00Z', featuredImage: null, excerptHtml: '', seo: { title: '', description: '', canonical: 'https://example.org/artigo-original/' } } as Post;
    expect(metadataForPost(post).alternates?.canonical).toBe('https://example.org/artigo-original/');
    expect(articleJsonLd(post).mainEntityOfPage).toBe('https://example.org/artigo-original/');
    expect(articleJsonLd(post).url).toBe('https://clinicadeolhosbenchimol.com.br/cirurgia-refrativa-artigo/');
    expect(metadataForPost({ ...post, seo: { ...post.seo, canonical: 'javascript:alert(1)' } }).alternates?.canonical).toBe('https://clinicadeolhosbenchimol.com.br/cirurgia-refrativa-artigo/');
  });
});

describe('server content and isolated styles', () => {
  it('preserves media gallery noscript fallback as visible server HTML', () => {
    const html = sanitizePublicHtml('<div class="simply-gallery-amp"><noscript><figure><img src="/wp-content/uploads/photo.webp" alt="Consultório"></figure></noscript></div>');
    expect(html).not.toContain('<noscript'); expect(html).toContain('alt="Consultório"');
  });
});
