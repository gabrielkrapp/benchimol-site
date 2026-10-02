import { AppError } from './errors';
import { assertClinicTarget } from './clinic-binding';
export function isBackendConfigured():boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
}
export function backendConfig() {
  if (!isBackendConfigured()) throw new AppError(503,'setup_required','Configure o Supabase exclusivo da clínica para acessar a administração.');
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL!;
  assertClinicTarget(url,true);
  if (!/^https:\/\//.test(url) && !(process.env.NODE_ENV!=='production' && /^http:\/\/(localhost|127\.0\.0\.1):/.test(url))) throw new AppError(503,'setup_required','Configuração de backend inválida.');
  return { url, key:process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY! };
}
export function canUseSnapshot():boolean {
  const entirelyUnconfigured=!process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  // The public archive is available before backend setup; administration never
  // uses it. Once configured, provider errors must not revive withdrawn posts.
  // A connected deployment can explicitly disable this initial archive mode.
  const setting=process.env.ALLOW_PUBLIC_SNAPSHOT ?? process.env.ALLOW_LOCAL_SNAPSHOT;
  return entirelyUnconfigured && setting!=='false';
}
