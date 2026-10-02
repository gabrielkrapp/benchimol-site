import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/server/auth';
import { getAdminPost } from '@/lib/server/admin-repository';
import { ArticleBody } from '@/components/public/ArticleBody';
import { formatDate, statusLabels } from '@/lib/admin/helpers';
export default async function PostPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin(); const post = await getAdminPost((await params).id); if (!post) notFound();
  return <><div className="admin-page-heading"><div><h1>Prévia privada</h1><p>Versão salva {post.version} · {statusLabels[post.status]}. As alterações não salvas no editor não aparecem aqui.</p></div><Link className="admin-button admin-button-secondary" href={`/admin/posts/${post.id}`}>Voltar ao editor</Link></div><div className="admin-preview"><h1>{post.title}</h1><p className="admin-muted" style={{ marginBottom: 20 }}>{post.authorName} · {formatDate(post.publishedAt)}</p>{post.featuredImage && <img className="admin-cover" src={post.featuredImage} alt={post.featuredAlt} />}<article><ArticleBody html={post.bodyHtml} /></article></div></>;
}
