package storage

import (
	"os"
	"testing"
)

func TestMain(m *testing.M) {
	tempDir, err := os.MkdirTemp("", "localdrop-test-")
	if err != nil {
		os.Exit(1)
	}
	defer os.RemoveAll(tempDir)

	_ = os.Setenv("XDG_CONFIG_HOME", tempDir)
	_ = os.Setenv("LOCALDROP_ENV", "test")
	_ = os.Setenv("GIN_MODE", "test")

	os.Exit(m.Run())
}
