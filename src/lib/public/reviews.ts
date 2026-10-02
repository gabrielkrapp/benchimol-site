import { createHash } from 'node:crypto';
import captured from './captured-reviews.json';
import { elements, hasClass, htmlToDOM, serialize, type DOMNode } from './dom';

/** Restore the loaded public state only for the unchanged original widget.
 * Exact matching protects future approved Home overrides from this migration fix.
 * Captured markup is sanitized data; no Trustindex script or network request runs.
 */
export function restoreCapturedReviews(nodes: DOMNode[]): void {
  for (const widget of elements(nodes, node => hasClass(node, 'ti-widget') && hasClass(node, 'ti-goog'))) {
    const fingerprint = createHash('sha256').update(serialize([widget])).digest('hex');
    if (fingerprint !== captured.originalWidgetSha256) continue;
    const restored = elements(htmlToDOM(captured.html), node => hasClass(node, 'ti-widget') && hasClass(node, 'ti-goog'))[0];
    if (!restored) continue;
    widget.attribs = { ...restored.attribs };
    widget.children = restored.children;
    for (const child of widget.children) child.parent = widget;
  }
}
