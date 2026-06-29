import { describe, it, expect } from 'vitest';
import * as components from '../../lib/components/index.js';

describe('components barrel', () => {
  it('exports every admin component', () => {
    for (const name of ['CairnAdmin', 'CairnAdminShell', 'LoginPage', 'ConfirmPage', 'ConceptList', 'EditPage', 'ManageEditors', 'MarkdownEditor', 'ComponentInsertDialog', 'ComponentForm', 'IconPicker', 'LinkPicker', 'DeleteDialog', 'RenameDialog']) {
      expect(components).toHaveProperty(name);
    }
    // The old AdminLayout name is gone; the shell exports as CairnAdminShell now.
    expect(components).not.toHaveProperty('AdminLayout');
  });
});
