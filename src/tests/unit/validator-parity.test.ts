import { describe, it, expect } from 'vitest';
import { fieldset } from '../../lib/content/fieldset.js';
import { fields } from '../../lib/content/fields.js';

// The v1 validator is gone, so this is now a v2-only check of the overlapping scalar types: text
// max, textarea min, date min, and a present boolean. It pins the verdicts the cutover preserved
// from the old defineFields parity matrix.
const v2 = fieldset({
	title: fields.text({ label: 'Title', required: true, max: 5 }),
	body: fields.textarea({ label: 'Body', min: 2 }),
	date: fields.date({ label: 'Date', min: '2020-01-01' }),
	draft: fields.boolean({ label: 'Draft' }),
});

describe('v2 validator (overlapping scalar types)', () => {
	it('normalizes a complete, in-bounds input', () => {
		expect(v2.validate({ title: 'Hi', body: 'hello', date: '2021-01-01', draft: true }, '')).toEqual({
			ok: true,
			data: { title: 'Hi', body: 'hello', date: '2021-01-01', draft: true },
		});
	});
	it('rejects a title over max and a body under min', () => {
		expect(v2.validate({ title: 'toolong', body: 'x' }, '').ok).toBe(false);
	});
	it('rejects an empty required title', () => {
		expect(v2.validate({ title: '' }, '').ok).toBe(false);
	});
	it('rejects a date under the min bound', () => {
		expect(v2.validate({ title: 'ok', date: '2019-01-01' }, '').ok).toBe(false);
	});
	it('rejects an all-empty input on the required title', () => {
		expect(v2.validate({}, '').ok).toBe(false);
	});
});
