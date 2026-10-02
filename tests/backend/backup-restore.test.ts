import { describe,it,expect } from 'vitest';
import { mkdtemp,mkdir,writeFile,readFile,rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { BACKUP_TABLES,hashBytes } from '../../scripts/migration/backup-database';
import { readVerifiedBackup } from '../../scripts/migration/restore-database';
describe('backup validation before any remote write',()=>{
 it('verifies database and binary checksums and rejects tampering',async()=>{
  const folder=await mkdtemp(join(tmpdir(),'benchimol-backup-test-'));
  try{
   await mkdir(join(folder,'files'));const bytes=Buffer.from([137,80,78,71,13,10,26,10]);await writeFile(join(folder,'files','one.bin'),bytes);
   const tables=Object.fromEntries(BACKUP_TABLES.map(t=>[t,[]]));
   const manifest={schemaVersion:1,createdAt:'2026-09-30T00:00:00Z',projectRef:'abcdefghijklmnopqrst',tables,files:[{path:'admin/image.png',localFile:'files/one.bin',sha256:hashBytes(bytes),bytes:8,mimeType:'image/png'}],databaseSha256:hashBytes(JSON.stringify(tables))};
   const path=join(folder,'manifest.json');await writeFile(path,JSON.stringify(manifest));expect((await readVerifiedBackup(path)).files).toHaveLength(1);
   await writeFile(join(folder,'files','one.bin'),Buffer.from('tampered'));await expect(readVerifiedBackup(path)).rejects.toThrow(/checksum/);
   manifest.databaseSha256='0'.repeat(64);await writeFile(path,JSON.stringify(manifest));await expect(readVerifiedBackup(path)).rejects.toThrow(/Database checksum/);
  }finally{await rm(folder,{recursive:true,force:true});}
 });
});
