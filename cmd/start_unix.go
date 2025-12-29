//go:build !windows
// +build !windows

package cmd

import (
	"os/exec"
	"syscall"
)

func setProcAttributes(cmd *exec.Cmd) {
	cmd.SysProcAttr = &syscall.SysProcAttr{
		Setsid: true,
	}
}
