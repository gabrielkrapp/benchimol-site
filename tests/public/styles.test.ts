import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { it, expect } from 'vitest';
import { institutionalPages, galleries, templates, approvedCustomCss } from '@/lib/public/catalog';
import { homeTemplate, pageTemplate } from '@/lib/public/render';
import { capturedStyles } from '@/lib/public/styles';
import { publicStylesheet } from '@/lib/public/stylesheets';

it('every public family has static CSS identical to its scoped captured styles', async () => {
  const definitions = [homeTemplate(), ...institutionalPages.map(pageTemplate), ...galleries.map(pageTemplate), templates.blog, templates.galleryArchive, templates.article, templates.taxonomy, templates.sample];
  for (const definition of definitions) {
    const compiled = publicStylesheet(definition, approvedCustomCss);
    const css = await readFile(path.join(process.cwd(), 'public', compiled.href), 'utf8');
    const expected = await capturedStyles(definition.cssPaths, [...definition.inlineStyles, approvedCustomCss], definition.bodyClasses);
    expect(css).toBe(expected); expect(Buffer.byteLength(css)).toBe(compiled.bytes);
    expect(createHash('sha256').update(css).digest('hex')).toBe(compiled.sha256);
  }
}, 60000);

it('a newly published article reuses the static template without rebuilding CSS', () => {
  const newerArticle = { ...templates.article, bodyClasses: templates.article.bodyClasses.replace(/postid-\d+/g, 'postid-new-database-article') };
  expect(publicStylesheet(newerArticle, approvedCustomCss)).toEqual(publicStylesheet(templates.article, approvedCustomCss));
  expect(() => publicStylesheet({ ...templates.article, inlineStyles: ['.approved-update{color:blue}'] }, approvedCustomCss)).toThrow('manifest is stale');
});
