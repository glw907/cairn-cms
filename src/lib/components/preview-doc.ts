// cairn-cms: the edit page's preview-frame document. The admin's chrome isolation keeps the
// site's CSS out of the admin document, so EditPage renders the preview inside a sandboxed
// iframe whose document links the site's own stylesheets from the adapter's preview knob. This
// module builds that iframe's srcdoc as one pure string, so its shape is unit-testable, and it
// carries the device table the frame's width control offers.

import { escapeHtml } from '../escape.js';
import type { ResolvedPreview } from '../content/types.js';

/** One width the preview frame can take. */
export interface PreviewDevice {
  id: 'desktop' | 'tablet' | 'phone' | 'small';
  /** The device menu label, also the frame caption's first half. */
  label: string;
  /** Frame width in CSS pixels; null fills the pane (Desktop). */
  width: number | null;
}

/** A preview device's id, the value the page persists. */
export type PreviewDeviceId = PreviewDevice['id'];

/** The four widths the device menu offers, in menu order. Desktop leads as the default. */
export const previewDevices: PreviewDevice[] = [
  { id: 'desktop', label: 'Desktop', width: null },
  { id: 'tablet', label: 'Tablet', width: 768 },
  { id: 'phone', label: 'Phone', width: 390 },
  { id: 'small', label: 'Small phone', width: 320 },
];

/** The table row for a device id. The id type makes a miss impossible; the fallback satisfies find. */
export function previewDevice(id: PreviewDeviceId): PreviewDevice {
  return previewDevices.find((d) => d.id === id) ?? previewDevices[0];
}

/**
 * A device's user-facing text, shared by the toolbar's menu items and the frame caption: the
 *  label with its width when one is fixed, so the value reaches assistive tech at pick time.
 */
export function deviceLabel(d: PreviewDevice): string {
  return d.width === null ? d.label : `${d.label} · ${d.width} px`;
}

/**
 * Build the preview iframe's srcdoc: a complete document linking the site's stylesheets around
 * the rendered entry html. The html comes from the site's floored render pipeline, which already
 * stripped scripts and event handlers, so it embeds unescaped; the frame's empty `sandbox` is
 * belt and braces over that floor. The parameter is the flat `ResolvedPreview` shape `editLoad`
 * ships, so the per-concept map can never reach the frame document by construction.
 * `preview` null (a site without the adapter knob) yields a styleless but complete document.
 */
export function buildPreviewDoc(html: string, preview: ResolvedPreview | null): string {
  const links = (preview?.stylesheets ?? [])
    .map((href) => `<link rel="stylesheet" href="${escapeHtml(href)}">`)
    .join('\n');
  const bodyAttrs = preview?.bodyClass ? ` class="${escapeHtml(preview.bodyClass)}"` : '';
  const content = preview?.containerClass
    ? `<div class="${escapeHtml(preview.containerClass)}">${html}</div>`
    : html;
  // The reset sits BEFORE the site links so the site's CSS wins every collision: it only clears
  // the default body margin and pins a white ground for sheets that assume one.
  //
  // The base tag is what makes links inert. The empty sandbox alone does not: a sandboxed
  // context may still navigate itself, and a srcdoc document resolves relative hrefs against the
  // parent's base URL, so a clicked fragment or root link could render the admin login inside
  // the frame. Targeting every link at a new tab turns each click into a popup, and the sandbox
  // (which grants no allow-popups) blocks it, so a proofing click goes nowhere.
  return [
    '<!doctype html>',
    '<html>',
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    '<base target="_blank">',
    '<style>body{margin:0;background:#fff}</style>',
    links,
    '</head>',
    `<body${bodyAttrs}>`,
    content,
    '</body>',
    '</html>',
  ]
    .filter((line) => line !== '')
    .join('\n');
}
