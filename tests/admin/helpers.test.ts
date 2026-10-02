import { describe, expect, it } from 'vitest';
import { isRichBodySupported, makePostPayload, safeLink, saoPauloToUtc, slugify, utcToSaoPaulo, validateUpload, whatsappLink } from '../../src/lib/admin/helpers';
import type { Post } from '../../src/lib/domain/types';

describe('horários do painel', () => {
  it('armazena horário de São Paulo em UTC e preserva o valor exibido', () => {
    expect(saoPauloToUtc('2026-09-30T09:30')).toBe('2026-09-30T12:30:00.000Z');
    expect(utcToSaoPaulo('2026-09-30T12:30:00.000Z')).toBe('2026-09-30T09:30');
  });
  it('rejeita datas inválidas e horários inexistentes no antigo horário de verão', () => {
    expect(() => saoPauloToUtc('2026-02-30T09:00')).toThrow();
    expect(() => saoPauloToUtc('2018-11-04T00:30')).toThrow();
    expect(saoPauloToUtc('')).toBeNull();
  });
});

describe('preservação editorial', () => {
  it('não envia o corpo legado ao salvar metadados', () => {
    const base = { seo: { title: '', description: '' }, bodyEditMode: 'legacy', bodyHtml: '<table><tr><td>original</td></tr></table>', version: 8 } as Post;
    const result = makePostPayload({ ...base, title: 'Título corrigido', bodyHtml: '<p>alterado</p>' }, base, 'draft');
    expect(result).not.toHaveProperty('bodyHtml');
    expect(result.version).toBe(8);
    expect(result.title).toBe('Título corrigido');
  });
  it('bloqueia edição visual que removeria tabelas ou atributos legados', () => {
    expect(isRichBodySupported('<p>Texto <strong>importante</strong></p><h2>Título</h2>')).toBe(true);
    expect(isRichBodySupported('<table><tr><td>Exame</td></tr></table>')).toBe(false);
    expect(isRichBodySupported('<p style="text-align:center">Texto</p>')).toBe(true);
    expect(isRichBodySupported('<p data-layout="complexo">Texto</p>')).toBe(false);
    expect(isRichBodySupported('<iframe src="https://example.org/video"></iframe>')).toBe(false);
  });
  it('gera slug legível sem mudar slugs existentes e limita links', () => {
    expect(slugify('Óculos: prevenção e saúde!')).toBe('oculos-prevencao-e-saude');
    expect(safeLink('javascript:alert(1)')).toBeNull();
    expect(safeLink('https://example.org/artigo')).toBe('https://example.org/artigo');
    expect(safeLink('/blog/')).toBe('/blog/');
    expect(safeLink('//example.org')).toBeNull();
  });
});

describe('upload antes do envio', () => {
  it('rejeita MIME, extensão conflitante e arquivos acima de 10 MB', () => {
    expect(validateUpload({ name: 'foto.webp', type: 'image/webp', size: 1024 })).toBeNull();
    expect(validateUpload({ name: 'foto.svg', type: 'image/svg+xml', size: 1024 })).toMatch(/formato/i);
    expect(validateUpload({ name: 'arquivo.html', type: 'image/jpeg', size: 1024 })).toMatch(/extensão/i);
    expect(validateUpload({ name: 'foto.jpg', type: 'image/jpeg', size: 10 * 1024 * 1024 + 1 })).toMatch(/10 MB/);
  });
});

it('gera link WhatsApp brasileiro com mensagem codificada', () => {
  expect(whatsappLink('+55 (21) 99999-9999', 'Olá! Exame & consulta')).toBe('https://wa.me/5521999999999?text=Ol%C3%A1!%20Exame%20%26%20consulta');
  expect(whatsappLink('12345678901', 'Olá')).toBeNull();
});
it('omite slug inalterado e SEO opcional vazio na edição', () => {
  const base = { slug: 'cirurgia-refrativa', version: 3, bodyEditMode: 'legacy', seo: { title: '', description: '' } } as Post;
  const payload = makePostPayload({ ...base, seo: { title: 'Título', description: 'Descrição', canonical: '', ogImage: '' } }, base, 'draft');
  expect(payload).not.toHaveProperty('slug');
  expect(payload.seo).toEqual({ title: 'Título', description: 'Descrição' });
});
