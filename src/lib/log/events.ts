// The cairn engine's diagnostic event vocabulary. Each name is the stable `type` a future
// admin-extension subscriber switches on, so it is public-observable API: renaming one is a
// breaking change. See docs/reference/log-events.md, kept in step with this union.
export type CairnLogEvent =
  | 'auth.link.requested'
  | 'auth.link.send_failed'
  | 'auth.token.minted'
  | 'auth.token.confirmed'
  | 'auth.session.created'
  | 'auth.session.destroyed'
  | 'commit.succeeded'
  | 'commit.failed'
  | 'entry.published'
  | 'entry.discarded'
  | 'publish.failed'
  | 'github.unreachable'
  | 'guard.rejected';
