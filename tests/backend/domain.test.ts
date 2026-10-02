import { describe, it, expect } from 'vitest';
import { parsePostCreate, parsePostPatch, parsePopup, parseContact, validateImage, isPopupVisible, validateSlug } from '@/lib/domain/validation';
import { sanitizeBodyHtml } from '@/lib/domain/sanitize';

describe('editorial validation and safe rendering', () => {
  it('rejects reserved institutional URLs and executable slugs', () => {
    for (const slug of ['admin','api','blog','cirurgia-de-catarata','../admin','a/b','']) expect(() => validateSlug(slug)).toThrow();
    expect(validateSlug('cuidados-com-a-visao')).toBe('cuidados-com-a-visao');
  });
  it('requires a version and explicit editorial status for updates', () => {
    expect(() => parsePostPatch({ title: 'Novo' })).toThrow();
    expect(() => parsePostPatch({ version: 1, status: 'scheduled' })).toThrow();
    expect(parsePostCreate({ title: 'Novo', slug: 'novo', bodyHtml: '<p>Texto</p>' }).status).toBe('draft');
  });
  it('removes executable HTML while retaining tables, images and authorized video', () => {
    const result = sanitizeBodyHtml('<p onclick="alert(1)">Texto<script>alert(1)</script><a href="javascript:alert(1)">link</a></p><table><tr><td>A</td></tr></table><img src="/wp-content/a.webp" alt="capa"><iframe src="https://www.youtube.com/embed/123"></iframe><iframe src="https://evil.example/embed"></iframe>');
    expect(result).not.toMatch(/script|onclick|javascript:|evil\.example/);
    expect(result).toContain('<table>'); expect(result).toContain('alt="capa"'); expect(result).toContain('youtube.com/embed/123');
  });
  it('requires image magic bytes as well as a declared MIME and size', () => {
    expect(() => validateImage(Buffer.from('<svg>bad</svg>'), 'image/png')).toThrow();
    expect(() => validateImage(Buffer.alloc(10 * 1024 * 1024 + 1), 'image/png')).toThrow();
    expect(validateImage(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]), 'image/png')).toBe('png');
  });
  it('rejects inverted popup ranges and evaluates exclusive UTC expiry', () => {
    expect(() => parsePopup({ title:'', text:'A', active:true, version:1, startsAt:'2026-10-02T00:00:00Z', endsAt:'2026-10-01T00:00:00Z' })).toThrow();
    const popup = { title:'', text:'A', active:true, version:1, startsAt:'2026-10-01T00:00:00Z', endsAt:'2026-10-02T00:00:00Z', updatedAt:'' };
    expect(isPopupVisible(popup, new Date('2026-10-01T00:00:00Z'))).toBe(true);
    expect(isPopupVisible(popup, new Date('2026-10-02T00:00:00Z'))).toBe(false);
  });
  it('normalizes a Brazilian WhatsApp number and rejects arbitrary destinations', () => {
    expect(parseContact({ whatsapp:'+55 (21) 99999-1234', message:'Olá', version:1 }).whatsapp).toBe('5521999991234');
    expect(() => parseContact({ whatsapp:'javascript:alert(1)', message:'Olá', version:1 })).toThrow();
  });
});

import { classifyBodyEditMode } from '@/lib/domain/validation';
describe('conservative legacy editor compatibility',()=>{
 it('enables the supported paragraph/list/image subset without rewriting HTML',()=>{
  expect(classifyBodyEditMode('<p id="texto" class="wp-block-paragraph">A <strong>visão</strong></p><figure class="wp-block-image"><img src="/a.webp" alt="olho" width="500" height="200"><figcaption>Legenda</figcaption></figure>')).toBe('rich');
 });
 it('keeps unsupported content protected rather than discarding it',()=>{
  for(const body of ['<table><tr><td>A</td></tr></table>','<video src="https://example.com/a.mp4"></video>','<figure><img src="/a.webp"><img src="/b.webp"></figure>','<iframe src="https://player.vimeo.com/video/123"></iframe>']) expect(classifyBodyEditMode(body)).toBe('legacy');
 });
});

import { assertClinicTarget } from '@/lib/server/clinic-binding';
import { canUseSnapshot } from '@/lib/server/config';
import { vi } from 'vitest';
describe('clinic isolation and development source selection',()=>{
 it('blocks the known LifeWallet projects even when misconfigured deliberately',()=>{
  for(const target of ['https://aaevrjkhfgazbudipjgb.supabase.co','postgresql://redacted@db.kohuycbqadlnhkbbqcir.supabase.co/db']) expect(()=>assertClinicTarget(target)).toThrow();
 });
 it('cannot fall back to a snapshot after any backend configuration is supplied',()=>{
  vi.stubEnv('ALLOW_LOCAL_SNAPSHOT','true');vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL','');vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY','');
  expect(canUseSnapshot()).toBe(true);vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL','https://clinic.invalid');expect(canUseSnapshot()).toBe(false);vi.unstubAllEnvs();
 });
});

it('binds remote operations to the project hostname or pooler identity, not an arbitrary URL substring',()=>{
 vi.stubEnv('SUPABASE_CLINIC_PROJECT_REF','abcdefghijklmnopqrst');
 expect(()=>assertClinicTarget('https://abcdefghijklmnopqrst.supabase.co',true)).not.toThrow();
 expect(()=>assertClinicTarget('postgresql://postgres.abcdefghijklmnopqrst:redacted@aws-0-sa-east-1.pooler.supabase.com/db',true)).not.toThrow();
 expect(()=>assertClinicTarget('https://wrongproject.supabase.co/abcdefghijklmnopqrst',true)).toThrow();
 vi.unstubAllEnvs();
});

it('supports preserved historical headings, quotes, underline and known WordPress galleries',()=>{
 expect(classifyBodyEditMode('<h4>História</h4><blockquote><p><u>Visão</u></p></blockquote><figure class="wp-block-gallery"><figure class="wp-block-image"><img src="/a.webp"></figure><figure class="wp-block-image"><img src="/b.webp"></figure></figure>')).toBe('rich');
 expect(sanitizeBodyHtml('<u>Visão</u>')).toContain('<u>Visão</u>');
});

it('keeps an authorized editor video reopenable while rejecting arbitrary embed wrappers',()=>{
 const video='<div data-youtube-video=""><iframe src="https://www.youtube-nocookie.com/embed/abc123" width="640" height="360" allowfullscreen></iframe></div>';
 const sanitized=sanitizeBodyHtml(video);expect(sanitized).toContain('data-youtube-video');expect(sanitized).toContain('youtube-nocookie.com/embed/abc123');expect(classifyBodyEditMode(sanitized)).toBe('rich');
 expect(classifyBodyEditMode('<div data-youtube-video=""><iframe src="https://player.vimeo.com/video/123"></iframe></div>')).toBe('legacy');
});

import { isPostPublic } from '@/lib/domain/validation';
it('publishes only at a valid UTC date boundary and keeps future or undated records private',()=>{
 const now=new Date('2026-10-01T00:00:00Z');
 expect(isPostPublic({status:'published',publishedAt:'2026-10-01T00:00:00Z'},now)).toBe(true);
 expect(isPostPublic({status:'published',publishedAt:'2026-10-01T00:00:01Z'},now)).toBe(false);
 expect(isPostPublic({status:'published',publishedAt:null},now)).toBe(false);
 expect(isPostPublic({status:'draft',publishedAt:'2026-09-01T00:00:00Z'},now)).toBe(false);
});

it('validates canonical URLs and restricts OG images to HTTP or safe local image paths',()=>{
 const base={version:1,status:'draft',seo:{title:'A',description:'B'}};
 for(const canonical of ['ftp://example.com/a','javascript:alert(1)','https://','/local/','https://example.com/%zz','https://example.com/a/../b','https://example.com/a\\b'])expect(()=>parsePostPatch({...base,seo:{...base.seo,canonical}})).toThrow();
 expect(parsePostPatch({...base,seo:{...base.seo,canonical:'https://clinicadeolhosbenchimol.com.br/artigo/'}}).seo?.canonical).toContain('/artigo/');
 for(const ogImage of ['texto','javascript:alert(1)','//example.com/a.png','/api/media/not-a-uuid','/wp-content/uploads/../a.png','/wp-content/uploads/%2e%2e/a.png','/legacy-assets/%zz.png','/legacy-assets/a\\b.png','/wp-content/uploads/a.png\0','/admin/private.png'])expect(()=>parsePostPatch({...base,seo:{...base.seo,ogImage}})).toThrow();
 for(const ogImage of ['http://example.com/a.jpg','https://example.com/a.webp','/api/media/99999999-9999-4999-8999-999999999999','/wp-content/uploads/2026/09/a.png','/legacy-assets/site/a.webp'])expect(parsePostPatch({...base,seo:{...base.seo,ogImage}}).seo?.ogImage).toBe(ogImage);
});
