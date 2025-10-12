//go:build !windows
// +build !windows

package cmd

import (
	"os/exec"
	"syscall"
)

// setProcAttributes sets Unix-specific process attributes
func setProcAttributes(cmd *exec.Cmd) {
	cmd.SysProcAttr = &syscall.SysProcAttr{
		Setsid: true, // Create new session (proper daemonization)
	}
}
