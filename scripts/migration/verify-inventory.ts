import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { verifyAssets, verifyRecords, type InventoryRecord, type InventoryAsset } from '../../src/lib/domain/inventory';
const root = process.cwd();
const json = async <T>(name: string): Promise<T> => JSON.parse(await readFile(`data/wordpress/${name}.json`, 'utf8'));
const posts = await json<InventoryRecord[]>('posts');
const pages = await json<InventoryRecord[]>('pages');
const assets = await json<InventoryAsset[]>('assets');
const media = await json<{wpId:number;localPath:string}[]>('media');
const reconciliation = JSON.parse(await readFile('docs/research/authenticated-reconciliation.json', 'utf8'));
const integrity = await json<{posts:Record<string,string>;pages:Record<string,string>}>('content-integrity');
const errors = [...verifyRecords(posts, integrity.posts), ...verifyRecords(pages, integrity.pages), ...await verifyAssets(root, assets)];
for (const name of ['posts', 'pages', 'media']) {
  if (reconciliation[name].missingInPublic.length || reconciliation[name].missingInExport.length) errors.push(`Unreconciled ${name}`);
}
const report = {
  checkedAt: new Date().toISOString(), source: 'local files and authenticated-public ID reconciliation',
  posts: posts.length, pages: pages.length, media: media.length,
  assetsChecked: assets.filter(x => x.status === 200).length,
  sourceFailures: assets.filter(x => x.status !== 200 && !x.supplementalSnapshot).map(x => ({url:x.originalUrl,status:x.status})),
  elementorCssNotGenerated: assets.filter(x => x.status !== 200 && x.supplementalSnapshot).map(x => ({url:x.originalUrl,status:x.status})),
  errors, passed: errors.length === 0
};
await mkdir('docs/validation', {recursive:true});
await writeFile('docs/validation/inventory.json', JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
if (errors.length) process.exitCode=1;
