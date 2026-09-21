package store

import "syscall"

// setUmask sets the process umask to mask and returns the previous value.
func setUmask(mask int) int {
	return syscall.Umask(mask)
}
