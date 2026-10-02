import type { CapturedTemplate } from '@/lib/public/catalog';
import { publicHeader, site, approvedCustomCss, templates, navigationState } from '@/lib/public/catalog';
import type { PublicSettings } from '@/lib/domain/types';
import { sanitizePublicHtml, whatsappUrl } from '@/lib/public/html';
import { publicStylesheet } from '@/lib/public/stylesheets';
import { escapeHtml } from '@/lib/public/dom';
import { PublicInteractions } from './Interactions';
import { breadcrumbJsonLd, clinicJsonLd, websiteJsonLd, jsonLdString } from '@/lib/public/seo';
import { popupIsCurrent } from '@/lib/domain/popup';
import { initialBackgroundImage } from '@/lib/public/images';
import './public.css';
import './gallery.css';
import './lightbox.css';
export async function PublicShell({ path, title, template, html, settings, schema }: { path: string; title: string; template: CapturedTemplate; html: string; settings: PublicSettings; schema?: unknown }) {
  const stylesheet = publicStylesheet(template, approvedCustomCss);
  const background = initialBackgroundImage(template);
  const initialPopupCurrent = popupIsCurrent(settings.popup, Date.now());
  return <div className={`public-site ${template.bodyClasses}`} data-content-source={settings.source} id="mytopdiv">
    <link rel="stylesheet" href={stylesheet.href} precedence="captured-public" />
    {background && <link rel="preload" as="image" href={background.src} type="image/webp" />}
    <a href="#content" className="public-skip">Ir para o conteúdo</a>
    <header dangerouslySetInnerHTML={{ __html: sanitizePublicHtml(publicHeader(path), { contact: settings.contact }) }} />
    <main id="content" tabIndex={-1} dangerouslySetInnerHTML={{ __html: `${!/<h1\b/i.test(html) ? `<h1 class="public-visually-hidden">${escapeHtml(title)}</h1>` : ''}${html}` }} />
    <footer dangerouslySetInnerHTML={{ __html: sanitizePublicHtml(navigationState(sanitizePublicHtml(site.footerHtml), path), { contact: settings.contact }) }} />
    <a href={whatsappUrl(settings.contact)} className="public-floating-whatsapp" target="_blank" rel="noopener noreferrer" aria-label="Entre em contato pelo WhatsApp" dangerouslySetInnerHTML={{ __html: sanitizePublicHtml(templates.floatingWhatsappHtml.replace(/display:\s*none;?/, 'display:block;').replace(/position:\s*fixed;/, '')) }} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(clinicJsonLd()) }} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(path === '/' ? websiteJsonLd() : breadcrumbJsonLd(path, title)) }} />
    {schema !== undefined && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(schema) }} />}
    {initialPopupCurrent && <noscript><section aria-label="Aviso da clínica"><h2>{settings.popup.title}</h2><p className="public-notice-text">{settings.popup.text}</p></section></noscript>}
    <PublicInteractions popup={settings.popup} initialPopupCurrent={initialPopupCurrent} />
  </div>;
}
