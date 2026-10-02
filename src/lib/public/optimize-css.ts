import postcss, { type Container, type ChildNode } from 'postcss';

function ruleIdentity(node: ChildNode): string | null {
  if (node.type !== 'rule' || !node.nodes.every(child => child.type === 'decl' || child.type === 'comment')) return null;
  let parent = node.parent;
  while (parent && parent.type !== 'root') {
    if (parent.type === 'atrule' && /keyframes$/i.test(parent.name)) return null;
    parent = parent.parent;
  }
  // Keep raw declaration values and hacks as part of the identity. Equal selectors
  // in the same parent address the same elements under the same conditions.
  return JSON.stringify([node.selector, node.nodes.map(semanticNode)]);
}

function removeEarlierDuplicates(parent: Container): number {
  const seen = new Set<string>(); let removed = 0;
  for (const node of [...(parent.nodes ?? [])].reverse()) {
    const identity = ruleIdentity(node);
    if (identity !== null && seen.has(identity)) { node.remove(); removed++; continue; }
    if (identity !== null) seen.add(identity);
    if ('nodes' in node && node.nodes) removed += removeEarlierDuplicates(node as Container);
  }
  return removed;
}

function semanticNode(node: ChildNode): unknown {
  if (node.type === 'comment') return ['comment', node.text];
  if (node.type === 'decl') return ['decl', node.prop, node.value, node.important ?? false, node.raws.value ?? null, /[^\s]/.test(node.raws.before ?? '') ? node.raws.before : '', /[^\s:]/.test(node.raws.between ?? '') ? node.raws.between : ''];
  if (node.type === 'rule') return ['rule', node.selector, node.nodes.map(semanticNode)];
  return ['atrule', node.name, node.params, node.nodes?.map(semanticNode) ?? null];
}

export function capturedCssSemanticSignature(input: string): string {
  const root = postcss.parse(input); removeEarlierDuplicates(root);
  return JSON.stringify(root.nodes.map(semanticNode));
}

export function optimizeCapturedCss(input: string): { css: string; removedRules: number } {
  const root = postcss.parse(input);
  const removedRules = removeEarlierDuplicates(root);
  // Only parser-known formatting is compacted. Selector/value strings, calc(),
  // custom properties, comments, font order, keyframes and syntax hacks stay intact.
  root.walk(node => {
    if (/^\s*$/.test(node.raws.before ?? '')) node.raws.before = '';
    if ('after' in node.raws && /^\s*$/.test(node.raws.after as string)) node.raws.after = '';
    if (node.type === 'decl') {
      if (/^\s*:\s*$/.test(node.raws.between ?? '') && !(node.prop.startsWith('--') && !node.value.trim())) node.raws.between = ':';
    } else if ('between' in node.raws && /^\s*$/.test(node.raws.between as string)) node.raws.between = '';
  });
  root.raws.after = '';
  const css = root.toString();
  if (capturedCssSemanticSignature(css) !== capturedCssSemanticSignature(input)) throw new Error('CSS optimization changed its semantic signature');
  return { css, removedRules };
}
