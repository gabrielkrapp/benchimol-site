import { sanitizePublicHtml } from '@/lib/public/html';
/** Server-rendered public HTML shared with the authenticated editorial preview. */
export function ArticleBody({ html }: { html: string }) {
  return <div className="public-article-body" dangerouslySetInnerHTML={{ __html: sanitizePublicHtml(html) }} />;
}
export default ArticleBody;
