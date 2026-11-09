package setup

import (
	"encoding/base64"
	"os"
	"path/filepath"
	"reflect"
	"regexp"
	"slices"
	"strings"
	"testing"
	"time"
)

// The engine's hashToken (src/lib/auth/crypto.ts) of the fixed string below, computed once with
// Node's crypto.subtle.digest and checked with sha256sum.
const signInVector = "1ba8807f2e3e42282605ec5274053a790f2c2455c44e9689d5aeeab12c6315cb"

func TestHashTokenMatchesTheEngine(t *testing.T) {
	if got := hashToken("cairn-setup-sign-in-vector"); got != signInVector {
		t.Errorf("hashToken = %s, want %s", got, signInVector)
	}
}

func TestNewTokenIsTheEngineShape(t *testing.T) {
	a, err := newToken()
	if err != nil {
		t.Fatal(err)
	}
	b, _ := newToken()
	raw, err := base64.RawURLEncoding.DecodeString(a)
	if err != nil || len(raw) != 32 || a == b {
		t.Errorf("token %q: %d bytes, %v; want 32 random bytes in unpadded base64url", a, len(raw), err)
	}
}

// engineMigrations is the engine's migrations folder.
var engineMigrations = filepath.Join("..", "..", "..", "migrations")

// migrationColumns reads the migrations in dir into each table's columns, with whether the
// column is NOT NULL without a default, following the CREATE, ADD COLUMN, and RENAME statements.
func migrationColumns(t *testing.T, dir string) map[string]map[string]bool {
	t.Helper()
	files, err := filepath.Glob(filepath.Join(dir, "*.sql"))
	if err != nil || len(files) == 0 {
		t.Fatalf("no migrations found: %v", err)
	}
	slices.Sort(files)
	create := regexp.MustCompile(`(?is)CREATE TABLE (\w+) \((.*?)\);`)
	add := regexp.MustCompile(`(?i)ALTER TABLE (\w+) ADD COLUMN (\w+) ([^;]*);`)
	rename := regexp.MustCompile(`(?i)ALTER TABLE (\w+) RENAME TO (\w+);`)
	drop := regexp.MustCompile(`(?i)DROP TABLE (\w+);`)
	tables := map[string]map[string]bool{}
	for _, f := range files {
		b, err := os.ReadFile(f)
		if err != nil {
			t.Fatal(err)
		}
		var lines []string
		for l := range strings.SplitSeq(strings.ReplaceAll(string(b), "\r\n", "\n"), "\n") {
			if !strings.HasPrefix(strings.TrimSpace(l), "--") {
				lines = append(lines, l)
			}
		}
		sql := strings.Join(lines, "\n")
		type stmt struct {
			at int
			do func()
		}
		var stmts []stmt
		for _, m := range create.FindAllStringSubmatchIndex(sql, -1) {
			name, body := sql[m[2]:m[3]], sql[m[4]:m[5]]
			stmts = append(stmts, stmt{m[0], func() {
				cols := map[string]bool{}
				for def := range strings.SplitSeq(body, ",\n") {
					f := strings.Fields(def)
					if len(f) > 0 {
						up := strings.ToUpper(def)
						cols[f[0]] = strings.Contains(up, "NOT NULL") && !strings.Contains(up, "DEFAULT")
					}
				}
				tables[name] = cols
			}})
		}
		for _, m := range add.FindAllStringSubmatchIndex(sql, -1) {
			name, col, def := sql[m[2]:m[3]], sql[m[4]:m[5]], strings.ToUpper(sql[m[6]:m[7]])
			stmts = append(stmts, stmt{m[0], func() { tables[name][col] = strings.Contains(def, "NOT NULL") && !strings.Contains(def, "DEFAULT") }})
		}
		for _, m := range rename.FindAllStringSubmatchIndex(sql, -1) {
			from, to := sql[m[2]:m[3]], sql[m[4]:m[5]]
			stmts = append(stmts, stmt{m[0], func() { tables[to] = tables[from]; delete(tables, from) }})
		}
		for _, m := range drop.FindAllStringSubmatchIndex(sql, -1) {
			name := sql[m[2]:m[3]]
			stmts = append(stmts, stmt{m[0], func() { delete(tables, name) }})
		}
		slices.SortFunc(stmts, func(a, b stmt) int { return a.at - b.at })
		for _, s := range stmts {
			s.do()
		}
	}
	return tables
}

// TestMigrationColumnsReadsCRLF holds the parser to a Windows checkout, which can turn the
// migrations' line endings into CRLF.
func TestMigrationColumnsReadsCRLF(t *testing.T) {
	files, err := filepath.Glob(filepath.Join(engineMigrations, "*.sql"))
	if err != nil || len(files) == 0 {
		t.Fatalf("no migrations found: %v", err)
	}
	dir := t.TempDir()
	for _, f := range files {
		b, err := os.ReadFile(f)
		if err != nil {
			t.Fatal(err)
		}
		crlf := strings.ReplaceAll(strings.ReplaceAll(string(b), "\r\n", "\n"), "\n", "\r\n")
		if err := os.WriteFile(filepath.Join(dir, filepath.Base(f)), []byte(crlf), 0o644); err != nil {
			t.Fatal(err)
		}
	}
	if got, want := migrationColumns(t, dir), migrationColumns(t, engineMigrations); !reflect.DeepEqual(got, want) {
		t.Errorf("CRLF migrations read as %v, want %v", got, want)
	}
}

func TestTheSignInBatchMatchesTheMigrations(t *testing.T) {
	tables := migrationColumns(t, engineMigrations)
	insert := regexp.MustCompile(`INSERT INTO (\w+) \(([^)]*)\)`)
	for _, sql := range []string{sqlInsertOwner, sqlInsertToken} {
		m := insert.FindStringSubmatch(sql)
		cols, ok := tables[m[1]]
		if !ok {
			t.Fatalf("no migration creates %s", m[1])
		}
		named := strings.Split(strings.ReplaceAll(m[2], " ", ""), ",")
		for _, c := range named {
			if _, ok := cols[c]; !ok {
				t.Errorf("%s has no column %s", m[1], c)
			}
		}
		for c, required := range cols {
			if required && !slices.Contains(named, c) {
				t.Errorf("the insert into %s leaves out required column %s", m[1], c)
			}
		}
	}
	if _, ok := tables["magic_token"]["nonce_hash"]; !ok {
		t.Error("the migrations no longer add magic_token.nonce_hash")
	}
	if strings.Contains(sqlInsertToken, "nonce_hash") {
		t.Error("the setup link is bound to a nonce, so only one browser could confirm it")
	}
	for _, sql := range []string{sqlSweepTokens, sqlTokenLive} {
		for _, c := range []string{"email", "expires_at", "token_hash"} {
			if strings.Contains(sql, c) {
				if _, ok := tables["magic_token"][c]; !ok {
					t.Errorf("magic_token has no column %s", c)
				}
			}
		}
	}
	for _, sql := range []string{sqlLatestSession, sqlNewSession} {
		if !strings.Contains(sql, "FROM session ") {
			t.Errorf("%q does not read the session table", sql)
		}
		for _, c := range []string{"email", "created_at"} {
			if _, ok := tables["session"][c]; !ok || !strings.Contains(sql, c) {
				t.Errorf("%q and the session table do not both carry %s", sql, c)
			}
		}
	}

	now := time.Date(2026, 11, 8, 12, 0, 0, 0, time.UTC)
	batch := signInBatch("owner@example.test", signInVector, now)
	for _, st := range batch {
		if strings.Count(st.SQL, "?") != len(st.Params) {
			t.Errorf("%q binds %d parameters", st.SQL, len(st.Params))
		}
	}
	if len(batch) != 3 || batch[0].Params[1] != "owner" || batch[2].Params[0] != signInVector ||
		batch[2].Params[2] != now.Add(10*time.Minute).UnixMilli() || batch[1].Params[1] != now.UnixMilli() {
		t.Errorf("batch = %+v", batch)
	}
}
