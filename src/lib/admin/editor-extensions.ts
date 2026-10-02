import { Extension, Mark, Node } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Youtube from '@tiptap/extension-youtube';
import { safeLink } from './helpers';
const commonAttributes = ['class', 'id', 'style', 'aria-label', 'role'];
const LegacyAttributes = Extension.create({ name: 'legacyAttributes', addGlobalAttributes() { return [{ types: ['paragraph','heading','blockquote','underline','bold','italic','bulletList','orderedList','listItem','link','legacySpan','legacyAnchor'], attributes: Object.fromEntries(commonAttributes.map(name => [name, { default: null, parseHTML: (element: HTMLElement) => element.getAttribute(name) }])) }, { types: ['link'], attributes: { title: { default: null, parseHTML: (element: HTMLElement) => element.getAttribute('title') } } }]; } });
const LegacySpan = Mark.create({ name: 'legacySpan', parseHTML() { return [{ tag: 'span' }]; }, renderHTML({ HTMLAttributes }) { return ['span', HTMLAttributes, 0]; } });
const LegacyAnchor = Mark.create({ name: 'legacyAnchor', parseHTML() { return [{ tag: 'a:not([href])' }]; }, renderHTML({ HTMLAttributes }) { return ['a', HTMLAttributes, 0]; } });
const EmptyAnchor = Node.create({ name: 'emptyAnchor', inline: true, group: 'inline', atom: true, selectable: false, addAttributes() { return Object.fromEntries([...commonAttributes, 'href', 'target', 'rel', 'title'].map(name => [name, { default: null, parseHTML: (element: HTMLElement) => element.getAttribute(name) }])); }, parseHTML() { return [{ tag: 'a', priority: 70, getAttrs: element => !element.textContent && !element.childElementCount ? null : false }]; }, renderHTML({ HTMLAttributes }) { return ['a', HTMLAttributes]; } });
const imageAttributes = ['src','alt','title','width','height','srcset','sizes','decoding','loading','fetchpriority','class','id','style','aria-label','role','data-id'];
const CaptionImage = Image.extend({
  addAttributes() {
    const image = (element: HTMLElement) => element.tagName === 'FIGURE' ? element.querySelector('img') : element;
    return { ...this.parent?.(), ...Object.fromEntries(imageAttributes.map(name => [name, { default: name === 'alt' ? '' : null, parseHTML: (element: HTMLElement) => image(element)?.getAttribute(name) ?? null }])),
      ...Object.fromEntries([...commonAttributes, 'href', 'title', 'target', 'rel'].map(name => [`imageLink_${name}`, { default: null, rendered: false, parseHTML: (element: HTMLElement) => image(element)?.closest('a')?.getAttribute(name) ?? null }])),
      isFigure: { default: false, rendered: false, parseHTML: (element: HTMLElement) => element.tagName === 'FIGURE' },
      caption: { default: '', rendered: false, parseHTML: (element: HTMLElement) => element.tagName === 'FIGURE' ? element.querySelector('figcaption')?.textContent ?? '' : '' },
      hasCaption: { default: false, rendered: false, parseHTML: (element: HTMLElement) => element.tagName === 'FIGURE' && !!element.querySelector('figcaption') },
      ...Object.fromEntries(commonAttributes.map(name => [`figure_${name}`, { default: null, rendered: false, parseHTML: (element: HTMLElement) => element.tagName === 'FIGURE' ? element.getAttribute(name) : null }])),
      ...Object.fromEntries(commonAttributes.map(name => [`caption_${name}`, { default: null, rendered: false, parseHTML: (element: HTMLElement) => element.tagName === 'FIGURE' ? element.querySelector('figcaption')?.getAttribute(name) ?? null : null }])),
    };
  },
  parseHTML() { return [{ tag: 'figure', getAttrs: element => element.querySelector('img') ? null : false }, { tag: 'img[src]' }]; },
  renderHTML({ HTMLAttributes, node }) {
    const caption = String(node.attrs.caption ?? '');
    const linkAttrs = Object.fromEntries([...commonAttributes, 'href', 'title', 'target', 'rel'].filter(name => node.attrs[`imageLink_${name}`]).map(name => [name, node.attrs[`imageLink_${name}`]]));
    if (!node.attrs.isFigure && !caption) return linkAttrs.href ? ['a', linkAttrs, ['img', HTMLAttributes]] : ['img', HTMLAttributes];
    const figureAttrs = Object.fromEntries(commonAttributes.filter(name => node.attrs[`figure_${name}`]).map(name => [name, node.attrs[`figure_${name}`]]));
    const captionAttrs = Object.fromEntries(commonAttributes.filter(name => node.attrs[`caption_${name}`]).map(name => [name, node.attrs[`caption_${name}`]]));
    if (linkAttrs.href) return node.attrs.hasCaption || caption ? ['figure', figureAttrs, ['a', linkAttrs, ['img', HTMLAttributes]], ['figcaption', captionAttrs, caption]] : ['figure', figureAttrs, ['a', linkAttrs, ['img', HTMLAttributes]]];
    return node.attrs.hasCaption || caption ? ['figure', figureAttrs, ['img', HTMLAttributes], ['figcaption', captionAttrs, caption]] : ['figure', figureAttrs, ['img', HTMLAttributes]];
  },
});
/** A gallery remains a single read-only block; its source survives surrounding text edits. */
function galleryElement(html: string): HTMLElement {
  const container = document.createElement('div'); container.innerHTML = html;
  const root = container.firstElementChild as HTMLElement | null;
  if (!root || root.tagName !== 'FIGURE') throw new Error('Galeria inválida.');
  const tags = new Set(['FIGURE','FIGCAPTION','IMG','A','P','BR','STRONG','B','EM','I','SPAN','U']);
  const attributes = new Set([...commonAttributes, ...imageAttributes, 'href','target','rel']);
  for (const element of [root, ...root.querySelectorAll('*')]) {
    if (!tags.has(element.tagName)) { element.remove(); continue; }
    for (const attribute of [...element.attributes]) {
      if (!attributes.has(attribute.name) || attribute.name.startsWith('on')) element.removeAttribute(attribute.name);
      else if (['src','href'].includes(attribute.name) && !safeLink(attribute.value)) element.removeAttribute(attribute.name);
      else if (attribute.name === 'srcset' && /(?:javascript|data|vbscript):/i.test(attribute.value)) element.removeAttribute(attribute.name);
      else if (attribute.name === 'style' && /(?:expression|url|javascript|behavior)\s*[:(]/i.test(attribute.value)) element.removeAttribute(attribute.name);
    }
    if (element.tagName === 'A' && element.getAttribute('target') === '_blank') element.setAttribute('rel', 'noopener noreferrer');
  }
  return root;
}
const PreservedGallery = Node.create({
  name: 'preservedGallery', group: 'block', atom: true, selectable: true,
  addAttributes() { return { html: { default: '', rendered: false } }; },
  parseHTML() { return [{ tag: 'figure.wp-block-gallery', priority: 80, getAttrs: element => ({ html: galleryElement(element.outerHTML).outerHTML }) }]; },
  renderHTML({ node }) { return galleryElement(node.attrs.html); },
  addNodeView() { return ({ node }) => { const wrapper = document.createElement('div'); wrapper.className = 'admin-preserved-gallery'; wrapper.contentEditable = 'false'; wrapper.addEventListener('click', event => { if ((event.target as Element | null)?.closest('a')) event.preventDefault(); }); wrapper.append(galleryElement(node.attrs.html)); const label = document.createElement('small'); label.textContent = 'Galeria preservada. O texto ao redor pode ser editado; mudanças na galeria exigem revisão.'; wrapper.append(label); return { dom: wrapper }; }; },
});
export function createEditorExtensions() {
  return [StarterKit.configure({ heading: { levels: [2, 3, 4] }, codeBlock: false, code: false, horizontalRule: false, strike: false, link: { openOnClick: false, protocols: ['http','https','mailto','tel'], HTMLAttributes: { target: null, rel: null } } }), LegacyAttributes, LegacySpan, LegacyAnchor, EmptyAnchor, PreservedGallery, CaptionImage.configure({ allowBase64: false }), Youtube.configure({ nocookie: true, controls: true, allowFullscreen: true })];
}
