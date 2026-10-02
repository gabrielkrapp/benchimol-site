import { describe, expect, it } from 'vitest';
import * as importer from '../../scripts/migration/import-database';
import type { LegacySeoRepair } from '../../scripts/migration/import-database';

describe('source-bound legacy SEO repair plan', () => {
  it('targets the encoded WP record using its exact old SEO and source identity', () => {
    const repairs = importer.buildLegacySeoRepairPlan?.() ?? [];
    const repair = repairs.find(item => item.wpId === 17);
    expect(repair).toMatchObject({ wpId: 17, version: 1 });
    expect(repair?.sourceHash).toMatch(/^[a-f0-9]{64}$/);
    expect(repair?.before.description).toContain('&hellip;');
    expect(repair?.after.description).toContain('…');
    expect(repair?.after.canonical).toBe(repair?.before.canonical);
  });

  it('distinguishes an untouched imported record from a completed repair and editorial conflicts', () => {
    const repair: LegacySeoRepair = { id: 'wp17-id', wpId: 17, version: 1, sourceHash: 'source-17', before: { title: 'Texto', description: 'Antigo &hellip;', canonical: 'https://example.org/texto/' }, after: { title: 'Texto', description: 'Antigo …', canonical: 'https://example.org/texto/' } };
    const row = { id: repair.id, wp_id: 17, version: 1, source_hash: 'source-17', seo: repair.before };
    const classify = (value: typeof row) => importer.legacySeoRepairState?.(value, repair) ?? 'conflict';
    expect(classify(row)).toBe('pending');
    expect(classify({ ...row, seo: repair.after })).toBe('already_repaired');
    expect(classify({ ...row, version: 2 })).toBe('conflict');
    expect(classify({ ...row, wp_id: 18 })).toBe('conflict');
    expect(classify({ ...row, source_hash: 'other-export' })).toBe('conflict');
    expect(classify({ ...row, seo: { ...repair.before, description: 'Editado &hellip;' } })).toBe('conflict');
    expect(classify({ ...row, seo: { ...repair.before, canonical: 'https://another.example/' } })).toBe('conflict');
  });
});
