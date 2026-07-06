// A small library of plain outline icons for this theme's feature and reason lists, styled after
// the line-icon treatment `src/components/ui/Feature.astro` and `ContactCards.astro`
// (oxygenna-themes/foxi-astro-theme, MIT) apply to Heroicons (MIT, Tailwind Labs). These are
// original, simplified glyphs (not traced from Heroicons' own path data), reproducing each name's
// silhouette closely enough to read as distinct at a glance, which is the fidelity this theme's
// feature and reason lists need.
export const ICONS: Record<string, string> = {
  'chart-pie': 'M12 3v9h9a9 9 0 1 1-9-9Z M15 3.5A9 9 0 0 1 20.5 9H15V3.5Z',
  'squares-plus': 'M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm13 0v6m-3-3h6',
  'clipboard-check': 'M9 4h6a1 1 0 0 1 1 1v1H8V5a1 1 0 0 1 1-1Z M6 6h12v14H6V6Z M9 13l2 2 4-4',
  rocket: 'M12 2c3 2 5 6 4 11l-2 2-2-2-2 2-2-2c-1-5 1-9 4-11Z M9 15l-3 3v3h3l3-3 M13 9a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z',
  'device-phone-mobile': 'M8 2h8a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Z M11 19h2',
  trophy: 'M7 4h10v4a5 5 0 0 1-10 0V4Z M4 6h3v2a3 3 0 0 1-3-3Zm16 0h-3v2a3 3 0 0 0 3-3Z M9 17h6l1 4H8l1-4Z',
  'shield-check': 'M12 3l7 3v6c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6l7-3Z M9 12l2 2 4-4',
  'arrow-trending-up': 'M3 17l6-6 4 4 8-8 M15 7h6v6',
  'bell-alert': 'M12 3a5 5 0 0 0-5 5v3l-2 4h14l-2-4V8a5 5 0 0 0-5-5Z M10 19a2 2 0 0 0 4 0 M18 3a4 4 0 0 1 2 3.5',
  'clipboard-list': 'M9 4h6a1 1 0 0 1 1 1v1H8V5a1 1 0 0 1 1-1Z M6 6h12v14H6V6Z M9 11h6M9 14h6M9 17h4',
  'user-group': 'M8 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM2 20c0-3 3-5 6-5s6 2 6 5 M14 15c3 0 6 2 6 5',
  'chat-bubble-left-right': 'M3 5h13v8H8l-5 4V5Z M20 9h1v8l-4-3h-6V9',
  'computer-desktop': 'M4 4h16v11H4V4Z M9 20h6M12 15v5',
  bell: 'M12 3a5 5 0 0 0-5 5v3l-2 4h14l-2-4V8a5 5 0 0 0-5-5Z M10 19a2 2 0 0 0 4 0',
  'arrow-path': 'M4 9a8 8 0 0 1 14-4M20 15a8 8 0 0 1-14 4 M4 4v5h5 M20 20v-5h-5',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8c0-3.5 3-6 7-6s7 2.5 7 6',
  'paint-brush': 'M19 3c1 1 1 3 0 4l-9 9-4 1 1-4 9-9c1-1 3-1 4-1Z M6 17c-2 0-3 1-3 3 2 0 4-1 4-3',
  'circle-stack': 'M12 5c4 0 7 1.3 7 3s-3 3-7 3-7-1.3-7-3 3-3 7-3Z M5 8v5c0 1.7 3 3 7 3s7-1.3 7-3V8 M5 13v5c0 1.7 3 3 7 3s7-1.3 7-3v-5',
  'document-chart-bar': 'M7 3h8l4 4v14H7V3Z M10 13v5m4-8v8m4-5v5',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  'eye-slash': 'M3 3l18 18 M9.9 5.5A10.7 10.7 0 0 1 12 5c6 0 10 7 10 7a17 17 0 0 1-3.2 3.9M6.6 6.6A17 17 0 0 0 2 12s4 7 10 7a10 10 0 0 0 3.4-.6 M9.5 14.5a3 3 0 0 0 4.2-4.2',
  'shopping-cart': 'M3 4h3l2 11h10l2-7H7 M8 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm9 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z',
  'document-text': 'M7 3h8l4 4v14H7V3Z M10 12h7m-7 4h7m-7-8h3',
  'chat-bubble-left-ellipsis': 'M3 5h18v11H9l-6 5V5Z M8 10h.01M12 10h.01M16 10h.01',
  'cursor-arrow-ripple': 'M6 3l4 15 2.5-5.5L18 10 6 3Z M2 2a10 10 0 0 1 5 5',
  'rectangle-stack': 'M6 4h12v5H6V4Zm-2 7h16v5H4v-5Zm2 7h12v3H6v-3Z',
  mobile: 'M8 2h8a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Z M11 19h2',
  'bug-ant': 'M9 8h6l1-3M9 8l-1-3m10 8h3M4 13H1m17 5 2 2M3 20l2-2M18 8l2-2M4 6l2 2 M9 8a3 3 0 0 0-3 3v3a6 6 0 0 0 12 0v-3a3 3 0 0 0-3-3Z',
  scale: 'M12 3v18M6 7h12 M3 7l3 6h-6l3-6Zm18 0-3 6h6l-3-6Z M8 20h8',
  microphone: 'M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z M6 11a6 6 0 0 0 12 0 M12 17v4m-3 0h6',
  identification: 'M3 5h18v14H3V5Z M7 9h.01M7 13h4m-4 3h7 M15 9h4v6h-4V9Z',
  'credit-card': 'M3 6h18v12H3V6Z M3 10h18M6 15h4',
  'cube-transparent': 'M12 3 4 7v10l8 4 8-4V7l-8-4Zm0 0v18M4 7l8 4 8-4',
  'light-bulb': 'M9 18h6M10 21h4 M12 3a6 6 0 0 0-3 11c1 1 1 2 1 3h4c0-1 0-2 1-3a6 6 0 0 0-3-11Z',
  key: 'M15 7a4 4 0 1 1-4 4M15 7a4 4 0 0 0-4 4M15 7l6-6m-6 6-3 3m0 0-3 3 2 2 3-3m-2-2 2 2',
  'document-text-alt': 'M7 3h8l4 4v14H7V3Z',
  bolt: 'M13 2 4 14h6l-1 8 9-12h-6l1-8Z',
};

/** The plain star used when a feature or reason names no known icon (never expected in practice,
 *  since every static data entry in this theme carries a real `icon` key). */
export const DEFAULT_ICON = 'M12 3l2.5 5 5.5.8-4 3.9.9 5.5-4.9-2.6-4.9 2.6.9-5.5-4-3.9 5.5-.8Z';
