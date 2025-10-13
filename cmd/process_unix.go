//go:build !windows

package cmd

import (
	"os"
	"syscall"
)

func isProcessRunning(pid int) bool {
	process, err := os.FindProcess(pid)
	if err != nil {
		return false
	}
	err = process.Signal(syscall.Signal(0))
	if err == nil {
		return true
	}

	if err == syscall.ESRCH {
		return false
	}

	if err == syscall.EPERM {
		return true
	}

	return false
}
