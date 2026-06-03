import { describe, it, expect } from 'vitest';
import * as components from '../../lib/components/index.js';

describe('components barrel', () => {
  it('exports every admin component', () => {
    for (const name of ['AdminLayout', 'LoginPage', 'ConfirmPage', 'ConceptList', 'EditPage', 'ManageEditors', 'MarkdownEditor', 'ComponentInsertDialog', 'ComponentForm', 'IconPicker', 'LinkPicker', 'DeleteDialog']) {
      expect(components).toHaveProperty(name);
    }
  });
});
