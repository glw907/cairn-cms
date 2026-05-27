import { describe, it, expect } from 'vitest';
import { defineRegistry } from '../../lib/render/registry';

describe('defineRegistry', () => {
	it('exposes component names and a role→default-icon map', () => {
		const reg = defineRegistry({
			components: [
				{ name: 'card', label: 'Card', description: '', insertTemplate: ':::card\n## H\n:::', build: (n) => n },
				{
					name: 'alert',
					label: 'Alert',
					description: '',
					insertTemplate: ':::alert\n## H\n:::',
					build: (n) => n,
					defaultIconByRole: { caution: 'warning' },
				},
			],
		});
		expect(reg.names).toEqual(['card', 'alert']);
		expect(reg.defaultIcon('alert', 'caution')).toBe('warning');
		expect(reg.defaultIcon('card', 'caution')).toBeUndefined();
		expect(reg.get('card')?.label).toBe('Card');
		expect(reg.get('missing')).toBeUndefined();
	});
});
