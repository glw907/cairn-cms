import { describe, it, expect } from 'vitest';
import * as components from '../../lib/components/index.js';

describe('components barrel', () => {
  it('exports every admin component', () => {
    for (const name of ['CairnAdmin', 'CairnAdminShell', 'LoginPage', 'ConfirmPage', 'ConceptList', 'EditPage', 'ManageEditors', 'MarkdownEditor', 'DeleteDialog', 'RenameDialog']) {
      expect(components).toHaveProperty(name);
    }
    // The old AdminLayout name is gone; the shell exports as CairnAdminShell now.
    expect(components).not.toHaveProperty('AdminLayout');
    // The surface-pruning pass demotes these four: each keeps exactly one internal caller
    // (EditPage or a sibling composed component) and stays importable only by relative path.
    for (const name of ['ComponentInsertDialog', 'ComponentForm', 'IconPicker', 'LinkPicker']) {
      expect(components).not.toHaveProperty(name);
    }
  });
});
