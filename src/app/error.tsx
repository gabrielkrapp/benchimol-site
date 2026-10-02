'use client';
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="public-failure" style={{ maxWidth: 700, margin: '60px auto', padding: 24, fontFamily: 'Arial, sans-serif' }}><h1>Conteúdo temporariamente indisponível</h1><p>Não foi possível consultar as informações atuais. Tente novamente em instantes.</p><button type="button" onClick={reset}>Tentar novamente</button><p><a href="/">Voltar à página inicial</a></p></main>;
}
