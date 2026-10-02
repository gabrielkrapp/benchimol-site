import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { publicAssetPath, verifyRecords } from '../../src/lib/domain/inventory';

describe('migration preservation', () => {
  it('detects a replaced body and a reused WP ID', () => {
    const contentHtml='<p>Original article</p>';
    const record={wpId:42,contentHtml,sourceContentSha256:createHash('sha256').update(contentHtml).digest('hex')};
    expect(verifyRecords([record])).toEqual([]);
    expect(verifyRecords([record,{...record,contentHtml:'<p>Lost content</p>'}])).toEqual(['Duplicate WP ID: 42','Changed source body: 42']);
  });
  it('never verifies files outside public', () => {
    expect(() => publicAssetPath('/tmp/site','/../../secret')).toThrow();
    expect(() => publicAssetPath('/tmp/site','/a\\b')).toThrow();
    expect(publicAssetPath('/tmp/site','/wp-content/uploads/photo.webp')).toBe('/tmp/site/public/wp-content/uploads/photo.webp');
  });
  it('preserves all authenticated public IDs rather than counting destinations', () => {
    const report=JSON.parse(readFileSync('docs/research/authenticated-reconciliation.json','utf8'));
    for (const [kind,count] of [['posts',154],['pages',38],['media',551]] as const) {
      expect(report[kind].publicCount).toBe(count);
      expect(report[kind].missingInPublic).toEqual([]);
      expect(report[kind].missingInExport).toEqual([]);
    }
    const source=JSON.parse(readFileSync('data/wordpress/authenticated-public.json','utf8'));
    expect(source.items.some((x:{status:string})=>['private','draft'].includes(x.status))).toBe(false);
    expect(source.items.some((x:{type:string})=>x.type==='elementor_snippet')).toBe(false);
    expect(source.authors.every((x:object)=>Object.keys(x).sort().join(',')==='displayName,wpId')).toBe(true);
    expect(source.items.every((x:object)=>!Object.hasOwn(x,'comments'))).toBe(true);
  });
});
