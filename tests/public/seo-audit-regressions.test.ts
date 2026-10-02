import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { metadata as rootMetadata } from '@/app/layout';
import { publicRobots, metadataForPost, metadataForPage, articleJsonLd, clinicJsonLd } from '@/lib/public/seo';
import { institutionalPages, templates } from '@/lib/public/catalog';
import { mapSnapshotPost, snapshotSettings } from '@/lib/server/snapshot';
import { buildImportPlan } from '../../scripts/migration/import-database';
import { PublicShell } from '@/components/public/PublicShell';
import type { Post as DomainPost } from '@/lib/domain/types';
import posts from '../../data/wordpress/posts.json';

describe('SEO audit regressions', () => {
  it('lets search crawlers reach managed public images while retaining private-route and training blocks', () => {
    const { rules } = publicRobots();
    const groups = Array.isArray(rules) ? rules : [rules];
    const crawlAllowed = (group: (typeof groups)[number], path: string) => {
      const list = (value: string | string[] | undefined) => value ? Array.isArray(value) ? value : [value] : [];
      const rules = [...list(group.allow).map(prefix => ({ prefix, allowed: true })), ...list(group.disallow).map(prefix => ({ prefix, allowed: false }))]
        .filter(rule => path.startsWith(rule.prefix)).sort((a, b) => b.prefix.length - a.prefix.length || Number(b.allowed) - Number(a.allowed));
      return rules[0]?.allowed ?? true;
    };
    for (const group of groups.slice(0, 2)) {
      expect(crawlAllowed(group, '/api/media/123')).toBe(true);
      expect(crawlAllowed(group, '/api/auth/login/')).toBe(false);
      expect(crawlAllowed(group, '/api/admin/posts/')).toBe(false);
      expect(crawlAllowed(group, '/api/media-other/')).toBe(false);
      expect(crawlAllowed(group, '/admin/')).toBe(false);
      expect(crawlAllowed(group, '/preview/123/')).toBe(false);
      expect(crawlAllowed(group, '/wp-content/uploads/photo.jpg')).toBe(true);
    }
    expect(crawlAllowed(groups.at(-1)!, '/api/media/123')).toBe(false);
    expect(groups.at(-1)).toMatchObject({ userAgent: ['GPTBot', 'ClaudeBot', 'Google-Extended', 'CCBot'], disallow: '/' });
  });

  it('leaves literal entities in a newly edited post while decoding a source field only once', () => {
    const source = structuredClone(posts.find(post => post.wpId === 17)!);
    expect(source.seo.description).toBeUndefined();
    source.seo.title = 'SEO &amp; &lt;termo&gt;';
    source.seo.og_description = 'Texto &amp;hellip; &lt;tag&gt;';
    const legacy: DomainPost = mapSnapshotPost(source);
    expect(legacy.seo).toMatchObject({ title: 'SEO & <termo>', description: 'Texto &hellip; <tag>' });
    const editorial: DomainPost = { ...legacy, wpId: null, seo: { title: 'Título &amp; <termo>', description: 'Escrito &hellip; & <termo>' } };
    expect(metadataForPost(editorial).description).toBe('Escrito &hellip; & <termo>');
    expect(metadataForPost(editorial).title).toBe('Título &amp; <termo>');
    expect(articleJsonLd(editorial).description).toBe('Escrito &hellip; & <termo>');
  });

  it('preserves large image previews on the root, pages and posts', () => {
    const expected = { index: true, follow: true, 'max-image-preview': 'large' };
    expect(rootMetadata.robots).toMatchObject(expected);
    expect(metadataForPost(mapSnapshotPost(posts[0])).robots).toMatchObject(expected);
    expect(metadataForPage(institutionalPages[0]).robots).toMatchObject(expected);
  });

  it('represents the parent as a medical organization and physical clinics as its departments', () => {
    const graph = clinicJsonLd()['@graph'];
    expect(graph[0]).toMatchObject({ '@type': 'MedicalOrganization', '@id': 'https://clinicadeolhosbenchimol.com.br/#clinic' });
    expect(graph[0]).not.toHaveProperty('address');
    for (const clinic of graph.slice(1)) {
      expect(clinic).toMatchObject({ '@type': 'MedicalClinic', parentOrganization: { '@id': graph[0]['@id'] } });
      expect(clinic).toHaveProperty('address');
    }
  });

  it('marks the Home site name and omits a one-item breadcrumb, retaining inner-page trails', async () => {
    const render = async (path: string) => renderToStaticMarkup(await PublicShell({ path, title: 'Clínica de Olhos Benchimol', template: templates.sample, html: '<h1>Clínica de Olhos Benchimol</h1>', settings: snapshotSettings() }));
    const home = await render('/');
    expect(home).toContain('"@type":"WebSite"');
    expect(home).not.toContain('"@type":"BreadcrumbList"');
    const inner = await render('/glaucoma/');
    expect(inner).toContain('"@type":"BreadcrumbList"');
    expect(inner).toContain('"position":2');
    expect(inner).not.toContain('"@type":"WebSite"');
  });

  it('decodes verified WordPress entities once at both source boundaries without changing body or original dates', () => {
    const source = posts.find(post => post.wpId === 17)!;
    expect(source.seo.description ?? source.seo.og_description).toContain('&hellip;');
    const snapshot = mapSnapshotPost(source), imported = buildImportPlan().posts.find(post => post.wp_id === 17)!;
    expect(snapshot.seo.description).toContain('…');
    expect(snapshot.seo.description).not.toContain('&hellip;');
    expect(imported.seo.description).toBe(snapshot.seo.description);
    expect(metadataForPost(snapshot).description).toBe(snapshot.seo.description);
    expect(articleJsonLd(snapshot).description).toBe(snapshot.seo.description);
    expect(snapshot.bodyHtml).toBe(source.contentHtml);
    expect(imported.body_html).toBe(source.contentHtml);
    expect(snapshot.updatedAt).toBe(`${source.modifiedAtGmt}Z`);
    expect(imported.updated_at).toBe(`${source.modifiedAtGmt}Z`);
  });
});
