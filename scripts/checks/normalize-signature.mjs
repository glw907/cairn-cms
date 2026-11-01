// cairn-cms: the signature canonicalizer the public-surface snapshot gate (check-surface.mjs) runs
// every rendered callable through, so two renderings of one signature compare equal.

// Strip the leading `declare function NAME`/`declare const NAME:` framing, collapse runs of
// whitespace to one space, and canonicalize the function head so the page form `(P): R` and the
// typeToString arrow form `(P) => R` reduce to the same string. The result is the bare `(args)=>ret`
// shape, so two renderings of one signature compare equal.
/** @param {string} sig */
export function normalizeSignature(sig) {
  let s = sig.trim();
  // Drop the declaration keyword and the export name, keeping the signature body.
  s = s.replace(/^declare\s+function\s+[A-Za-z0-9_$]+\s*/, '');
  s = s.replace(/^declare\s+const\s+[A-Za-z0-9_$]+\s*:\s*/, '');
  // A trailing semicolon is page noise.
  s = s.replace(/;\s*$/, '');
  // typeToString with UseFullyQualifiedType prints every named type as `import("/abs/path").Name`.
  // The page writes the bare `Name`. Strip the qualifier down to the final name so the two match.
  s = s.replace(/import\("[^"]*"\)\./g, '');
  // Collapse all whitespace (including the newlines a multi-line page block carries) to one space.
  s = s.replace(/\s+/g, ' ').trim();
  // A multi-line argument list carries layout noise the flat form does not: a trailing comma before
  // the closing paren, and padding just inside the brackets. Drop both so the two forms match.
  s = s.replace(/,\s*\)/g, ')');
  s = s.replace(/\(\s+/g, '(').replace(/\s+\)/g, ')');
  // typeToString expands an optional parameter or member `x?: T` to `x?: T | undefined`, which the
  // page writes as the bare `x?: T` (the `?` already carries the undefined). But a deliberately
  // required parameter or return type can ALSO carry a real `T | undefined` union that the page
  // writes out in full, so a blanket strip is wrong: it would hide that a required nullable became
  // optional, or the reverse. The rule is scoped by nesting: a `| undefined` is an optional artifact
  // only when the innermost enclosing region (the current bracket depth) was introduced by a `?:`,
  // and a real union member everywhere else. `stripOptionalArtifacts` walks the string once, tracking
  // bracket depth over `(`, `[`, `{`, `<`, so a doubly-optional type like
  // `(opts?: { roles?: R | undefined } | undefined)` strips the artifact at both levels while a
  // sibling required union in the same signature survives.
  s = stripOptionalArtifacts(s);
  // typeToString prints a trailing `;` before the closing brace of an object type literal; the page
  // writes `string }` not `string; }`. Drop the semicolon that sits just before a `}`.
  s = s.replace(/;\s*}/g, ' }');
  // Canonicalize the head: the function form `(args): ret` becomes the arrow form `(args) => ret`.
  // The split must respect the parenthesis nesting of the argument list, so a `): ` inside a nested
  // type does not get rewritten; only the top-level `)` that closes the argument list counts.
  s = headToArrow(s);
  // Normalize arrow spacing so `(a)=>b` and `(a) => b` match.
  s = s.replace(/\s*=>\s*/g, ' => ');
  return s.trim();
}

// Strip a `| undefined` union member exactly where it is the artifact of an enclosing optional
// `?:`, leaving a deliberately-required `T | undefined` alone. A single left-to-right pass tracks
// bracket depth over `(`, `[`, `{`, `<`: seeing `name?:` marks the CURRENT depth optional, a `,` or
// `;` clears it (the next parameter or member starts fresh), and entering a new bracket always
// starts non-optional, so the flag never leaks from an outer region into a nested one or across a
// sibling. An arrow `=>` is consumed as one token before the bracket check runs, because its
// trailing `>` would otherwise be read as a generic close and corrupt the depth count, the same
// hazard `headToArrow` documents below.
/** @param {string} s */
function stripOptionalArtifacts(s) {
  let depth = 0;
  const optionalAtDepth = [false];
  let out = '';
  let i = 0;
  while (i < s.length) {
    if (s.startsWith('=>', i)) {
      out += '=>';
      i += 2;
      continue;
    }
    if (s.startsWith('?:', i)) {
      optionalAtDepth[depth] = true;
      out += '?:';
      i += 2;
      continue;
    }
    const ch = s[i];
    if (ch === '(' || ch === '[' || ch === '{' || ch === '<') {
      depth++;
      optionalAtDepth[depth] = false;
      out += ch;
      i++;
      continue;
    }
    if (ch === ')' || ch === ']' || ch === '}' || ch === '>') {
      depth--;
      out += ch;
      i++;
      continue;
    }
    if (ch === ',' || ch === ';') {
      optionalAtDepth[depth] = false;
      out += ch;
      i++;
      continue;
    }
    const undefinedMatch = /^\s*\|\s*undefined\b/.exec(s.slice(i));
    if (undefinedMatch) {
      if (!optionalAtDepth[depth]) out += undefinedMatch[0];
      i += undefinedMatch[0].length;
      continue;
    }
    out += ch;
    i++;
  }
  return out;
}

// Rewrite a leading function head `(args): ret` to the arrow head `(args) => ret`. Leaves an input
// that is already in arrow form, or that does not start with a top-level argument list, untouched.
/** @param {string} s */
function headToArrow(s) {
  if (!s.startsWith('(')) return s;
  let depth = 0;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '(') depth++;
    else if (ch === ')') {
      depth--;
      if (depth === 0) {
        const rest = s.slice(i + 1).trimStart();
        if (rest.startsWith('=>')) return s; // already arrow form
        if (rest.startsWith(':')) {
          const args = s.slice(0, i + 1);
          const ret = rest.slice(1).trim();
          return `${args} => ${ret}`;
        }
        return s; // no return annotation to rewrite
      }
    }
  }
  return s;
}
