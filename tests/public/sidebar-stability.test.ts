import { readFile } from 'node:fs/promises';
import postcss from 'postcss';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { snapshotPosts } from '@/lib/server/snapshot';
import { templates } from '@/lib/public/catalog';
import { renderCapturedHtml } from '@/lib/public/render';
import { htmlToDOM, elements, hasClass } from '@/lib/public/dom';

describe('captured sidebar image stability', () => {
  it('reserves only the captured thumbnail flex width before decoding, leaving responsive widths unchanged', async () => {
    const css = postcss.parse(await readFile('src/components/public/public.css', 'utf8'));
    const locks: Record<string, string>[] = [], anchors: Record<string, string>[] = [];
    css.walkRules('.public-site .jkit-postlist article a>img', rule => { locks.push(Object.fromEntries(rule.nodes.filter(node => node.type === 'decl').map(node => [node.prop, node.value]))); });
    expect(locks).toEqual([{ 'flex-shrink': '0' }]);
    css.walkRules('.public-site .jkit-postlist article>a', rule => { anchors.push(Object.fromEntries(rule.nodes.filter(node => node.type === 'decl').map(node => [node.prop, node.value]))); });
    expect(anchors).toEqual([{ width: '100%' }]);
    expect(css.toString()).not.toContain('.wp-post-image{flex-shrink:0}');
  });
  it('never selects an exported square/newsletter crop for a differently shaped image at small sizes', async () => {
    const posts = await snapshotPosts();
    const recent = [3806, 3778, 3775].map(id => posts.find(post => post.wpId === id)!);
    const nodes = htmlToDOM(renderCapturedHtml(templates.article.html, { post: recent[0], recentPosts: recent }));
    const sidebar = elements(nodes, node => hasClass(node, 'jkit-postlist'))[0];
    const images = elements(sidebar.children as import('@/lib/public/dom').DOMNode[], node => node.name === 'img');
    expect(images).toHaveLength(3);
    for (const image of images) {
      const base = await sharp(`public${image.attribs.src}`).metadata();
      const entries = image.attribs.srcset.split(',').map(value => value.trim().split(/\s+/)[0]);
      expect(entries.length).toBeGreaterThan(2);
      for (const entry of entries) {
        const size = await sharp(`public${entry}`).metadata();
        const ratioError = Math.abs(size.width! / size.height! - base.width! / base.height!);
        expect(ratioError).toBeLessThan(0.01);
      }
    }
    expect(images[0].attribs.srcset).not.toContain('-150x150');
    expect(images[2].attribs.srcset).not.toContain('-150x150');
    expect(images[2].attribs.srcset).not.toContain('-350x100');
    // A square original may still use its square thumbnail; filtering is by
    // geometry, not by a filename blacklist that would waste valid candidates.
    expect(images[1].attribs.srcset).toContain('-150x150');
  });
});
