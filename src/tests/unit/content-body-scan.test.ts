import { describe, it, expect } from 'vitest';
import { scanBody } from '../../lib/content/body-scan.js';

describe('scanBody raw html attributes', () => {
  it('finds an href after a quoted value holding a >', () => {
    expect(scanBody('<a title="a>b" href="cairn:posts/one">x</a>').deadHrefs).toEqual(['cairn:posts/one']);
  });

  it('does not read href= inside another attribute value', () => {
    expect(scanBody('<a title="see href=cairn:x">x</a>').deadHrefs).toEqual([]);
    expect(scanBody("<a title='x href=\"cairn:x\"'>x</a>").deadHrefs).toEqual([]);
  });

  it('reads src, either quote, and tags that span lines', () => {
    expect(scanBody('<img\n  alt="x"\n  src="cairn:media/a.png">').deadHrefs).toEqual(['cairn:media/a.png']);
    expect(scanBody("<a HREF='cairn:posts/two'>x</a>").deadHrefs).toEqual(['cairn:posts/two']);
  });

  it('ignores text between tags and comments', () => {
    expect(scanBody('<p>href="cairn:x"</p>').deadHrefs).toEqual([]);
    expect(scanBody('<!-- <a href="cairn:x"> -->').deadHrefs).toEqual([]);
  });
});
