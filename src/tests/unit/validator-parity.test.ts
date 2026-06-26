import { describe, it, expect } from 'vitest';
import { defineFields } from '../../lib/content/schema.js';
import { fieldset } from '../../lib/content/fieldset.js';
import { fields } from '../../lib/content/fields.js';

// Equivalent declarations of the overlapping types.
const v1 = defineFields([
	{ name: 'title', type: 'text', label: 'Title', required: true, max: 5 },
	{ name: 'body', type: 'textarea', label: 'Body', min: 2 },
	{ name: 'date', type: 'date', label: 'Date', min: '2020-01-01' },
	{ name: 'draft', type: 'boolean', label: 'Draft' },
]);
const v2 = fieldset({
	title: fields.text({ label: 'Title', required: true, max: 5 }),
	body: fields.textarea({ label: 'Body', min: 2 }),
	date: fields.date({ label: 'Date', min: '2020-01-01' }),
	draft: fields.boolean({ label: 'Draft' }),
});

const inputs = [
	{ title: 'Hi', body: 'hello', date: '2021-01-01', draft: true },
	{ title: 'toolong', body: 'x' }, // title over max, body under min
	{ title: '' }, // required title empty
	{ title: 'ok', date: '2019-01-01' }, // date under min
	{}, // all empty
];

describe('v1/v2 validator parity (overlapping types)', () => {
	for (const [i, input] of inputs.entries()) {
		it(`agrees on input ${i}`, () => {
			expect(v2.validate(input, '')).toEqual(v1.validate(input, ''));
		});
	}
});
