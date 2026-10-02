import { LoginForm } from '@/components/admin/LoginForm';
import { SetupPanel } from '@/components/admin/SetupPanel';
import { isBackendConfigured } from '@/lib/server/config';
export default function LoginPage() { return isBackendConfigured() ? <LoginForm /> : <SetupPanel />; }
