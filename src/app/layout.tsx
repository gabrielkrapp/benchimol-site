import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { SITE_ORIGIN } from '@/lib/public/html';
import { publicIndexRobots } from '@/lib/public/seo';
export const metadata: Metadata = {
  metadataBase: new URL(SITE_ORIGIN), title: 'Clínica de Olhos Benchimol',
  icons: { icon: '/wp-content/uploads/2023/01/Clinica-Benchimol-Favicon.png' },
  robots: publicIndexRobots,
};
export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="pt-BR"><body style={{ margin: 0 }}>{children}</body></html>;
}
