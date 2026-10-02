import mediaData from '../../../data/wordpress/media.json';
import galleryData from './captured-galleries.json';
import type { Post, Taxonomy, ContactSettings } from '@/lib/domain/types';
import { canonicalPostPath, type CapturedTemplate, type CapturedPage, site, templates, pageOverrides } from './catalog';
import { sanitizePublicHtml, localizeUrl, publicText } from './html';
import { htmlToDOM, elements, hasClass, content, textContent, serialize, escapeHtml, type DOMNode } from './dom';
import { restoreCapturedReviews } from './reviews';

export function originalDate(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  const month = new Intl.DateTimeFormat('pt-BR', { month: 'long', timeZone: 'America/Sao_Paulo' }).format(date);
  const parts = new Intl.DateTimeFormat('en', { year: 'numeric', day: 'numeric', timeZone: 'America/Sao_Paulo' }).formatToParts(date);
  return `${month} ${parts.find(part => part.type === 'day')?.value}, ${parts.find(part => part.type === 'year')?.value}`;
}
function imageMarkup(post: Post, mode: 'full' | 'large' | 'medium' = 'large', featured = false, placement: 'home' | 'archive' | 'sidebar' = 'archive') {
  if (!post.featuredImage) return '';
  const source = mediaData.find(item => localizeUrl(item.originalUrl) === localizeUrl(post.featuredImage!) || item.localPath === post.featuredImage);
  const details = source?.details as { width?: number; height?: number; sizes?: Record<string, { source_url: string; width: number; height: number }> } | undefined;
  const size = details?.sizes?.[mode];
  const src = localizeUrl(size?.source_url || post.featuredImage);
  const width = size?.width || details?.width, height = size?.height || details?.height;
  // WordPress also exports square thumbnails and newsletter crops. Selecting a
  // smaller candidate must retain the base image's aspect ratio and framing.
  const proportional = (candidate: { width: number; height: number }, reference: { width: number; height: number }) => Math.abs(candidate.width - candidate.height * reference.width / reference.height) <= 1 || Math.abs(candidate.height - candidate.width * reference.height / reference.width) <= 1;
  const base = width && height ? { width, height } : undefined;
  const original = details?.width && details?.height ? { width: details.width, height: details.height } : undefined;
  const reference = base && original && proportional(base, original) ? original : base;
  const sameRatio = (candidate: { width: number; height: number }) => !reference || proportional(candidate, reference);
  const sizes = details?.sizes ? Object.values(details.sizes).filter(item => item.width && item.height && item.source_url && sameRatio(item)).map(item => `${localizeUrl(item.source_url)} ${item.width}w`) : [];
  if (original && sameRatio(original)) sizes.push(`${localizeUrl(post.featuredImage)} ${original.width}w`);
  // Match the captured Elementor grid: Home switches to one column at 1024px;
  // archives use two columns above 767px and their main column is 65% on desktop.
  const displaySizes = featured ? '(max-width: 1024px) calc(100vw - 40px), (max-width: 1170px) calc(65vw - 30px), 731px'
    : placement === 'home' ? '(max-width: 1024px) calc(100vw - 80px), (max-width: 1200px) calc((100vw - 160px) / 3), 347px'
    : placement === 'sidebar' ? '(max-width: 767px) 75px, (max-width: 1024px) calc(35vw - 42px), (max-width: 1170px) calc(12.25vw - 45.5px), 98px'
    : '(max-width: 767px) calc(100vw - 40px), (max-width: 1024px) calc((100vw - 70px) / 2), (max-width: 1170px) calc((65vw - 70px) / 2), 346px';
  return `<img src="${escapeHtml(src)}" alt="${escapeHtml(post.featuredAlt)}" class="attachment-${mode} size-${mode}${featured ? source?.wpId ? ` wp-image-${source.wpId}` : '' : ' wp-post-image'}"${width ? ` width="${width}"` : ''}${height ? ` height="${height}"` : ''}${sizes.length ? ` srcset="${escapeHtml([...new Set(sizes)].join(', '))}" sizes="${displaySizes}"` : ''} loading="${featured ? 'eager' : 'lazy'}" decoding="async">`;
}
function cardMarkup(template: string, post: Post, isHome = false): string {
  const nodes = htmlToDOM(template);
  const root = elements(nodes, node => node.name === 'article')[0];
  if (root) root.attribs.class = (root.attribs.class || '').replace(/\bpost-\d+\b|\bcategory-\S+|\btag-\S+/g, '') + ` post-${post.wpId ?? post.id}`;
  for (const main of elements(nodes, node => node.name === 'main')) { main.name = 'div'; if (main.attribs.id === 'content') delete main.attribs.id; }
  for (const link of elements(nodes, node => node.name === 'a')) { link.attribs.href = canonicalPostPath(post); if (link.attribs.title) link.attribs.title = post.title; if (link.attribs['aria-label']) link.attribs['aria-label'] = post.title; }
  for (const heading of elements(nodes, node => hasClass(node, 'jkit-post-title') || hasClass(node, 'post-title') || hasClass(node, 'jkit-postlist-title'))) {
    const link = elements(heading.children as DOMNode[], node => node.name === 'a')[0]; textContent(link || heading, post.title);
  }
  for (const img of elements(nodes, node => node.name === 'img')) {
    const sidebar = !!root && hasClass(root, 'post-list-item');
    const replacement = htmlToDOM(imageMarkup(post, sidebar ? 'medium' : 'large', false, sidebar ? 'sidebar' : isHome ? 'home' : 'archive'))[0];
    if (img.parent && replacement) { const parent = img.parent; const index = parent.children.indexOf(img); parent.children[index] = replacement; replacement.parent = parent; }
    else if (img.parent) img.parent.children = img.parent.children.filter(child => child !== img);
  }
  for (const date of elements(nodes, node => hasClass(node, 'jkit-meta-date') || hasClass(node, 'post-date'))) content(date, `<i aria-hidden="true" class="fas fa-clock"></i><time datetime="${escapeHtml(post.publishedAt || '')}">${escapeHtml(originalDate(post.publishedAt))}</time>`);
  for (const excerpt of elements(nodes, node => hasClass(node, 'jkit-post-excerpt'))) {
    const words = publicText(post.excerptHtml || post.bodyHtml).split(/\s+/); content(excerpt, `<p>${escapeHtml(words.slice(0, 25).join(' '))}${words.length > 25 ? '...' : ''}</p>`);
  }
  return serialize(nodes);
}
export function paginationHtml(base: string, page: number, total: number, pageSize: number): string {
  const count = Math.ceil(total / pageSize);
  if (count <= 1) return '';
  const link = (index: number) => index === 1 ? base : `${base}page/${index}/`;
  const indexes = [...new Set([1, ...Array.from({ length: 5 }, (_, index) => page - 2 + index).filter(index => index > 1 && index < count), count])];
  const buttons = indexes.map(index => index === page ? `<span aria-current="page">${index}</span>` : `<a href="${link(index)}" aria-label="Página ${index}">${index}</a>`).join(' ');
  // The source has one load-more button. Its SSR link keeps that appearance;
  // the additional page index remains accessible without creating another row.
  const next = page < count ? `<a class="jkit-pagination-button jkit-block-loadmore icon-position-before" href="${link(page + 1)}" rel="next"><span data-load="Carregar Mais" data-loading="Carregando...">Carregar Mais</span></a>` : '';
  return `${next}<nav class="public-pagination public-visually-hidden" aria-label="Paginação do blog" data-public-archive="${escapeHtml(base)}" data-public-page="${page}" data-public-page-size="${pageSize}">${page > 1 ? `<a href="${link(page - 1)}" rel="prev">Anterior</a>` : ''}${buttons}</nav>`;
}
export function renderCapturedHtml(source: string, options: { posts?: Post[]; recentPosts?: Post[]; post?: Post; contact?: ContactSettings; categories?: Taxonomy[]; archiveTitle?: string; pagination?: string; isHome?: boolean } = {}): string {
  const nodes = htmlToDOM(sanitizePublicHtml(source, { contact: options.contact }));
  restoreCapturedReviews(nodes);
  for (const link of elements(nodes, node => node.name === 'a' && /[?&]attachment_id=\d+/.test(node.attribs.href || ''))) {
    const id = Number(link.attribs.href.match(/attachment_id=(\d+)/)?.[1]);
    const asset = mediaData.find(item => item.wpId === id); if (asset?.localPath) link.attribs.href = asset.localPath;
  }
  for (const card of elements(nodes, node => hasClass(node, 'card-wrapper'))) {
    const button = elements(card.children as DOMNode[], node => hasClass(node, 'card-header-button'))[0];
    if (button) button.attribs['aria-expanded'] = String(hasClass(card, 'expand'));
  }
  for (const reviews of elements(nodes, node => hasClass(node, 'ti-widget') && hasClass(node, 'ti-goog'))) {
    for (const review of elements(reviews.children as DOMNode[], node => hasClass(node, 'ti-review-content'))) review.attribs.style = `${review.attribs.style || ''};display:block;-webkit-line-clamp:unset!important`;
  }
  const recentLists = new Set(elements(nodes, node => hasClass(node, 'jkit-postlist')).flatMap(container => elements(container.children as DOMNode[], node => hasClass(node, 'jkit-posts'))));
  if (options.posts || options.recentPosts) for (const list of elements(nodes, node => hasClass(node, 'jkit-posts'))) {
    const posts = recentLists.has(list) ? options.recentPosts ?? options.posts?.slice(0, 3) : options.posts;
    if (!posts) continue;
    const cards = elements(list.children as DOMNode[], node => node.name === 'article');
    if (cards[0]) content(list, posts.map(post => cardMarkup(serialize([cards[0]]), post, options.isHome)).join(''));
    else content(list, posts.map(post => `<article><h2><a href="${canonicalPostPath(post)}">${escapeHtml(post.title)}</a></h2></article>`).join(''));
  }
  for (const pagination of elements(nodes, node => /(?:^|\s)jkit-pagination(?:\s|$)|jkit-block-pagination/.test(node.attribs.class || ''))) content(pagination, options.pagination || '');
  if (options.pagination && !elements(nodes, node => hasClass(node, 'public-pagination')).length) {
    const list = elements(nodes, node => hasClass(node, 'jkit-posts'))[0]; if (list?.parent) content(list.parent as typeof list, serialize((list.parent.children as DOMNode[]).filter(node => node === list)) + options.pagination);
  }
  if (options.archiveTitle) {
    const heading = elements(nodes, node => /^h[1-3]$/.test(node.name))[0];
    if (heading) { heading.name = 'h1'; textContent(heading, options.archiveTitle); }
  }
  if (options.isHome) {
    const hero = elements(nodes, node => hasClass(node, 'elementor-slide-heading'))[0];
    if (hero) hero.name = 'h1';
  }
  if (options.post) {
    const post = options.post;
    const articleRoot = elements(nodes, node => node.attribs['data-elementor-type'] === 'single-post')[0];
    if (articleRoot) { articleRoot.name = 'article'; articleRoot.attribs['data-wp-id'] = String(post.wpId ?? ''); }
    for (const widget of elements(nodes, node => hasClass(node, 'jkit-post-title'))) for (const title of elements(widget.children as DOMNode[], node => hasClass(node, 'post-title'))) { title.name = 'h1'; textContent(title, post.title); }
    for (const author of elements(nodes, node => hasClass(node, 'post-author') && !hasClass(node, 'jkit-post-author'))) textContent(author, post.authorName);
    for (const date of elements(nodes, node => hasClass(node, 'post-date') && !hasClass(node, 'jkit-post-date'))) content(date, `<time datetime="${escapeHtml(post.publishedAt || '')}">${escapeHtml(originalDate(post.publishedAt))}</time>`);
    for (const featured of elements(nodes, node => hasClass(node, 'elementor-widget-theme-post-featured-image'))) { const container = elements(featured.children as DOMNode[], node => hasClass(node, 'elementor-widget-container'))[0]; if (container) content(container, imageMarkup(post, 'large', true)); }
    for (const body of elements(nodes, node => hasClass(node, 'elementor-widget-theme-post-content'))) {
      const container = elements(body.children as DOMNode[], node => hasClass(node, 'elementor-widget-container'))[0];
      if (container) { container.attribs.class += ' public-article-body'; content(container, sanitizePublicHtml(post.bodyHtml, { contact: options.contact })); }
    }
    const body = elements(nodes, node => hasClass(node, 'public-article-body'))[0];
    const headings = body ? elements(body.children as DOMNode[], node => /^h[1-6]$/.test(node.name)) : [];
    headings.forEach((heading, index) => { heading.attribs.id ||= `artigo-secao-${index + 1}`; });
    const hero = elements(nodes, node => node.name === 'h1' && hasClass(node, 'post-title'))[0];
    if (hero) hero.attribs.id = 'artigo-titulo';
    for (const widget of elements(nodes, node => hasClass(node, 'elementor-widget-table-of-contents'))) {
      let tags = ['h2'];
      try { const settings = JSON.parse(widget.attribs['data-settings'] || '{}'); if (Array.isArray(settings.headings_by_tags)) tags = settings.headings_by_tags.filter((tag: unknown) => typeof tag === 'string' && /^h[1-6]$/.test(tag)); } catch {}
      const selected = [...(hero && tags.includes('h2') ? [hero] : []), ...headings.filter(heading => tags.includes(heading.name))];
      for (const toc of elements(widget.children as DOMNode[], node => hasClass(node, 'elementor-toc__body'))) content(toc, selected.length ? `<ol class="elementor-toc__list-wrapper">${selected.map(heading => `<li class="elementor-toc__list-item"><div class="elementor-toc__list-item-text-wrapper"><a class="elementor-toc__list-item-text elementor-toc__top-level" href="#${escapeHtml(heading.attribs.id)}">${escapeHtml(publicText(serialize(heading.children as DOMNode[])))}</a></div></li>`).join('')}</ol>` : '');
    }
    const taxonomyLinks = (options.categories || []).filter(category => post.categoryIds.includes(category.wpId)).map(category => `<a href="/category/${escapeHtml(category.slug)}/">${escapeHtml(category.name)}</a>`).join(', ');
    for (const terms of elements(nodes, node => hasClass(node, 'post-terms'))) content(terms, taxonomyLinks);
  }
  if (!elements(nodes, node => node.name === 'h1').length) {
    const title = elements(nodes, node => node.name === 'h2' && (hasClass(node, 'elementor-heading-title') || hasClass(node, 'post-title')))[0];
    if (title) { title.name = 'h1'; title.attribs.class = `${title.attribs.class || ''} public-main-title`; }
  }
  return sanitizePublicHtml(serialize(nodes), { contact: options.contact });
}
export function pageTemplate(page: CapturedPage): CapturedTemplate {
  const gallery = galleryData[String(page.wpId) as keyof typeof galleryData];
  const galleryHtml = gallery ? `<div class="site-main post-${page.wpId} pgc_simply_gallery type-pgc_simply_gallery status-publish hentry"><div class="page-header"><h1 class="entry-title">${escapeHtml(page.title)}</h1></div><div class="page-content"><div class="public-legacy-gallery pgcsimplygalleryblock-slider-collection action-lightbox" data-gallery-tail="${(3 - gallery.images.length % 3) % 3}" data-gallery-height="${gallery.sliderMaxHeight}" data-autoplay="${gallery.autoPlay}" style="--gallery-tail-count:${(3 - gallery.images.length % 3) % 3};--gallery-height:${gallery.sliderMaxHeight}px;--gallery-spacing:${gallery.thumbSpacing}px;--gallery-radius:${gallery.collectionthumbRoundedCorners}px"><div class="sgb-gallery" aria-label="${escapeHtml(page.title)}">${gallery.images.map((image, index) => `<div class="sgb-item" data-gallery-index="${index}"><a href="${escapeHtml(localizeUrl(image.url))}" data-gallery-caption="${escapeHtml(image.caption || image.title)}" aria-label="${escapeHtml(image.alt || image.caption || image.title)}"><img src="${escapeHtml(localizeUrl(image.url))}" alt="${escapeHtml(image.alt)}" width="${image.width}" height="${image.height}" loading="lazy" decoding="async"></a></div>`).join('')}</div><div class="public-gallery-thumbs" aria-label="Miniaturas">${gallery.images.map((image, index) => `<button class="public-gallery-thumb pgc-rev-scroll-bar-thumb-simple-border${index < 3 ? ' pgc-select' : ''}" type="button" data-gallery-index="${index}" aria-label="${escapeHtml(image.alt || image.caption || image.title)}" aria-pressed="${index < 3}"><span class="pgc-rev-scroll-bar-thumb-item-wrap"><img src="${escapeHtml(localizeUrl((image.sizes.medium?.url || image.sizes.thumbnail.url)))}" alt="" width="${(image.sizes.medium?.width || image.sizes.thumbnail.width)}" height="${(image.sizes.medium?.height || image.sizes.thumbnail.height)}" loading="lazy"><span class="pgc-rev-scroll-bar-thumb-item-inner" aria-hidden="true"></span><span class="pgc-rev-scroll-bar-thumb-item-hover pgc-rev-scroll-bar-thumb-hover" aria-hidden="true"></span></span></button>`).join('')}</div><button class="public-gallery-prev" type="button" aria-label="Imagem anterior"><svg viewBox="0 0 512 512" width="40" height="40" aria-hidden="true"><polygon points="352,115.4 331.3,96 160,256 331.3,416 352,396.7 201.5,256" /></svg></button><button class="public-gallery-next" type="button" aria-label="Próxima imagem"><svg viewBox="0 0 512 512" width="40" height="40" aria-hidden="true"><polygon points="160,115.4 180.7,96 352,256 180.7,416 160,396.7 310.5,256" /></svg></button></div></div></div>` : '';
  return { html: page.renderedHtml || galleryHtml || (page.wpId === 2 ? templates.sample.html : page.contentHtml), cssPaths: page.cssPaths?.length ? page.cssPaths : templates.sample.cssPaths, inlineStyles: page.inlineStyles || [], bodyClasses: page.bodyClasses || 'elementor-kit-257' };
}
export function homeTemplate(override: Partial<CapturedPage> | undefined = pageOverrides['/']): CapturedTemplate {
  return { html: override?.renderedHtml ?? override?.contentHtml ?? site.homeHtml, cssPaths: override?.cssPaths ?? site.homeCssPaths, inlineStyles: override?.inlineStyles ?? site.homeInlineStyles, bodyClasses: override?.bodyClasses ?? site.homeBodyClasses };
}
