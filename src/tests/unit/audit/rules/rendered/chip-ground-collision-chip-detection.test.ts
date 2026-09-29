// The theme identity markup sweep moved every shipped chip, tag, and count off the pill geometry
// (`rounded-full`) onto the theme's `--radius-selector` token, a value far short of the old
// pill-shape test (every corner at least half the box height) once a chip is taller than about
// 8px. `chip-ground-collision`'s shape detection is re-keyed onto the resolved `--radius-selector`
// token itself, never a literal pixel value, so it still reaches an unclassed chip after the sweep.
// This file pins the re-key: a positive case for the new key, and the negative cases that key
// change must not start flagging (a field-radius button, a field-radius `kbd`, a selector-radius
// element that fails height or carries no text, and, under a theme whose two tokens happen to
// share one value, every button and input).
//
// Every fixture below pairs the candidate's fill with a one-channel-step ground (rgb(200,200,200)
// on rgb(202,202,202) or the reverse), a neutral pair `rulings.chip-ground-collision.test.ts`
// already pins at 1.49:1, comfortably under both the rule's ratio and chroma floors. A negative
// case that instead used two plainly distinct colors would pass whether or not the element was
// ever collected as a chip candidate, proving nothing; pairing every case with a real camouflage
// means a finding can only be absent because the shape test actually excluded the element.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium, type Browser } from 'playwright';
import { chipGroundCollision } from '../../../../../lib/audit/rules/rendered/chip-ground-collision.js';
import { findingsFor } from './chip-ground-collision-harness.js';

let browser: Browser;

beforeAll(async () => {
  browser = await chromium.launch();
}, 120_000);

afterAll(async () => {
  await browser?.close();
});

const GROUND = 'rgb(200, 200, 200)';
const FILL = 'rgb(202, 202, 202)';

describe('chip-ground-collision: the chip shape re-key', () => {
  it('treats a filled chip at the resolved --radius-selector, with no .badge class, as a chip', async () => {
    const findings = await findingsFor(
      chipGroundCollision,
      `<body style="background-color: ${GROUND}; --radius-selector: 4px">
         <span style="display:inline-block;background-color:${FILL};
               border-radius:var(--radius-selector);padding:2px 8px;font:11px system-ui">Draft</span>
       </body>`,
      browser
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]?.selector).toBe('span');
  });

  it('does not flag a text button at the field radius', async () => {
    const findings = await findingsFor(
      chipGroundCollision,
      `<body style="background-color: ${GROUND}; --radius-selector: 4px; --radius-field: 8px">
         <button style="display:inline-block;background-color:${FILL};
               border-radius:var(--radius-field);padding:6px 14px;font:13px system-ui">Save</button>
       </body>`,
      browser
    );
    expect(findings).toEqual([]);
  });

  it('does not flag a kbd rounded at the field radius', async () => {
    const findings = await findingsFor(
      chipGroundCollision,
      `<body style="background-color: ${GROUND}; --radius-selector: 4px; --radius-field: 8px">
         <kbd style="display:inline-block;background-color:${FILL};
               border-radius:var(--radius-field);padding:1px 6px;font:11px system-ui">Esc</kbd>
       </body>`,
      browser
    );
    expect(findings).toEqual([]);
  });

  it('does not flag a filled element at the selector radius taller than chip height', async () => {
    const findings = await findingsFor(
      chipGroundCollision,
      `<body style="background-color: ${GROUND}; --radius-selector: 4px">
         <div style="display:inline-block;background-color:${FILL};
               border-radius:var(--radius-selector);padding:24px;font:11px system-ui;height:60px">Panel</div>
       </body>`,
      browser
    );
    expect(findings).toEqual([]);
  });

  it('does not flag a filled element at the selector radius carrying no text', async () => {
    const findings = await findingsFor(
      chipGroundCollision,
      `<body style="background-color: ${GROUND}; --radius-selector: 4px">
         <span aria-hidden="true" style="display:inline-block;width:16px;height:16px;
               background-color:${FILL};border-radius:var(--radius-selector)"></span>
       </body>`,
      browser
    );
    expect(findings).toEqual([]);
  });

  it('does not flag a button under a theme whose selector and field radii are equal', async () => {
    // A button's own textContent carries "Save", so unlike an <input> (whose textContent is
    // always empty regardless of its value attribute) this case is proven only by the tag
    // exclusion, not incidentally by the text check. The explicit height keeps the box inside the
    // chip-height ceiling, so this case is proven only by the tag exclusion, not incidentally by
    // the height check either.
    const findings = await findingsFor(
      chipGroundCollision,
      `<body style="background-color: ${GROUND}; --radius-selector: 6px; --radius-field: 6px">
         <button style="display:inline-block;height:24px;line-height:24px;background-color:${FILL};
               border-radius:var(--radius-selector);padding:0 14px;font:13px system-ui">Save</button>
       </body>`,
      browser
    );
    expect(findings).toEqual([]);
  });

  it('does not flag an input under a theme whose selector and field radii are equal', async () => {
    const findings = await findingsFor(
      chipGroundCollision,
      `<body style="background-color: ${GROUND}; --radius-selector: 6px; --radius-field: 6px">
         <input value="Draft" readonly style="display:inline-block;height:24px;line-height:24px;background-color:${FILL};
               border-radius:var(--radius-field);padding:0 14px;font:13px system-ui">
       </body>`,
      browser
    );
    expect(findings).toEqual([]);
  });

  it('does not flag a select under a theme whose selector and field radii are equal', async () => {
    // A native <select>'s textContent concatenates its option text, so this case is proven only
    // by the tag exclusion, not incidentally by the text check.
    const findings = await findingsFor(
      chipGroundCollision,
      `<body style="background-color: ${GROUND}; --radius-selector: 6px; --radius-field: 6px">
         <select style="display:inline-block;height:32px;line-height:32px;background-color:${FILL};
               border-radius:var(--radius-field);padding:0 14px;font:13px system-ui">
           <option>Draft</option>
         </select>
       </body>`,
      browser
    );
    expect(findings).toEqual([]);
  });
});
