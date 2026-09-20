package store

import (
	"fmt"
	"os"
	"syscall"
)

// openNoFollow creates path exclusively at mode 0600, refusing to follow a
// symlink already sitting at path.
func openNoFollow(path string) (*os.File, error) {
	return os.OpenFile(path, os.O_WRONLY|os.O_CREATE|os.O_EXCL|syscall.O_NOFOLLOW, 0o600)
}

// checkNotReparsePoint reports ErrUnsafePerms when path is a symlink. POSIX
// has no reparse-point concept beyond the symlink bit Lstat already
// reports.
func checkNotReparsePoint(path string, info os.FileInfo) error {
	if info.Mode()&os.ModeSymlink != 0 {
		return fmt.Errorf("store: %s: %w", path, ErrUnsafePerms)
	}
	return nil
}

// checkOwner reports ErrUnsafePerms when the current user does not own
// path.
func checkOwner(path string, info os.FileInfo) error {
	st, ok := info.Sys().(*syscall.Stat_t)
	if !ok {
		return fmt.Errorf("store: %s: cannot determine owner", path)
	}
	if int(st.Uid) != os.Getuid() {
		return ErrUnsafePerms
	}
	return nil
}

// checkSafePerm reports ErrUnsafePerms when path grants any permission to
// its group or others, or is not owned by the current user.
func checkSafePerm(path string, info os.FileInfo) error {
	if info.Mode().Perm()&0o077 != 0 {
		return ErrUnsafePerms
	}
	return checkOwner(path, info)
}

// ensureOwnerOnlyDir is a no-op on POSIX: MkdirAll's mode argument already
// sets the owner-only bits at creation time.
func ensureOwnerOnlyDir(_ string) error {
	return nil
}
