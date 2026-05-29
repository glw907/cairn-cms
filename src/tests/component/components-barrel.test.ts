import { describe, it, expect } from 'vitest';
import * as components from '../../lib/components/index.js';

describe('components barrel', () => {
  it('exports every admin component', () => {
    for (const name of ['AdminLayout', 'LoginPage', 'ConfirmPage', 'ConceptList', 'EditPage', 'ManageEditors', 'MarkdownEditor', 'ComponentPalette']) {
      expect(components).toHaveProperty(name);
    }
  });
});
