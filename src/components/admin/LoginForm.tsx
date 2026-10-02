'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminRequest } from '@/lib/admin/api';
export function LoginForm() {
  const router = useRouter(), [busy, setBusy] = useState(false), [error, setError] = useState('');
  async function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); setBusy(true); setError(''); const form = new FormData(event.currentTarget); try { await adminRequest('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: String(form.get('email') ?? '').trim(), password: String(form.get('password') ?? '') }) }); router.replace('/admin'); router.refresh(); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível entrar.'); setBusy(false); } }
  return <div className="admin-root admin-login-page"><section className="admin-login-card"><span className="admin-brand-mark" aria-hidden="true">B</span><h1>Entrar no painel</h1><p>Administração do site da Clínica de Olhos Benchimol.</p><form onSubmit={submit}><label className="admin-field">E-mail<input name="email" type="email" required autoComplete="username" inputMode="email" autoFocus /></label><label className="admin-field">Senha<input name="password" type="password" required autoComplete="current-password" /></label>{error && <p className="admin-notice admin-notice-error" role="alert">{error}</p>}<button className="admin-button admin-button-full" disabled={busy}>{busy ? 'Entrando…' : 'Entrar'}</button></form><p className="admin-muted">Precisa de acesso ou esqueceu a senha? Fale com o responsável pelo site. A recuperação por e-mail aguarda validação.</p><a href="/">Voltar ao site</a></section></div>;
}
