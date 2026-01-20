package paths

import (
	"fmt"
	"os"
	"path/filepath"
	"sync"
)

var (
	once     sync.Once
	initErr  error
	baseDir  string
	filesDir string
	pid      string
)

// Initialize sets up the base directory structure once
func Initialize() error {
	once.Do(func() {
		dir, err := os.UserConfigDir()
		if err != nil {
			initErr = fmt.Errorf("could not get user config dir: %v", err)
			return
		}

		baseDir = filepath.Join(dir, "localdrop", "internal", "storage")
		filesDir = filepath.Join(baseDir, "files")
		pid = filepath.Join(dir, "localdrop", "localdrop.pid")

		if err := os.MkdirAll(filesDir, 0755); err != nil {
			initErr = fmt.Errorf("failed to create directories: %v", err)
			return
		}
	})

	return initErr
}
func GetConfigPath() (string, error) {
	if err := Initialize(); err != nil {
		return "", err
	}
	return filepath.Join(baseDir, "config.yaml"), nil
}

func GetExePath() (string, error) {
	exePath, err := os.Executable()
	if err != nil {
		return "", fmt.Errorf("could not get executable path: %v", err)
	}
	return filepath.Dir(exePath), nil
}

func GetAdminFilePath() (string, error) {
	if err := Initialize(); err != nil {
		return "", err
	}
	return filepath.Join(baseDir, "adminList.json"), nil
}

func GetFilesPath() (string, error) {
	if err := Initialize(); err != nil {
		return "", err
	}
	return filesDir + string(filepath.Separator), nil
}

func GetPidFilePath() (string, error) {
	if err := Initialize(); err != nil {
		return "", err
	}
	return pid, nil
}
