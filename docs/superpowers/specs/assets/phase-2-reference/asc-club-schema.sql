-- asc-club: the new system's D1 schema (Fable, 2026-07-06, the window's last hour).
-- The DDL expression of the phase-2 design suite + Geoff's 2026-07-06 rulings and the
-- demo-members.ts nine-choice proposal. Passes create these tables as they land their
-- domains (2.2 the member core, 2.1 events/classes, 2.3 email, 2.4 assets); nothing
-- here alters asc-ops, which is never touched (the two-database strategy).
-- Conventions: TEXT ids (ULIDs); civil dates as TEXT YYYY-MM-DD; money as INTEGER whole
-- dollars (the club has no cents anywhere); SQLite booleans as INTEGER 0/1 with CHECK;
-- every mutating domain writes audit_log; readers always name columns (never SELECT *).

-- ============ THE MEMBER CORE (pass 2.2) ============

CREATE TABLE households (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,              -- "the Larsens": the volunteer's name for it
  city TEXT,
  -- Exactly-one-primary lives HERE as a foreign key, the only shape that structurally
  -- enforces it (demo proposal, choice 1). Deferred-not-null dance: the household is
  -- created, its first member inserted, then primary_member_id set in the same batch.
  primary_member_id TEXT REFERENCES members(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE members (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL REFERENCES households(id),
  name TEXT NOT NULL,
  email TEXT UNIQUE,               -- nullable: a covered child may have none
  phone TEXT,
  birthdate TEXT,                  -- civil date; age gates (8-12, 13+, 18-25) compute
                                   -- from it; NEVER rendered in the directory
  directory_visibility TEXT NOT NULL DEFAULT 'partial'
    CHECK (directory_visibility IN ('visible','partial','hidden')),
  -- The one sanctioned per-member divergence from household standing (choice 6):
  archived_at TEXT,                -- set = "not coming back"; excluded from lists,
                                   -- directory, and segments; history intact
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_members_household ON members(household_id);

-- A MEMBERSHIP is the household's per-season purchase: two entities, canon. Standing
-- (current/lapsed) DERIVES: a household is current for a season iff a paid membership
-- row exists for it; no mutable status flag to rot. Rollover CREATES next season's
-- rows; it never wipes (the anti-ops rule).
CREATE TABLE memberships (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL REFERENCES households(id),
  season INTEGER NOT NULL,         -- the year
  tier TEXT NOT NULL CHECK (tier IN ('individual','family','young-adult')),
  price_paid INTEGER NOT NULL,     -- SNAPSHOT at purchase; tier prices are settings
  paid_at TEXT,                    -- NULL = invoiced/pending; membership ACTIVATES on
                                   -- payment (board review is post-hoc, never a gate)
  stripe_ref TEXT,                 -- payment link / checkout session id
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (household_id, season)    -- one membership per household per season
);
CREATE INDEX idx_memberships_season ON memberships(season);

-- The credit LEDGER (choice 9): grants minus redemptions, computed, never stored.
-- NO season column ANYWHERE here: "credits never expire, even if your membership
-- lapses" is the published promise, held structurally.
CREATE TABLE credit_grants (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL REFERENCES households(id),
  membership_id TEXT NOT NULL REFERENCES memberships(id),  -- the joining purchase
  credits INTEGER NOT NULL,        -- 2 family / 1 individual / 1 young-adult
  granted_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE credit_redemptions (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL REFERENCES households(id),
  enrollment_id TEXT NOT NULL REFERENCES class_enrollments(id),
  redeemed_at TEXT NOT NULL DEFAULT (datetime('now')),
  redeemed_by TEXT NOT NULL        -- member id or admin email; audited either way
);

-- The site-owned authorization axes (content roles stay cairn's own):
CREATE TABLE club_roles (
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('club-admin','instructor')),
  granted_by TEXT NOT NULL,
  granted_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (email, role)
);

-- ============ EVENTS + CLASSES (pass 2.1) ============

CREATE TABLE events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL CHECK (category IN ('racing','class','operations','social','governance')),
  short_description TEXT,
  long_description TEXT,
  start_date TEXT, start_time TEXT, end_date TEXT, end_time TEXT,
  location TEXT,
  hero_image TEXT, hero_image_alt TEXT, thumbnail_image TEXT,
  visible INTEGER NOT NULL DEFAULT 1 CHECK (visible IN (0,1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE classes (
  id TEXT PRIMARY KEY,
  season INTEGER NOT NULL,         -- classes are per-season instances (the rollover
                                   -- creates next season's from templates or fresh)
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  track TEXT NOT NULL CHECK (track IN ('adult-teen','youth')),  -- age-gated: 13+ / 8-12
  capacity INTEGER NOT NULL,       -- caps are real; fullness DERIVES from enrollment
  fee INTEGER NOT NULL,            -- $100 today; a setting-driven snapshot like tiers
  start_date TEXT, end_date TEXT,
  location TEXT,
  description TEXT,
  instructor_notes TEXT,
  visible INTEGER NOT NULL DEFAULT 1 CHECK (visible IN (0,1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (season, slug)
);

CREATE TABLE class_instructors (   -- the instructor ROLE holds the surface; this
  class_id TEXT NOT NULL REFERENCES classes(id),      -- assignment scopes WHICH rosters
  member_id TEXT NOT NULL REFERENCES members(id),
  PRIMARY KEY (class_id, member_id)
);

CREATE TABLE class_enrollments (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL REFERENCES classes(id),
  member_id TEXT NOT NULL REFERENCES members(id),
  enrolled_at TEXT NOT NULL DEFAULT (datetime('now')),
  fee_paid INTEGER NOT NULL DEFAULT 0,   -- 0 when a credit covered it
  stripe_ref TEXT,
  guardian_contact TEXT,           -- youth track: the parent-on-premises requirement
  UNIQUE (class_id, member_id)
);
CREATE INDEX idx_enrollments_class ON class_enrollments(class_id);

-- The class waitlist is SEASONAL and SEPARATE from the asset waitlist (structural,
-- never generalized): it resets at rollover; asset queues never do.
CREATE TABLE class_waitlist (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL REFERENCES classes(id),
  -- public signups may not be members yet; either edge, exactly one:
  member_id TEXT REFERENCES members(id),
  applicant_name TEXT, applicant_email TEXT, applicant_phone TEXT,
  position INTEGER NOT NULL,
  requested_at TEXT NOT NULL DEFAULT (datetime('now')),
  notes TEXT,
  CHECK ((member_id IS NOT NULL) OR (applicant_email IS NOT NULL))
);

-- The time-limited OFFER (the magic-link token discipline reused): single-use,
-- expiring, person-and-class bound; offered -> claimed | declined | expired.
CREATE TABLE class_offers (
  token TEXT PRIMARY KEY,          -- the link's secret, hashed at rest like auth tokens
  waitlist_id TEXT NOT NULL REFERENCES class_waitlist(id),
  class_id TEXT NOT NULL REFERENCES classes(id),
  offered_by TEXT NOT NULL,
  offered_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL,        -- window length is a club setting
  resolved TEXT CHECK (resolved IN ('claimed','declined','expired')),
  resolved_at TEXT
);

-- ============ EMAIL (pass 2.3) ============

CREATE TABLE email_templates (
  id TEXT PRIMARY KEY,
  subject TEXT NOT NULL,
  reply_to TEXT,
  body TEXT NOT NULL,              -- markdown-with-variables, edited in cairn's editor
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_by TEXT NOT NULL
);
CREATE TABLE email_log (           -- ops's convention, carried: per-recipient rows
  id TEXT PRIMARY KEY,
  template_id TEXT,
  segment TEXT,                    -- 'current' | 'lapsed' | 'class:<id>' | NULL (single)
  recipient TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent','failed')),
  error_detail TEXT,
  sent_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============ ASSETS (pass 2.4) ============

CREATE TABLE asset_types (
  id TEXT PRIMARY KEY,             -- mooring / rv-parking / boat-parking / small-boat-rack
  name TEXT NOT NULL,
  fee INTEGER NOT NULL DEFAULT 0,
  capacity INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0
);
-- Assets attach to MEMBERSHIPS, never members (Geoff, canon). The household edge
-- travels through the membership; the by-person view is a JOIN, not an edge.
CREATE TABLE asset_assignments (
  id TEXT PRIMARY KEY,
  asset_type TEXT NOT NULL REFERENCES asset_types(id),
  membership_id TEXT NOT NULL REFERENCES memberships(id),
  description TEXT,                -- "Buoy M-14"
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','released')),
  -- per-season fee state lives in payments rows, NOT as a mutable flag (anti-ops):
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE asset_payments (      -- the ledger ops's dead payments table intended
  id TEXT PRIMARY KEY,
  assignment_id TEXT NOT NULL REFERENCES asset_assignments(id),
  season INTEGER NOT NULL,
  amount INTEGER NOT NULL,         -- snapshot of the fee at billing
  stripe_ref TEXT,
  paid_at TEXT,                    -- NULL = requested/outstanding (the dashboard's
                                   -- "chase list" reads exactly this)
  UNIQUE (assignment_id, season)
);
-- The asset waitlist NEVER resets (multi-year physical queues):
CREATE TABLE asset_waitlist (
  id TEXT PRIMARY KEY,
  asset_type TEXT NOT NULL REFERENCES asset_types(id),
  member_id TEXT NOT NULL REFERENCES members(id),
  position INTEGER NOT NULL,
  requested_at TEXT NOT NULL DEFAULT (datetime('now')),
  notes TEXT
);

-- ============ THE SPINE ============

CREATE TABLE settings (            -- current_season, tier prices, offer window, etc.
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_by TEXT NOT NULL         -- settings changes are audited actions
);
CREATE TABLE audit_log (           -- ops's best convention, carried whole
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor TEXT NOT NULL,             -- editor email / member id / 'system'
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT,
  detail TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- THE ROLLOVER, restated as this schema's invariant: creating season N+1 = new
-- memberships rows as households renew (standing derives), new classes rows for the
-- season, class_waitlist rows for dead seasons archived by the season edge on their
-- class. NOTHING is UPDATEd or DELETEd by the yearly increment except the
-- current_season setting -- one atomic batch: the setting write + the audit row.
