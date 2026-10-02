// Exact glyph outlines from the captured eicons / Font Awesome SVG fonts.
// Rendering these two navigation controls as SVG avoids dependence on font loading.
const menu = 'M104 517h792c33 0 62 29 62 62s-29 63-62 63h-792c-33 0-62-29-62-63s29-62 62-62z m0-250h792c33 0 62 29 62 62s-29 63-62 63h-792c-33 0-62-29-62-63s29-62 62-62z m0-250h792c33 0 62 29 62 62s-29 63-62 63h-792c-33 0-62-29-62-63s29-62 62-62z';
const close = 'M742 683l-242-241-242 241c-12 13-25 17-41 17-21 0-38-8-50-17-13-12-17-29-17-45 0-17 4-30 21-42l237-246-241-242c-29-29-29-58 0-87 29-29 58-29 87 0l242 242 242-242c12-13 29-17 45-17 17 0 34 4 46 17 13 12 17 25 17 46 0 16-4 33-17 46l-241 237 245 242c30 29 30 58 0 87-29 34-58 34-91 4z';
export function menuGlyph(className: string, isClose = false): string {
  return `<svg class="${className}" width="1em" height="1em" viewBox="0 0 1000 1000" fill="currentColor" aria-hidden="true"><g transform="translate(0 850) scale(1 -1)"><path d="${isClose ? close : menu}"></path></g></svg>`;
}
export const caretGlyph = '<svg class="fas fa-caret-down public-caret-glyph" width=".625em" height="1em" viewBox="0 0 320 512" fill="currentColor" aria-hidden="true"><g transform="translate(0 448) scale(1 -1)"><path d="M31.2998 256h257.3c17.8008 0 26.7002 -21.5 14.1006 -34.0996l-128.601 -128.7c-7.7998 -7.7998 -20.5 -7.7998 -28.2998 0l-128.6 128.7c-12.6006 12.5996 -3.7002 34.0996 14.0996 34.0996z"></path></g></svg>';
