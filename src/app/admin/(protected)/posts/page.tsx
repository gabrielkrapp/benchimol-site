import { Suspense } from 'react';
import { PostsList } from '@/components/admin/PostsList';
import { Loading } from '@/components/admin/ui';
export default function PostsPage() { return <Suspense fallback={<Loading />}><PostsList /></Suspense>; }
