//go:build windows
// +build windows

package cmd

import (
	"os/exec"
	"syscall"
)

// setProcAttributes sets Windows-specific process attributes
func setProcAttributes(cmd *exec.Cmd) {
	cmd.SysProcAttr = &syscall.SysProcAttr{
		HideWindow: true,
	}
}
