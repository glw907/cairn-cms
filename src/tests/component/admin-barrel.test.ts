import { describe, it, expect } from 'vitest';
import * as admin from '../../lib/admin/index.js';
import * as pub from '../../lib/public/index.js';

describe('admin barrel', () => {
  it('exports every admin component', () => {
    for (const name of ['CairnAdmin', 'CairnAdminShell', 'LoginPage', 'ConfirmPage', 'ConceptList', 'EditPage', 'ManageEditors', 'MarkdownEditor', 'DeleteDialog', 'RenameDialog']) {
      expect(admin).toHaveProperty(name);
    }
    // The old AdminLayout name is gone; the shell exports as CairnAdminShell now.
    expect(admin).not.toHaveProperty('AdminLayout');
    // The surface-pruning pass demotes these four: each keeps exactly one internal caller
    // (EditPage or a sibling composed component) and stays importable only by relative path.
    for (const name of ['ComponentInsertDialog', 'ComponentForm', 'IconPicker', 'LinkPicker']) {
      expect(admin).not.toHaveProperty(name);
    }
  });

  it('does not export PreviewBanner, which moved to the /public barrel', () => {
    expect(admin).not.toHaveProperty('PreviewBanner');
  });
});

describe('public barrel', () => {
  it('exports exactly PreviewBanner', () => {
    expect(Object.keys(pub)).toEqual(['PreviewBanner']);
  });
});
