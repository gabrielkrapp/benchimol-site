import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

export interface InventoryAsset { originalUrl: string; status: number; localPath?: string; localSha256?: string; localBytes?: number; supplementalSnapshot?: string; }
export interface InventoryRecord { wpId: number; contentHtml: string; sourceContentSha256: string; }
export function publicAssetPath(root: string, pathname: string): string {
  if (!pathname.startsWith('/') || pathname.includes('\\') || pathname.includes('\0')) throw new Error('Invalid asset path');
  const publicRoot = path.resolve(root, 'public');
  const target = path.resolve(publicRoot, '.' + pathname);
  if (!target.startsWith(publicRoot + path.sep)) throw new Error('Asset escapes public directory');
  return target;
}
export async function verifyAssets(root: string, assets: InventoryAsset[]): Promise<string[]> {
  const errors: string[] = [];
  for (const asset of assets) {
    if (asset.status !== 200) continue; // Failures at source remain separately reported.
    if (!asset.localPath) { errors.push(`Missing destination: ${asset.originalUrl}`); continue; }
    try {
      const file = publicAssetPath(root, asset.localPath);
      const [bytes, info] = await Promise.all([readFile(file), stat(file)]);
      if (info.size !== asset.localBytes) errors.push(`Size mismatch: ${asset.localPath}`);
      if (createHash('sha256').update(bytes).digest('hex') !== asset.localSha256) errors.push(`Hash mismatch: ${asset.localPath}`);
    } catch { errors.push(`Unreadable asset: ${asset.localPath}`); }
  }
  return errors;
}
export function verifyRecords(records: InventoryRecord[], normalizedHashes?: Record<string, string>): string[] {
  const ids = new Set<number>(); const errors: string[] = [];
  for (const record of records) {
    if (ids.has(record.wpId)) errors.push(`Duplicate WP ID: ${record.wpId}`);
    ids.add(record.wpId);
    const expected = normalizedHashes ? normalizedHashes[String(record.wpId)] : record.sourceContentSha256;
    if (!expected || createHash('sha256').update(record.contentHtml).digest('hex') !== expected) errors.push(`Changed source body: ${record.wpId}`);
  }
  return errors;
}
