'use client';
import { useEffect, useRef, useState } from 'react';
import type { ContactSettings, ContactRevision, PopupSettings } from '@/lib/domain/types';
import { AdminApiError, adminRequest, adminRequestDetailed } from '@/lib/admin/api';
import { formatDate, saoPauloToUtc, utcToSaoPaulo, whatsappLink } from '@/lib/admin/helpers';
import { ConfirmDialog, ErrorPanel, Loading, Notice, PageHeading, useResource, useUnsavedChanges } from './ui';
interface PopupForm { title: string; text: string; active: boolean; startsAt: string; endsAt: string; }
function popupForm(settings: PopupSettings): PopupForm { return { title: settings.title, text: settings.text, active: settings.active, startsAt: utcToSaoPaulo(settings.startsAt), endsAt: utcToSaoPaulo(settings.endsAt) }; }
export function PopupEditor() {
  const resource = useResource<PopupSettings>('/api/admin/settings/popup'); const [form, setForm] = useState<PopupForm | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState<Error | null>(null), [message, setMessage] = useState(''), [preview, setPreview] = useState(false);
  useEffect(() => { if (resource.data) setForm(popupForm(resource.data)); }, [resource.data]);
  const dirty = !!form && !!resource.data && JSON.stringify(form) !== JSON.stringify(popupForm(resource.data)); useUnsavedChanges(dirty);
  function update<K extends keyof PopupForm>(key: K, value: PopupForm[K]) { setForm(current => current ? { ...current, [key]: value } : current); setMessage(''); }
  async function save(event: React.FormEvent) { event.preventDefault(); if (!form || !resource.data) return; setBusy(true); setError(null); setMessage(''); try { const startsAt = form.startsAt === utcToSaoPaulo(resource.data.startsAt) ? resource.data.startsAt : saoPauloToUtc(form.startsAt), endsAt = form.endsAt === utcToSaoPaulo(resource.data.endsAt) ? resource.data.endsAt : saoPauloToUtc(form.endsAt); if (startsAt && endsAt && Date.parse(startsAt) >= Date.parse(endsAt)) throw new Error('O início do aviso deve ser anterior ao fim.'); if (form.active && !form.text.trim()) throw new Error('Preencha o texto antes de ativar o aviso.'); const result = await adminRequestDetailed<PopupSettings>('/api/admin/settings/popup', { method: 'PATCH', body: JSON.stringify({ ...form, startsAt, endsAt, version: resource.data.version }) }); resource.setData(result.data); setMessage(result.meta?.publication?.status === 'current' ? 'Aviso salvo. O site avalia o período automaticamente.' : 'Aviso salvo. A atualização pública está pendente de confirmação; a versão anterior pode continuar disponível.'); } catch (reason) { setError(reason instanceof Error ? reason : new Error('Não foi possível salvar o aviso.')); } finally { setBusy(false); } }
  function reload() { if (!dirty || window.confirm('Descartar suas alterações e carregar a configuração atual?')) { setError(null); resource.reload(); } }
  if (resource.loading) return <Loading text="Carregando aviso…" />; if (resource.error) return <ErrorPanel error={resource.error} retry={resource.reload} />; if (!form || !resource.data) return null;
  const settings = resource.data, expired = settings.active && settings.endsAt && Date.parse(settings.endsAt) <= Date.now();
  return <><PageHeading title="Aviso do site" description="Um aviso de texto com período opcional de exibição." action={<button className="admin-button admin-button-secondary" onClick={() => setPreview(true)}>Ver prévia</button>} />{error && <ErrorPanel error={error} />}{error instanceof AdminApiError && error.status === 409 && <Notice kind="warning"><p>O aviso foi alterado por outra pessoa. Suas alterações permanecem nesta tela.</p><button className="admin-button admin-button-secondary" onClick={reload}>Carregar configuração atual</button></Notice>}{message && <Notice>{message}</Notice>}{expired && <Notice kind="warning">O período do aviso salvo já terminou. Ajuste o fim para exibi-lo novamente.</Notice>}<div className="admin-grid"><section className="admin-card"><form onSubmit={save}><label className="admin-check" style={{ marginBottom: 24 }}><input type="checkbox" checked={form.active} disabled={busy} onChange={event => update('active', event.target.checked)} />Ativar aviso</label><label className="admin-field">Título (opcional)<input value={form.title} maxLength={200} disabled={busy} onChange={event => update('title', event.target.value)} /></label><label className="admin-field">Texto do aviso<textarea value={form.text} maxLength={5000} rows={7} disabled={busy} onChange={event => update('text', event.target.value)} /><small>Parágrafos são preservados. Use apenas texto; código e scripts não são aceitos.</small></label><div className="admin-two-fields"><label className="admin-field">Início (opcional)<input type="datetime-local" value={form.startsAt} disabled={busy} onChange={event => update('startsAt', event.target.value)} /></label><label className="admin-field">Fim (opcional)<input type="datetime-local" value={form.endsAt} disabled={busy} onChange={event => update('endsAt', event.target.value)} /></label></div><p className="admin-muted" style={{ marginBottom: 20 }}>Horários de São Paulo. Sem início, o aviso pode aparecer imediatamente. Sem fim, permanece até a desativação.</p><div className="admin-actions"><button className="admin-button" disabled={busy || !dirty}>{busy ? 'Salvando…' : 'Salvar aviso'}</button><span className={dirty ? 'admin-unsaved' : 'admin-muted'} aria-live="polite">{dirty ? 'Há alterações não salvas' : 'Sem alterações não salvas'}</span></div></form></section><section className="admin-card"><h2>Como o aviso aparece</h2><p style={{ marginTop: 16 }}>O aviso ativo aparece quando o início foi atingido e o fim ainda não chegou. O visitante pode fechá-lo.</p><p style={{ marginTop: 13 }}>Ele aparece uma vez por sessão de navegação e por versão. Um aviso atualizado pode aparecer novamente.</p><p className="admin-muted" style={{ marginTop: 20 }}>Versão salva: {settings.version}<br />Última alteração: {formatDate(settings.updatedAt)}</p><p className="admin-muted" style={{ marginTop: 10 }}>A prévia mostra as alterações desta tela, inclusive as que ainda não foram salvas.</p></section></div>{preview && <PopupPreview title={form.title} text={form.text} onClose={() => setPreview(false)} />}</>;
}
function PopupPreview({ title, text, onClose }: { title: string; text: string; onClose: () => void }) { const dialog = useRef<HTMLDialogElement>(null); useEffect(() => { dialog.current?.showModal(); }, []); return <dialog ref={dialog} className="admin-dialog" aria-labelledby="admin-popup-preview-title" onClose={onClose} onCancel={onClose}><div className="admin-card-header"><h2 id="admin-popup-preview-title">Prévia do aviso</h2><button className="admin-button admin-button-secondary" onClick={onClose}>Fechar</button></div><div className="admin-popup-preview">{title && <h3>{title}</h3>}<p>{text || 'O texto do aviso aparecerá aqui.'}</p></div><p className="admin-muted">Esta prévia não ativa o aviso no site.</p></dialog>; }
export function ContactEditor() {
  const resource = useResource<ContactSettings>('/api/admin/settings/contact');
  const history = useResource<ContactRevision[]>('/api/admin/settings/contact/revisions');
  const [form, setForm] = useState<ContactSettings | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState<Error | null>(null), [message, setMessage] = useState('');
  const [selected, setSelected] = useState<ContactRevision | null>(null);
  useEffect(() => { if (resource.data) setForm(resource.data); }, [resource.data]);
  const dirty = !!form && JSON.stringify(form) !== JSON.stringify(resource.data); useUnsavedChanges(dirty);
  function apply(result: Awaited<ReturnType<typeof adminRequestDetailed<ContactSettings>>>, label: string) {
    resource.setData(result.data); setForm(result.data); history.reload();
    setMessage(result.meta?.publication?.status === 'current' ? `${label}. O site usa o número e a mensagem atualizados.` : `${label}. A atualização pública está pendente de confirmação; a versão anterior pode continuar disponível.`);
  }
  async function save(event: React.FormEvent) {
    event.preventDefault(); if (!form || !resource.data) return; setBusy(true); setError(null); setMessage('');
    try {
      if (!whatsappLink(form.whatsapp, form.message)) throw new Error('Informe um número brasileiro com DDI 55, DDD e número de 8 ou 9 dígitos.');
      apply(await adminRequestDetailed<ContactSettings>('/api/admin/settings/contact', { method: 'PATCH', body: JSON.stringify({ whatsapp: form.whatsapp.replace(/\D/g, ''), message: form.message, version: resource.data.version }) }), 'Contato salvo');
    } catch (reason) { setError(reason instanceof Error ? reason : new Error('Não foi possível salvar o contato.')); } finally { setBusy(false); }
  }
  async function restore() {
    if (!selected || !resource.data) return; setBusy(true); setError(null); setMessage('');
    try { apply(await adminRequestDetailed<ContactSettings>('/api/admin/settings/contact/restore', { method: 'POST', body: JSON.stringify({ version: resource.data.version, revisionId: selected.id }) }), 'Contato restaurado'); setSelected(null); }
    catch (reason) { setError(reason instanceof Error ? reason : new Error('Não foi possível restaurar.')); setSelected(null); } finally { setBusy(false); }
  }
  function reload() { if (!dirty || window.confirm('Descartar suas alterações e carregar o contato atual?')) { setError(null); resource.reload(); history.reload(); } }
  if (resource.loading) return <Loading text="Carregando contato…" />; if (resource.error) return <ErrorPanel error={resource.error} retry={resource.reload} />; if (!form || !resource.data) return null;
  const digits = form.whatsapp.replace(/\D/g, ''), url = whatsappLink(form.whatsapp, form.message);
  return <>
    <PageHeading title="WhatsApp" description="O contato usado nos botões de WhatsApp do site." />
    {error && <ErrorPanel error={error} />}
    {error instanceof AdminApiError && error.status === 409 && <Notice kind="warning"><p>O contato foi alterado por outra pessoa. Suas mudanças estão preservadas.</p><button className="admin-button admin-button-secondary" onClick={reload}>Carregar contato atual</button></Notice>}
    {message && <Notice kind={message.includes('pendente') ? 'warning' : 'success'}>{message}</Notice>}
    <div className="admin-grid">
      <section className="admin-card"><form onSubmit={save}>
        <label className="admin-field">Número com país e DDD<input type="tel" inputMode="tel" value={form.whatsapp} maxLength={30} placeholder="55 21 99999-9999" disabled={busy} onChange={event => { setForm({ ...form, whatsapp: event.target.value }); setMessage(''); }} /><small>Exemplo: 55 para Brasil, seguido do DDD e do número. Não inclua links.</small></label>
        <label className="admin-field">Mensagem inicial<textarea value={form.message} maxLength={1000} disabled={busy} onChange={event => { setForm({ ...form, message: event.target.value }); setMessage(''); }} /><small>Essa mensagem aparece preenchida para o visitante revisar antes de enviar.</small></label>
        <div className="admin-actions"><button className="admin-button" disabled={busy || !dirty}>{busy ? 'Salvando…' : 'Salvar contato'}</button><span className={dirty ? 'admin-unsaved' : 'admin-muted'} aria-live="polite">{dirty ? 'Há alterações não salvas' : 'Sem alterações não salvas'}</span></div>
      </form></section>
      <section className="admin-card"><h2>Teste o contato</h2><p style={{ marginTop: 17 }}>{digits || 'Número não preenchido'}</p><p style={{ margin: '12px 0 20px', whiteSpace: 'pre-wrap' }}>{form.message || 'Sem mensagem inicial.'}</p>
        {url ? <a href={url} target="_blank" rel="noopener noreferrer" className="admin-button admin-button-secondary">Testar link do WhatsApp</a> : <p className="admin-muted">Preencha um número válido para testar o link.</p>}
        <p className="admin-muted" style={{ marginTop: 18 }}>O teste abre o WhatsApp com os campos desta tela e não envia mensagem automaticamente. Salve para atualizar o site.</p><p className="admin-muted" style={{ marginTop: 18 }}>Última alteração: {formatDate(resource.data.updatedAt)} · Versão {resource.data.version}</p>
      </section>
    </div>
    <section className="admin-card" style={{ marginTop: 24 }}><h2>Histórico do contato</h2>
      {history.loading ? <Loading /> : history.error ? <ErrorPanel error={history.error} retry={history.reload} /> : history.data?.length ? <ul className="admin-list">{history.data.map(revision => <li key={revision.id}><strong>Versão {revision.version} · {revision.snapshot.whatsapp}</strong><small>{formatDate(revision.createdAt)} · {revision.actorName}</small><p style={{ whiteSpace: 'pre-wrap' }}>{revision.snapshot.message}</p><button type="button" className="admin-text-button" disabled={busy} onClick={() => setSelected(revision)}>Restaurar este contato</button></li>)}</ul> : <p className="admin-muted" style={{ marginTop: 16 }}>As configurações anteriores aparecem aqui depois de uma alteração.</p>}
    </section>
    <ConfirmDialog open={!!selected} title="Restaurar este contato?" confirmLabel="Restaurar contato" busy={busy} onClose={() => { if (!busy) setSelected(null); }} onConfirm={restore}>
      <p>O site passará a usar o número e a mensagem da versão {selected?.version}.</p><p>{selected?.snapshot.whatsapp}</p><p style={{ whiteSpace: 'pre-wrap' }}>{selected?.snapshot.message}</p>{dirty && <p>As alterações não salvas nesta tela serão descartadas.</p>}
    </ConfirmDialog>
  </>;
}
