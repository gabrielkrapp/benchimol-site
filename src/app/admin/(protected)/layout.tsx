import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/server/auth';
import { AdminShell } from '@/components/admin/AdminShell';
import { SetupPanel, ServiceUnavailable } from '@/components/admin/SetupPanel';
export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  let identity;
  try { identity = await requireAdmin(); }
  catch (error) {
    const status = error && typeof error === 'object' && 'status' in error ? Number(error.status) : 500;
    if (status === 401) redirect('/admin/login');
    if (status === 403) return <SetupPanel denied />;
    if (status === 503) { const code = error && typeof error === 'object' && 'code' in error ? error.code : ''; return code === 'setup_required' ? <SetupPanel /> : <ServiceUnavailable />; }
    throw error;
  }
  return <AdminShell name={identity.admin.displayName}>{children}</AdminShell>;
}
