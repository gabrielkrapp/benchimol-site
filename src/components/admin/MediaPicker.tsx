'use client';
import { useEffect, useRef, useState } from 'react';
import type { Media, PageResult } from '@/lib/domain/types';
import { EmptyState, ErrorPanel, Loading, Pager, useResource } from './ui';
export function MediaPicker({ open, onClose, onSelect }: { open: boolean; onClose: () => void; onSelect: (media: Media) => void }) {
  return open ? <PickerContent onClose={onClose} onSelect={onSelect} /> : null;
}
function PickerContent({ onClose, onSelect }: { onClose: () => void; onSelect: (media: Media) => void }) {
  const dialog = useRef<HTMLDialogElement>(null), [page, setPage] = useState(1); const { data, error, loading, reload } = useResource<PageResult<Media>>(`/api/admin/media?page=${page}&pageSize=18`);
  useEffect(() => { dialog.current?.showModal(); }, []);
  return <dialog ref={dialog} className="admin-dialog" aria-labelledby="admin-media-title" onCancel={onClose} onClose={onClose}><div className="admin-card-header"><h2 id="admin-media-title">Escolher imagem</h2><button className="admin-button admin-button-secondary" onClick={onClose}>Fechar</button></div><p className="admin-muted" style={{ marginBottom: 15 }}>As imagens mantêm o texto alternativo e a legenda da biblioteca. Novos arquivos podem ser enviados em Mídias.</p>{loading ? <Loading /> : error ? <ErrorPanel error={error} retry={reload} /> : data && <><div className="admin-media-picker"><div className="admin-media-grid">{data.items.filter(media => media.mimeType.startsWith('image/')).map(media => <div className="admin-media-card" key={media.id}><button aria-label={`Escolher ${media.alt || media.url.split('/').pop()}`} onClick={() => onSelect(media)}><img src={media.url} alt={media.alt} className="admin-media-thumb" loading="lazy" /></button><div className="admin-media-info"><p>{media.alt || 'Sem texto alternativo'}</p><button className="admin-text-button" onClick={() => onSelect(media)}>Escolher</button></div></div>)}</div>{!data.items.length && <EmptyState title="Nenhuma mídia cadastrada"><p>Envie uma imagem na biblioteca de mídias.</p></EmptyState>}</div><Pager page={data.page} total={data.total} pageSize={data.pageSize} onChange={setPage} /></>}</dialog>;
}
