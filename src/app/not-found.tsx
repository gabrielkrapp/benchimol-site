import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Página não encontrada — Clínica de Olhos Benchimol', robots: { index: false, follow: true } };
export default function NotFoundPage() {
  return <main style={{ maxWidth: 700, margin: '60px auto', padding: 24, fontFamily: 'Arial, sans-serif' }}><h1>Página não encontrada</h1><p>O endereço solicitado não corresponde a uma página disponível.</p><p><a href="/">Página inicial</a> · <a href="/blog/">Blog</a></p></main>;
}
