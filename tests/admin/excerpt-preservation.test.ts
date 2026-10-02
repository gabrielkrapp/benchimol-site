import { describe, expect, it } from 'vitest';
import { excerptText, textToHtml } from '@/components/admin/PostEditor';

describe('excerpt text and HTML conversion', () => {
  it('preserves hard breaks and paragraph boundaries when reopening the summary', () => {
    expect(excerptText('<p>Resumo QA &amp; &lt; &gt; ação<br />Segunda linha.</p><p>Outro parágrafo.</p>'))
      .toBe('Resumo QA & < > ação\nSegunda linha.\n\nOutro parágrafo.');
  });

  it('decodes each HTML entity once and keeps literal entity text after saving', () => {
    const input = 'Literal &lt; &gt; &amp; e caracteres < > & ação\nSegunda linha.\n\nOutro parágrafo.';
    expect(excerptText(textToHtml(input))).toBe(input);
    expect(excerptText('<p>Clínica <strong>&amp; equipe</strong> <a href="/exames/">&#39;exames&#39;</a></p>'))
      .toBe("Clínica & equipe 'exames'");
  });

  it('preserves each typed prefix, including spaces and unfinished line or paragraph breaks', () => {
    const input = 'Primeira frase\nSegunda linha.\n\nTerceira & < > ação\n\n';
    for (let length = 0; length <= input.length; length++) {
      const prefix = input.slice(0, length);
      expect(excerptText(textToHtml(prefix)), `typed prefix ${JSON.stringify(prefix)}`).toBe(prefix);
    }
    for (const text of [' ', '\n', '\n\n', '  texto  ', '\n\ntexto\n\n\n', 'texto\n \ntexto']) {
      expect(excerptText(textToHtml(text))).toBe(text);
    }
  });

  it('does not append a paragraph separator for trailing HTML whitespace or comments', () => {
    expect(excerptText('<p>Resumo</p>\n')).toBe('Resumo\n');
    expect(excerptText('<p>Resumo</p><!-- comentário -->')).toBe('Resumo');
    expect(excerptText('<p>Resumo</p><span> complemento</span>')).toBe('Resumo complemento');
  });
});
