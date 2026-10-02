import type { NextConfig } from 'next';
const config: NextConfig = {
  // This marker is set only by the local Supabase dev wrapper. Normal dev,
  // production builds and previews keep .next and existing processes intact.
  distDir: process.env.BENCHIMOL_LOCAL_SUPABASE === 'true' ? '.next-supabase-local' : '.next',
  trailingSlash: true,
  poweredByHeader: false,
  outputFileTracingIncludes: { '/admin/prompts': ['./docs/prompts/**/*'] },
  async headers() {
    // Report-Only preserves captured Elementor/Next inline assets while violations
    // are inspected. Admin anti-framing below is enforced independently.
    const csp = ["default-src 'self'", "base-uri 'self'", "object-src 'none'",
      "script-src 'self' 'unsafe-inline'" + (process.env.NODE_ENV === 'production' ? '' : " 'unsafe-eval'"),
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: blob: https:", "font-src 'self' data: https://fonts.gstatic.com",
      "connect-src 'self' https://jjrzmuuwuvxcsnwqzvxf.supabase.co" + (process.env.NODE_ENV === 'production' ? '' : ' ws://127.0.0.1:* ws://localhost:* http://127.0.0.1:54321'),
      "frame-src https://www.google.com https://maps.google.com https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com",
      "media-src 'self' blob: https:", "form-action 'self'", "frame-ancestors 'self'",
    ].join('; ');
    return [{ source: '/:path*', headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()' },
      { key: 'Content-Security-Policy-Report-Only', value: csp }
    ] }, { source: '/site-styles/:path*', headers: [
      { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }
    ] }, { source: '/site-images/:path*', headers: [
      { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }
    ] }, { source: '/admin/:path*', headers: [
      { key: 'Cache-Control', value: 'private, no-store' },
      { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Content-Security-Policy', value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'" },
      { key: 'Referrer-Policy', value: 'no-referrer' }
    ] }, { source: '/api/:path*', headers: [
      { key: 'Cache-Control', value: 'private, no-store' },
      { key: 'X-Content-Type-Options', value: 'nosniff' }
    ] }];
  }
};
export default config;
