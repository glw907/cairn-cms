<script lang="ts">
  // A template literal event name: the rule has no way to read the resolved string, so this is
  // a documented false negative, not a pass.
  const subject = 'demo';
  const log = { error: (_event: string) => {} };
  log.error(`admin.${subject}`);
</script>

<div></div>
