package store

import (
	"errors"
	"os"
	"path/filepath"
	"testing"

	"golang.org/x/sys/windows"
)

// setDACL replaces path's DACL with entries, each granting the named
// trustee GENERIC_READ so a test can attach or remove a non-owner ACE.
func setDACL(t *testing.T, path string, entries []windows.EXPLICIT_ACCESS) {
	t.Helper()
	acl, err := windows.ACLFromEntries(entries, nil)
	if err != nil {
		t.Fatalf("build ACL: %v", err)
	}
	if err := windows.SetNamedSecurityInfo(
		path,
		windows.SE_FILE_OBJECT,
		windows.DACL_SECURITY_INFORMATION|windows.PROTECTED_DACL_SECURITY_INFORMATION,
		nil, nil, acl, nil,
	); err != nil {
		t.Fatalf("set ACL: %v", err)
	}
}

func ownerOnlyEntry(t *testing.T) windows.EXPLICIT_ACCESS {
	t.Helper()
	owner, err := ownerSID(t.TempDir())
	if err != nil {
		t.Fatalf("read owner: %v", err)
	}
	return windows.EXPLICIT_ACCESS{
		AccessPermissions: windows.GENERIC_ALL,
		AccessMode:        windows.GRANT_ACCESS,
		Trustee: windows.TRUSTEE{
			TrusteeForm:  windows.TRUSTEE_IS_SID,
			TrusteeValue: windows.TrusteeValueFromSID(owner),
		},
	}
}

func everyoneEntry(t *testing.T) windows.EXPLICIT_ACCESS {
	t.Helper()
	everyone, err := windows.CreateWellKnownSid(windows.WinWorldSid)
	if err != nil {
		t.Fatalf("create Everyone SID: %v", err)
	}
	return windows.EXPLICIT_ACCESS{
		AccessPermissions: windows.GENERIC_READ,
		AccessMode:        windows.GRANT_ACCESS,
		Trustee: windows.TRUSTEE{
			TrusteeForm:  windows.TRUSTEE_IS_SID,
			TrusteeValue: windows.TrusteeValueFromSID(everyone),
		},
	}
}

// TestCheckSafePermOwnerOnlyDACL asserts checkSafePerm passes a file whose
// DACL grants access only to its owner, and reports ErrUnsafePerms once an
// Everyone ACE is attached, the ACL half of the platform's unsafe-perms
// check that mode bits cannot express on NTFS.
func TestCheckSafePermOwnerOnlyDACL(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "record.json")
	if err := os.WriteFile(path, []byte("{}\n"), 0o600); err != nil {
		t.Fatalf("write %s: %v", path, err)
	}

	setDACL(t, path, []windows.EXPLICIT_ACCESS{ownerOnlyEntry(t)})
	info, err := os.Lstat(path)
	if err != nil {
		t.Fatalf("lstat %s: %v", path, err)
	}
	if err := checkSafePerm(path, info); err != nil {
		t.Fatalf("checkSafePerm with an owner-only DACL: %v", err)
	}

	setDACL(t, path, []windows.EXPLICIT_ACCESS{ownerOnlyEntry(t), everyoneEntry(t)})
	info, err = os.Lstat(path)
	if err != nil {
		t.Fatalf("lstat %s: %v", path, err)
	}
	if err := checkSafePerm(path, info); !errors.Is(err, ErrUnsafePerms) {
		t.Fatalf("checkSafePerm with an Everyone ACE = %v, want ErrUnsafePerms", err)
	}
}

// TestCheckPathRejectsReparsePoint asserts checkPath refuses a directory
// symlink (a junction proves the same FILE_ATTRIBUTE_REPARSE_POINT bit)
// planted where the registry directory should be, the reparse-point half
// of Load's directory-swap defense that POSIX's mode-bit check cannot
// express. The runner needs SeCreateSymbolicLinkPrivilege (Developer Mode
// or an elevated process) to create the symlink; without it the test skips
// rather than reporting a false pass.
func TestCheckPathRejectsReparsePoint(t *testing.T) {
	base := t.TempDir()
	real := filepath.Join(base, "real")
	if err := os.Mkdir(real, 0o700); err != nil {
		t.Fatalf("mkdir: %v", err)
	}
	link := filepath.Join(base, "link")
	if err := os.Symlink(real, link); err != nil {
		t.Skipf("create directory symlink (runner lacks SeCreateSymbolicLinkPrivilege): %v", err)
	}

	if err := checkPath(link); !errors.Is(err, ErrUnsafePerms) {
		t.Fatalf("checkPath(reparse point) = %v, want ErrUnsafePerms", err)
	}
}
