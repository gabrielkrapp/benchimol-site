import dimensionsData from '../../../data/wordpress/image-dimensions.json';
import backgroundsData from '../../../data/wordpress/derived-backgrounds.json';

const dimensions = dimensionsData as Record<string, { width: number; height: number }>;
const backgrounds = backgroundsData as Record<string, { src: string; width: number; height: number }>;
export function publicImageDimensions(src: string) {
  return dimensions[src.split('?')[0].split('#')[0]];
}
export function optimizedBackgroundUrl(src: string): string {
  return backgrounds[src]?.src ?? src;
}
export function initialBackgroundImage(template: { bodyClasses: string; html: string }) {
  const firstSlide = [...template.html.matchAll(/\bclass=(["'])(.*?)\1/gi)].find(match => match[2].split(/\s+/).includes('swiper-slide'));
  if (!firstSlide?.[2].split(/\s+/).includes('elementor-repeater-item-7edda30') || !template.html.includes('swiper-slide-bg')) return undefined;
  const ids = template.bodyClasses.split(/\s+/);
  if (ids.includes('page-id-2735') || ids.includes('home')) return backgrounds['/wp-content/uploads/2025/08/slide.png'];
  if (ids.some(name => ['page-id-2843', 'page-id-2889', 'page-id-3138'].includes(name))) return backgrounds['/wp-content/uploads/2025/07/937c18f100f7cc149f718438cf4e5bcb1865bba8.png'];
  return undefined;
}
