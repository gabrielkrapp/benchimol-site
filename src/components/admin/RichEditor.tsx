'use client';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import { getEmbedUrlFromYoutubeUrl } from '@tiptap/extension-youtube';
import { createEditorExtensions } from '@/lib/admin/editor-extensions';
import { useEffect, useId, useRef, useState } from 'react';
import { safeLink, videoUrl } from '@/lib/admin/helpers';
import { MediaPicker } from './MediaPicker';
type EditorEntry = { kind: 'link' | 'video' | 'image'; value: string; alt: string; caption: string };

function EditorInputDialog({ entry, error, onChange, onApply, onClose }: { entry: EditorEntry; error: string; onChange: (entry: EditorEntry) => void; onApply: () => boolean; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null), titleId = useId();
  const title = entry.kind === 'link' ? 'Configurar link' : entry.kind === 'video' ? 'Adicionar vídeo' : 'Alt e legenda da imagem';
  const action = entry.kind === 'link' ? 'Salvar link' : entry.kind === 'video' ? 'Inserir vídeo' : 'Salvar imagem';
  useEffect(() => {
    if (dialog.current && !dialog.current.open) dialog.current.showModal();
    dialog.current?.querySelector('input')?.focus();
  }, []);
  function close() { dialog.current?.close(); onClose(); }
  return <dialog ref={dialog} className="admin-dialog" aria-labelledby={titleId} onCancel={event => { event.preventDefault(); close(); }} onClose={onClose}>
    <h2 id={titleId}>{title}</h2>
    <form onSubmit={event => { event.preventDefault(); if (onApply()) close(); }}>
      <div className="admin-dialog-body">
        {entry.kind === 'image' ? <>
          <label className="admin-field">Texto alternativo da imagem<input value={entry.alt} onChange={event => onChange({ ...entry, alt: event.target.value })} /></label>
          <label className="admin-field">Legenda da imagem (opcional)<textarea rows={3} value={entry.caption} onChange={event => onChange({ ...entry, caption: event.target.value })} /></label>
        </> : <label className="admin-field">{entry.kind === 'link' ? 'Endereço do link' : 'Endereço do vídeo'}<input value={entry.value} onChange={event => onChange({ ...entry, value: event.target.value })} /></label>}
        {entry.kind === 'link' && <p className="admin-muted">Use http, https, e-mail, telefone ou um caminho do site. Deixe vazio para remover o link.</p>}
        {entry.kind === 'video' && <p className="admin-muted">Cole o endereço HTTPS de um vídeo do YouTube.</p>}
        {error && <p className="admin-notice admin-notice-error" role="alert">{error}</p>}
      </div>
      <div className="admin-actions"><button type="button" className="admin-button admin-button-secondary" onClick={close}>Cancelar</button><button type="submit" className="admin-button">{action}</button></div>
    </form>
  </dialog>;
}

export function RichEditor({ html, onChange, label = 'Conteúdo do post', disabled = false }: { html: string; onChange: (html: string) => void; label?: string; disabled?: boolean }) {
  const [picker, setPicker] = useState(false), [error, setError] = useState('');
  const [entry, setEntry] = useState<EditorEntry | null>(null), previousFocus = useRef<HTMLElement | null>(null);
  const editor = useEditor({ immediatelyRender: false, extensions: createEditorExtensions(), content: html, editorProps: { attributes: { 'aria-label': label, role: 'textbox', 'aria-multiline': 'true' } }, onUpdate: ({ editor }) => onChange(editor.getHTML()) });
  // Editability changes must not reserialize saved HTML as an unsaved edit.
  useEffect(() => { editor?.setEditable(!disabled, false); }, [editor, disabled]);
  const state = useEditorState({ editor, selector: ({ editor: e }) => e ? { bold: e.isActive('bold'), italic: e.isActive('italic'), h2: e.isActive('heading', { level: 2 }), h3: e.isActive('heading', { level: 3 }), bullet: e.isActive('bulletList'), ordered: e.isActive('orderedList'), link: e.isActive('link'), image: e.isActive('image'), undo: e.can().undo(), redo: e.can().redo() } : null });
  function openEntry(kind: EditorEntry['kind']) {
    if (!editor || (kind === 'image' && !state?.image)) return;
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setError('');
    setEntry({ kind, value: kind === 'link' ? String(editor.getAttributes('link').href ?? '') : '', alt: String(editor.getAttributes('image').alt ?? ''), caption: String(editor.getAttributes('image').caption ?? '') });
  }
  function closeEntry() { setEntry(null); setError(''); if (previousFocus.current?.isConnected) previousFocus.current.focus(); }
  function applyEntry() {
    if (!editor || !entry) return false;
    if (entry.kind === 'link') {
      const value = entry.value.trim();
      if (!value) editor.chain().focus().extendMarkRange('link').unsetLink().run();
      else {
        const url = safeLink(value);
        if (!url) { setError('Use um endereço http, https, e-mail, telefone ou caminho do site.'); return false; }
        editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
      }
    } else if (entry.kind === 'video') {
      const value = entry.value.trim();
      if (!videoUrl(value)) { setError('Use um endereço HTTPS do YouTube. Outros provedores não estão autorizados.'); return false; }
      if (!getEmbedUrlFromYoutubeUrl({ url: value, nocookie: true })) { setError('Use um endereço HTTPS de um vídeo do YouTube com identificação do vídeo.'); return false; }
      if (!editor.chain().focus().setYoutubeVideo({ src: value }).run()) { setError('Não foi possível inserir este vídeo do YouTube. Confira o endereço.'); return false; }
    } else editor.chain().focus().updateAttributes('image', { alt: entry.alt, caption: entry.caption }).run();
    return true;
  }
  return <><div className="admin-editor" inert={disabled}><div className="admin-toolbar" role="toolbar" aria-label="Formatação do texto"><button type="button" disabled={!editor} onClick={() => editor?.chain().focus().setParagraph().run()}>Parágrafo</button><button type="button" aria-pressed={state?.h2 ?? false} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}>Título H2</button><button type="button" aria-pressed={state?.h3 ?? false} onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}>Título H3</button><button type="button" aria-label="Negrito" aria-pressed={state?.bold ?? false} onClick={() => editor?.chain().focus().toggleBold().run()}><strong>N</strong></button><button type="button" aria-label="Itálico" aria-pressed={state?.italic ?? false} onClick={() => editor?.chain().focus().toggleItalic().run()}><em>I</em></button><button type="button" aria-pressed={state?.bullet ?? false} onClick={() => editor?.chain().focus().toggleBulletList().run()}>Lista</button><button type="button" aria-pressed={state?.ordered ?? false} onClick={() => editor?.chain().focus().toggleOrderedList().run()}>Lista numerada</button><button type="button" aria-pressed={state?.link ?? false} onClick={() => openEntry('link')}>Link</button><button type="button" onClick={() => setPicker(true)}>Imagem</button><button type="button" disabled={!state?.image} onClick={() => openEntry('image')}>Alt e legenda</button><button type="button" onClick={() => openEntry('video')}>Vídeo</button><button type="button" disabled={!state?.undo} onClick={() => editor?.chain().focus().undo().run()}>Desfazer</button><button type="button" disabled={!state?.redo} onClick={() => editor?.chain().focus().redo().run()}>Refazer</button></div><EditorContent editor={editor} /></div>{entry && <EditorInputDialog entry={entry} error={error} onChange={value => { setEntry(value); setError(''); }} onApply={applyEntry} onClose={closeEntry} />}<MediaPicker open={picker} onClose={() => setPicker(false)} onSelect={media => { editor?.chain().focus().insertContent({ type: 'image', attrs: { src: media.url, alt: media.alt, caption: media.caption } }).run(); setPicker(false); }} /></>;
}
