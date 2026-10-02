import { htmlToDOM, Text } from 'html-react-parser';

/** WordPress export fields only. One decoding pass; editorial inputs stay literal. */
export function importedSeoText(value: string): string {
  // Escape raw brackets before parsing so literal terms never become HTML tags.
  const escapedBrackets = value.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return htmlToDOM(escapedBrackets).map(node => node.type === 'text' ? (node as Text).data : '').join('');
}
