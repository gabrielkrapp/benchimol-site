import { describe, it, expect } from 'vitest';
import { renderCapturedHtml, paginationHtml, pageTemplate, homeTemplate } from '@/lib/public/render';
import { templates, site, galleries } from '@/lib/public/catalog';
import { sanitizePublicHtml } from '@/lib/public/html';
import { scopePublicCss, selectCapturedStylesheets } from '@/lib/public/styles';
import { htmlToDOM, elements, hasClass, serialize } from '@/lib/public/dom';
import type { Post } from '@/lib/domain/types';
const post: Post = { id: 'new-post', wpId: 99999, legacyPath: '/conteudo-atual/', slug: 'conteudo-atual', title: 'Título recém-publicado', authorName: 'Autoria confirmada', bodyHtml: '<h2>Corpo atual completo</h2><p>Conteúdo indispensável sem JavaScript.</p>', excerptHtml: '<p>Resumo atual</p>', status: 'published', publishedAt: '2026-09-30T15:00:00Z', createdAt: '2026-09-30T15:00:00Z', updatedAt: '2026-09-30T15:00:00Z', version: 1, featuredImage: '/wp-content/uploads/imagem-atual.webp', featuredAlt: 'Imagem atual', categoryIds: [6], tagIds: [], seo: { title: 'Título atual', description: 'Descrição atual' }, bodyEditMode: 'legacy', publicationSync: 'current' };
describe('source templates with current editorial data', () => {
  it('SSR article has full current body, real author, cover, and current related links without stale source title', () => {
    const related = { ...post, id: 'related', wpId: 100000, legacyPath: '/artigo-relacionado/', title: 'Artigo relacionado atual' };
    const html = renderCapturedHtml(templates.article.html, { post, posts: [related], categories: [{ wpId: 6, slug: 'oftalmologia', name: 'Oftalmologia', count: 2 }] });
    expect(html).toContain('<article'); expect(html).toContain('data-wp-id="99999"'); expect(html).toContain('Corpo atual completo');
    expect(html).toContain('Autoria confirmada'); expect(html).toContain('/imagem-atual.webp');
    expect(html).toContain('/artigo-relacionado/'); expect(html).toContain('Artigo relacionado atual');
    expect(html).toContain('/category/oftalmologia/'); expect(html).toContain('#artigo-secao-1');
    expect(html).not.toContain('Johny'); expect(html).not.toContain('comments-area');
    expect((html.match(/<h1\b/g) || []).length).toBe(1);
    const featured = elements(htmlToDOM(html), node => hasClass(node, 'elementor-widget-theme-post-featured-image'))[0];
    expect(serialize([featured])).not.toContain('wp-post-image');
  });
  it('Home replaces every captured blog card with current public posts', () => {
    const html = renderCapturedHtml(site.homeHtml, { posts: [post], isHome: true });
    expect(html).toContain('Título recém-publicado'); expect(html).toContain('/conteudo-atual/');
    expect(html).not.toContain('o-que-e-o-mapeamento-da-retina-e-quando-esse-exame');
    expect((html.match(/<h1\b/g) || []).length).toBe(1);
  });
  it('article index preserves source H2 selection and includes the promoted article title', () => {
    const html = renderCapturedHtml(templates.article.html, { post: { ...post, bodyHtml: '<h2>Seção principal</h2><h3>Subseção</h3><h2>Segunda seção</h2>' } });
    const toc = elements(htmlToDOM(html), node => hasClass(node, 'elementor-toc__body'))[0];
    const links = elements(toc.children as import('@/lib/public/dom').DOMNode[], node => node.name === 'a');
    expect(links.map(link => link.attribs.href)).toEqual(['#artigo-titulo', '#artigo-secao-1', '#artigo-secao-3']);
    expect(links.every(link => hasClass(link, 'elementor-toc__list-item-text') && hasClass(link, 'elementor-toc__top-level'))).toBe(true);
    expect(elements(toc.children as import('@/lib/public/dom').DOMNode[], node => hasClass(node, 'elementor-toc__list-item-text-wrapper'))).toHaveLength(3);
    expect(serialize([toc])).toContain(post.title); expect(serialize([toc])).not.toContain('Subseção');
  });
  it('article index labels are plain text even when the original headings contain links and emphasis', () => {
    const html = renderCapturedHtml(templates.article.html, { post: { ...post, bodyHtml: '<h2 id="secao-original"><a href="/exames/">Seção com <strong>link</strong></a></h2>' } });
    const toc = elements(htmlToDOM(html), node => hasClass(node, 'elementor-toc__body'))[0];
    const links = elements(toc.children as import('@/lib/public/dom').DOMNode[], node => node.name === 'a');
    expect(links.map(link => link.attribs.href)).toEqual(['#artigo-titulo', '#secao-original']);
    expect(serialize([toc])).toContain('Seção com link');
    expect(serialize([toc])).not.toContain('<strong>');
    const body = elements(htmlToDOM(html), node => hasClass(node, 'public-article-body'))[0];
    expect(serialize([body])).toContain('href="/exames/"');
    expect(serialize([body])).toContain('<strong>link</strong>');
  });
  it('approved Home overrides replace public content and styles while retaining the immutable default', () => {
    expect(homeTemplate({}).html).toBe(site.homeHtml);
    const htmlOverride = homeTemplate({ contentHtml: '<h1>Home aprovada</h1>' });
    expect(htmlOverride.html).toBe('<h1>Home aprovada</h1>'); expect(htmlOverride.cssPaths).toEqual(site.homeCssPaths);
    const renderedOverride = homeTemplate({ contentHtml: 'Conteúdo', renderedHtml: '<h1>Layout aprovado</h1>', cssPaths: ['/novo.css'], inlineStyles: ['.novo{color:blue}'], bodyClasses: 'novo' });
    expect(renderedOverride).toEqual({ html: '<h1>Layout aprovado</h1>', cssPaths: ['/novo.css'], inlineStyles: ['.novo{color:blue}'], bodyClasses: 'novo' });
  });
  it('empty published results remove all old blog cards and pagination links expose real pages', () => {
    const html = renderCapturedHtml(templates.blog.html, { posts: [] });
    expect(html).not.toContain('o-que-e-o-mapeamento-da-retina-e-quando-esse-exame');
    const pagination = paginationHtml('/blog/', 2, 153, 6);
    expect(pagination).toContain('href="/blog/page/3/" rel="next"'); expect(pagination).toContain('href="/blog/"');
    expect(pagination).toContain('aria-current="page">2');
  });
  it('recent sidebars use the latest published set independently of filtered archive cards', () => {
    const recent = { ...post, id: 'recent', wpId: 100001, title: 'Novo post recente', legacyPath: '/novo-post-recente/' };
    for (const template of [templates.blog, templates.galleryArchive, templates.taxonomy, templates.article]) {
      const html = renderCapturedHtml(template.html, { posts: [post], recentPosts: [recent] });
      const sidebar = elements(htmlToDOM(html), node => hasClass(node, 'jkit-postlist'))[0];
      const markup = serialize([sidebar]);
      expect(markup).toContain('Novo post recente'); expect(markup).toContain('/novo-post-recente/');
      expect(markup).not.toContain('Título recém-publicado'); expect(markup).not.toContain('o-que-e-o-mapeamento-da-retina');
      const withdrawn = renderCapturedHtml(template.html, { posts: [post], recentPosts: [] });
      const empty = serialize([elements(htmlToDOM(withdrawn), node => hasClass(node, 'jkit-postlist'))[0]]);
      expect(empty).not.toContain('<article'); expect(empty).not.toContain('Novo post recente');
    }
  });
  it('standalone galleries retain the shared source theme and header styles', () => {
    for (const gallery of galleries) expect(pageTemplate(gallery).cssPaths).toEqual(templates.sample.cssPaths);
  });
  it('standalone galleries render their visible source titles, full-resolution panels and thumbnail controls without JavaScript', () => {
    for (const [index, gallery] of galleries.entries()) {
      const html = renderCapturedHtml(pageTemplate(gallery).html);
      const nodes = htmlToDOM(html);
      expect(html).toContain(`<h1 class="entry-title">${gallery.title}</h1>`);
      expect(elements(nodes, node => hasClass(node, 'sgb-item'))).toHaveLength(index === 0 ? 11 : 12);
      expect(elements(nodes, node => hasClass(node, 'public-gallery-thumb'))).toHaveLength(index === 0 ? 11 : 12);
      expect(html).toContain('data-autoplay="true"'); expect(html).toContain('data-gallery-height="520"');
      expect(html).toContain(`data-gallery-tail="${index === 0 ? 1 : 0}"`);
      expect(html).toContain('points="352,115.4 331.3,96 160,256 331.3,416 352,396.7 201.5,256"');
      expect(html).toContain('points="160,115.4 180.7,96 352,256 180.7,416 160,396.7 310.5,256"');
      if (index === 0) expect(html).toContain('data-gallery-caption="Consultorio 2"');
      for (const panel of elements(nodes, node => hasClass(node, 'sgb-item'))) {
        const image = elements(panel.children as import('@/lib/public/dom').DOMNode[], node => node.name === 'img')[0];
        expect(image.attribs.src).not.toMatch(/-300x|-150x/); expect(Number(image.attribs.width)).toBeGreaterThan(300);
      }
      for (const thumb of elements(nodes, node => hasClass(node, 'public-gallery-thumb'))) {
        const image = elements(thumb.children as import('@/lib/public/dom').DOMNode[], node => node.name === 'img')[0];
        expect(image.attribs.src).toContain('-300x'); expect(image.attribs.src).not.toContain('-150x150');
      }
    }
  });
  it('public review widgets render visibly while preserving the original review cards', () => {
    const html = renderCapturedHtml(site.homeHtml, { isHome: true });
    const widget = elements(htmlToDOM(html), node => hasClass(node, 'ti-widget') && hasClass(node, 'ti-goog'))[0];
    expect(widget.attribs.style || '').not.toMatch(/opacity:\s*0|height:\s*0|overflow:\s*hidden/);
    expect(elements(widget.children as import('@/lib/public/dom').DOMNode[], node => hasClass(node, 'ti-review-item'))).toHaveLength(8);
    expect(elements(widget.children as import('@/lib/public/dom').DOMNode[], node => hasClass(node, 'ti-read-more-active'))).toHaveLength(5);
    expect(serialize([widget])).toContain('12 meses atrás');
    expect(elements(widget.children as import('@/lib/public/dom').DOMNode[], node => hasClass(node, 'ti-review-content')).every(node => node.attribs.style.includes('display:block'))).toBe(true);
    expect(elements(htmlToDOM(html), node => node.name === 'pre' && hasClass(node, 'ti-widget'))).toHaveLength(0);
  });
  it('scopes theme rules while preserving responsive queries, fonts and keyframes', () => {
    const css = scopePublicCss('.elementor-kit-257{--e-global-color-primary:blue}.elementor-kit-257 a{color:blue}body.elementor-kit-257{margin:0}html body .nav,a:focus{color:red}@media(max-width:767px){.nav{display:none}}@font-face{font-family:Test;src:url(/font.woff2)}@keyframes enter{0%{opacity:0}to{opacity:1}}');
    expect(css).toContain('.public-site.elementor-kit-257{--e-global-color-primary:blue}'); expect(css).toContain('.public-site.elementor-kit-257 a'); expect(css).toContain('.public-site .nav,.public-site a:focus');
    expect(css).toContain('@media(max-width:767px){.public-site .nav'); expect(css).toContain('@font-face');
    expect(css).toContain('@keyframes enter{0%{opacity:0}to{opacity:1}}'); expect(css).not.toContain('.public-site 0%');
  });
  it('complete restored styles replace the obsolete anonymous UCSS instead of inheriting its crop and footer widths', () => {
    const captured = homeTemplate({}).cssPaths;
    expect(selectCapturedStylesheets(captured)).not.toContain(captured[0]);
    expect(selectCapturedStylesheets(captured)).toContain(captured.find(path => path.endsWith('/post-55.css')));
    expect(selectCapturedStylesheets([captured[0]])).toEqual([captured[0]]);
  });
});

describe('navigation state', () => {
  it('selects Home and clears the captured state of another page', async () => {
    const { publicHeader } = await import('@/lib/public/catalog');
    const html = sanitizePublicHtml(publicHeader('/'));
    const other = sanitizePublicHtml(publicHeader('/sobre-nos/'));
    expect(other).toMatch(/href="\/sobre-nos\/"[^>]*aria-current="page"/);
    expect(html).toMatch(/href="\/"[^>]*aria-current="page"/);
    expect(html).not.toMatch(/href="\/sobre-nos\/"[^>]*aria-current="page"/);
  });
  it('renders the original submenu caret in server HTML without the SmartMenus script', async () => {
    const { publicHeader } = await import('@/lib/public/catalog');
    const header = sanitizePublicHtml(publicHeader('/'));
    const parents = elements(htmlToDOM(header), node => hasClass(node, 'menu-item-has-children'));
    for (const parent of parents) {
      expect(elements(parent.children as import('@/lib/public/dom').DOMNode[], node => hasClass(node, 'sub-arrow'))).toHaveLength(1);
      expect(serialize(parent.children as import('@/lib/public/dom').DOMNode[])).toContain('fas fa-caret-down');
    }
    const open = elements(htmlToDOM(header), node => hasClass(node, 'elementor-menu-toggle__icon--open'))[0];
    expect(open.name).toBe('svg'); expect(serialize([open])).toContain('transform="translate(0 850) scale(1 -1)"');
    expect(serialize([open])).toContain('M104 517h792');
  });
});
