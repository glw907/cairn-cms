package store

import (
	"errors"
	"os"
	"path/filepath"
	"syscall"
	"testing"
	"unsafe"

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

// reparseDataBufferHeader mirrors the common header of the Windows
// REPARSE_DATA_BUFFER structure. golang.org/x/sys/windows exposes the
// FSCTL and tag constants but not this struct (it lives only in Go's own
// internal/syscall/windows), so the test defines its own copy, the same
// shape Go's os package tests build (createMountPoint in
// os_windows_test.go).
type reparseDataBufferHeader struct {
	ReparseTag        uint32
	ReparseDataLength uint16
	Reserved          uint16
}

// mountPointReparseBuffer mirrors MOUNTPOINT_REPARSE_BUFFER, the payload a
// junction's DeviceIoControl call carries immediately after a
// reparseDataBufferHeader.
type mountPointReparseBuffer struct {
	SubstituteNameOffset uint16
	SubstituteNameLength uint16
	PrintNameOffset      uint16
	PrintNameLength      uint16
	PathBuffer           [1]uint16
}

// createJunction turns the not-yet-existing directory at link into an NTFS
// junction pointing at target, using DeviceIoControl and
// FSCTL_SET_REPARSE_POINT directly. Unlike os.Symlink, a junction needs no
// privilege beyond ordinary filesystem access, so the test that creates one
// never has to skip on a permission error the way a symlink-based test
// does on a locked-down Windows CI runner.
func createJunction(link, target string) error {
	// UTF16FromString appends a trailing NUL to each result. The buffer
	// keeps that NUL after each name, the layout the mount-point reparse
	// format expects between the substitute and print names, while
	// SubstituteNameLength and PrintNameLength each exclude it as the
	// format requires.
	substitute, err := syscall.UTF16FromString(`\??\` + target)
	if err != nil {
		return err
	}
	print, err := syscall.UTF16FromString(target)
	if err != nil {
		return err
	}

	pathBuf := append(append([]uint16{}, substitute...), print...)
	substituteOffset := uint16(0)
	substituteLen := uint16(len(substitute)-1) * 2
	printOffset := uint16(len(substitute)) * 2
	printLen := uint16(len(print)-1) * 2

	bufHeaderLen := uint16(unsafe.Offsetof(mountPointReparseBuffer{}.PathBuffer))
	bufLen := bufHeaderLen + uint16(len(pathBuf))*2
	buf := make([]byte, bufLen)
	mrb := (*mountPointReparseBuffer)(unsafe.Pointer(&buf[0]))
	mrb.SubstituteNameOffset = substituteOffset
	mrb.SubstituteNameLength = substituteLen
	mrb.PrintNameOffset = printOffset
	mrb.PrintNameLength = printLen
	copy((*[1 << 15]uint16)(unsafe.Pointer(&mrb.PathBuffer[0]))[:len(pathBuf):len(pathBuf)], pathBuf)

	headerLen := uint32(unsafe.Sizeof(reparseDataBufferHeader{}))
	data := make([]byte, headerLen+uint32(bufLen))
	header := (*reparseDataBufferHeader)(unsafe.Pointer(&data[0]))
	header.ReparseTag = windows.IO_REPARSE_TAG_MOUNT_POINT
	header.ReparseDataLength = bufLen
	copy(data[headerLen:], buf)

	if err := os.Mkdir(link, 0o700); err != nil {
		return err
	}
	pathp, err := windows.UTF16PtrFromString(link)
	if err != nil {
		return err
	}
	h, err := windows.CreateFile(
		pathp,
		windows.GENERIC_WRITE,
		0,
		nil,
		windows.OPEN_EXISTING,
		windows.FILE_FLAG_OPEN_REPARSE_POINT|windows.FILE_FLAG_BACKUP_SEMANTICS,
		0,
	)
	if err != nil {
		return err
	}
	defer func() { _ = windows.CloseHandle(h) }()

	var bytesReturned uint32
	return windows.DeviceIoControl(h, windows.FSCTL_SET_REPARSE_POINT, &data[0], uint32(len(data)), nil, 0, &bytesReturned, nil)
}

// TestCheckNotReparsePointRejectsJunction asserts checkNotReparsePoint
// itself, not checkPath's combined verdict, rejects a directory turned
// into an NTFS junction and accepts a plain directory. checkPath's two
// component checks, checkNotReparsePoint and checkSafePerm, both return
// ErrUnsafePerms, so a test against checkPath alone cannot tell which one
// fired; this isolates the reparse-point path.
func TestCheckNotReparsePointRejectsJunction(t *testing.T) {
	base := t.TempDir()
	real := filepath.Join(base, "real")
	if err := os.Mkdir(real, 0o700); err != nil {
		t.Fatalf("mkdir: %v", err)
	}
	link := filepath.Join(base, "link")
	if err := createJunction(link, real); err != nil {
		t.Fatalf("create junction: %v", err)
	}

	info, err := os.Lstat(link)
	if err != nil {
		t.Fatalf("lstat %s: %v", link, err)
	}
	if err := checkNotReparsePoint(link, info); !errors.Is(err, ErrUnsafePerms) {
		t.Fatalf("checkNotReparsePoint(junction) = %v, want ErrUnsafePerms", err)
	}

	plain := filepath.Join(base, "plain")
	if err := os.Mkdir(plain, 0o700); err != nil {
		t.Fatalf("mkdir: %v", err)
	}
	info, err = os.Lstat(plain)
	if err != nil {
		t.Fatalf("lstat %s: %v", plain, err)
	}
	if err := checkNotReparsePoint(plain, info); err != nil {
		t.Fatalf("checkNotReparsePoint(plain directory) = %v, want nil", err)
	}
}

// TestLoadRejectsJunctionRegistryDir asserts Load refuses a registry
// directory that is an NTFS junction, the reparse-point half of the
// directory-swap defense checkPath enforces on every operation, proved end
// to end through the Store rather than against checkPath directly.
func TestLoadRejectsJunctionRegistryDir(t *testing.T) {
	base := t.TempDir()
	real := filepath.Join(base, "real")
	if err := os.Mkdir(real, 0o700); err != nil {
		t.Fatalf("mkdir: %v", err)
	}
	link := filepath.Join(base, "link")
	if err := createJunction(link, real); err != nil {
		t.Fatalf("create junction: %v", err)
	}

	s := &Store{dir: link}
	if _, err := s.Load("site-fixture-abcdef"); !errors.Is(err, ErrUnsafePerms) {
		t.Fatalf("Load with a junction registry dir = %v, want ErrUnsafePerms", err)
	}
}
