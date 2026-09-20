package store

import (
	"fmt"
	"os"
	"unsafe"

	"golang.org/x/sys/windows"
)

// openNoFollow creates path exclusively, refusing to follow a reparse
// point already sitting at path. syscall.O_NOFOLLOW does not exist on
// Windows; FILE_FLAG_OPEN_REPARSE_POINT is the platform's equivalent. The
// fresh file otherwise inherits its parent directory's ACL, which is not
// necessarily owner-only, so this also sets an explicit owner-only DACL
// before returning.
func openNoFollow(path string) (*os.File, error) {
	pathp, err := windows.UTF16PtrFromString(path)
	if err != nil {
		return nil, err
	}
	h, err := windows.CreateFile(
		pathp,
		windows.GENERIC_WRITE,
		0,
		nil,
		windows.CREATE_NEW,
		windows.FILE_ATTRIBUTE_NORMAL|windows.FILE_FLAG_OPEN_REPARSE_POINT,
		0,
	)
	if err != nil {
		return nil, fmt.Errorf("store: create %s: %w", path, err)
	}
	f := os.NewFile(uintptr(h), path)
	if err := setOwnerOnlyDACL(path); err != nil {
		_ = f.Close()
		_ = os.Remove(path)
		return nil, err
	}
	return f, nil
}

// ensureOwnerOnlyDir sets dir's DACL to owner-only. MkdirAll's mode
// argument has no effect on Windows: a fresh directory inherits its
// parent's ACL, which is not necessarily owner-only, so Save calls this
// after creating the registry directory.
func ensureOwnerOnlyDir(dir string) error {
	return setOwnerOnlyDACL(dir)
}

// setOwnerOnlyDACL replaces path's DACL with a single entry granting the
// current user full control, and marks the DACL protected so no inherited
// entry from a parent directory survives.
func setOwnerOnlyDACL(path string) error {
	owner, err := currentUserSID()
	if err != nil {
		return err
	}
	acl, err := windows.ACLFromEntries([]windows.EXPLICIT_ACCESS{{
		AccessPermissions: windows.GENERIC_ALL,
		AccessMode:        windows.GRANT_ACCESS,
		Trustee: windows.TRUSTEE{
			TrusteeForm:  windows.TRUSTEE_IS_SID,
			TrusteeValue: windows.TrusteeValueFromSID(owner),
		},
	}}, nil)
	if err != nil {
		return fmt.Errorf("store: %s: build owner-only ACL: %w", path, err)
	}
	if err := windows.SetNamedSecurityInfo(
		path,
		windows.SE_FILE_OBJECT,
		windows.DACL_SECURITY_INFORMATION|windows.PROTECTED_DACL_SECURITY_INFORMATION,
		nil, nil, acl, nil,
	); err != nil {
		return fmt.Errorf("store: %s: set owner-only DACL: %w", path, err)
	}
	return nil
}

// checkNotReparsePoint reports ErrUnsafePerms when path is a symlink, a
// junction, or any other reparse point. Go's os.Lstat already sets
// ModeSymlink for IO_REPARSE_TAG_SYMLINK and IO_REPARSE_TAG_MOUNT_POINT
// (a junction), but this also reads the FILE_ATTRIBUTE_REPARSE_POINT bit
// directly, so a reparse tag Go does not surface through ModeSymlink is
// still rejected.
func checkNotReparsePoint(path string, info os.FileInfo) error {
	if info.Mode()&os.ModeSymlink != 0 {
		return fmt.Errorf("store: %s: %w", path, ErrUnsafePerms)
	}
	pathp, err := windows.UTF16PtrFromString(path)
	if err != nil {
		return fmt.Errorf("store: %s: %w", path, err)
	}
	attrs, err := windows.GetFileAttributes(pathp)
	if err != nil {
		return fmt.Errorf("store: %s: read attributes: %w", path, err)
	}
	if attrs&windows.FILE_ATTRIBUTE_REPARSE_POINT != 0 {
		return fmt.Errorf("store: %s: %w", path, ErrUnsafePerms)
	}
	return nil
}

// checkOwner reports ErrUnsafePerms when path's owner SID does not match
// the current process token's user SID.
func checkOwner(path string, _ os.FileInfo) error {
	owner, err := ownerSID(path)
	if err != nil {
		return err
	}
	user, err := currentUserSID()
	if err != nil {
		return err
	}
	if !owner.Equals(user) {
		return ErrUnsafePerms
	}
	return nil
}

// checkSafePerm reports ErrUnsafePerms when path's owner is not the
// current user, or when path's DACL grants access to a trustee other than
// the owner. NTFS has no analogue to POSIX group/other bits, so the ACL is
// the only source of truth.
func checkSafePerm(path string, info os.FileInfo) error {
	if err := checkOwner(path, info); err != nil {
		return err
	}
	return checkOwnerOnlyDACL(path)
}

func currentUserSID() (*windows.SID, error) {
	tok := windows.GetCurrentProcessToken()
	u, err := tok.GetTokenUser()
	if err != nil {
		return nil, fmt.Errorf("store: read current user: %w", err)
	}
	return u.User.Sid, nil
}

func ownerSID(path string) (*windows.SID, error) {
	sd, err := windows.GetNamedSecurityInfo(path, windows.SE_FILE_OBJECT, windows.OWNER_SECURITY_INFORMATION)
	if err != nil {
		return nil, fmt.Errorf("store: %s: read owner: %w", path, err)
	}
	owner, _, err := sd.Owner()
	if err != nil {
		return nil, fmt.Errorf("store: %s: read owner: %w", path, err)
	}
	return owner, nil
}

// checkOwnerOnlyDACL reports ErrUnsafePerms when path's DACL is absent (an
// absent DACL grants everyone full access) or grants allowed access to a
// trustee other than path's owner. The local SYSTEM and built-in
// Administrators SIDs are exempt: Windows attaches them to a file's ACL by
// default regardless of the owner's intent, the platform's equivalent of
// POSIX root always bypassing a file's mode bits.
func checkOwnerOnlyDACL(path string) error {
	sd, err := windows.GetNamedSecurityInfo(
		path,
		windows.SE_FILE_OBJECT,
		windows.OWNER_SECURITY_INFORMATION|windows.DACL_SECURITY_INFORMATION,
	)
	if err != nil {
		return fmt.Errorf("store: %s: read security descriptor: %w", path, err)
	}
	owner, _, err := sd.Owner()
	if err != nil {
		return fmt.Errorf("store: %s: read owner: %w", path, err)
	}
	dacl, _, err := sd.DACL()
	if err != nil {
		return fmt.Errorf("store: %s: read DACL: %w", path, err)
	}
	if dacl == nil {
		return ErrUnsafePerms
	}
	for i := range uint32(dacl.AceCount) {
		var ace *windows.ACCESS_ALLOWED_ACE
		if err := windows.GetAce(dacl, i, &ace); err != nil {
			return fmt.Errorf("store: %s: read ACE %d: %w", path, i, err)
		}
		if ace.Header.AceType != windows.ACCESS_ALLOWED_ACE_TYPE {
			continue
		}
		sid := (*windows.SID)(unsafe.Pointer(&ace.SidStart))
		if sid.Equals(owner) {
			continue
		}
		if sid.IsWellKnown(windows.WinLocalSystemSid) || sid.IsWellKnown(windows.WinBuiltinAdministratorsSid) {
			continue
		}
		return ErrUnsafePerms
	}
	return nil
}
