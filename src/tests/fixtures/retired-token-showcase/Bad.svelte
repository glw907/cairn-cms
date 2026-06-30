<!-- Fixture for the showcase retired-token pattern. Two lines match (a bracket utility wrapping a
     var(--…) token, and an inline style with a literal var(--…)); the dynamic var({…}) form is the
     styleguide's sanctioned swatch and must NOT match. -->
<p class="text-[length:var(--cairn-step-1)] text-[color:var(--cairn-muted)]">scale and ink</p>
<p style="color: var(--cairn-muted)">inline ink</p>
<div class="sg-chip" style="background: var({token})"></div>
