import { htmlToDOM, Element, Text, type DOMNode } from 'html-react-parser';
export { htmlToDOM, Element, Text }; export type { DOMNode };
export function isElement(node: DOMNode): node is Element { return 'attribs' in node && 'children' in node; }
export function elements(nodes: DOMNode[], predicate: (node: Element) => boolean): Element[] {
  const result: Element[] = [];
  function visit(items: DOMNode[]) { for (const node of items) if (isElement(node)) { if (predicate(node)) result.push(node); visit(node.children as DOMNode[]); } }
  visit(nodes); return result;
}
export function hasClass(node: Element, name: string): boolean { return (node.attribs.class || '').split(/\s+/).includes(name); }
export function content(node: Element, html: string) { node.children = htmlToDOM(html); for (const child of node.children) child.parent = node; }
export function textContent(node: Element, text: string) { const child = new Text(text); child.parent = node; node.children = [child]; }
export function escapeHtml(text: string): string { return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
const voidTags = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
export function serialize(nodes: DOMNode[]): string {
  return nodes.map(node => {
    if (node.type === 'text') return escapeHtml((node as Text).data);
    if (!isElement(node)) return '';
    const attrs = Object.entries(node.attribs).map(([key, value]) => ` ${key}="${escapeHtml(value)}"`).join('');
    return `<${node.name}${attrs}>${voidTags.has(node.name) ? '' : `${serialize(node.children as DOMNode[])}</${node.name}>`}`;
  }).join('');
}
