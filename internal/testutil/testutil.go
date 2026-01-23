package testutil

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/Mo7sen007/LocalDrop/internal/config"
	"github.com/Mo7sen007/LocalDrop/internal/models"
	"github.com/Mo7sen007/LocalDrop/internal/paths"
	"github.com/Mo7sen007/LocalDrop/internal/storage"
)

func SetTestEnv(tempDir string) {
	_ = os.Setenv("XDG_CONFIG_HOME", tempDir)
	_ = os.Setenv("LOCALDROP_ENV", "test")
	_ = os.Setenv("GIN_MODE", "test")
}

func ResetStorage(t *testing.T) {
	t.Helper()

	filesPath, err := paths.GetFilesPath()
	if err != nil {
		t.Fatalf("failed to get files path: %v", err)
	}

	if storage.DB != nil {
		_ = storage.DB.Close()
		storage.DB = nil
	}

	_ = os.RemoveAll(filepath.Clean(filesPath))
	if err := os.MkdirAll(filesPath, 0o755); err != nil {
		t.Fatalf("failed to recreate files dir: %v", err)
	}

	configPath, err := paths.GetConfigPath()
	if err != nil {
		t.Fatalf("failed to get config path: %v", err)
	}
	_ = os.Remove(configPath)

	if err := storage.Init(); err != nil {
		t.Fatalf("failed to init storage: %v", err)
	}
}

func LoadAndSaveConfig(t *testing.T, mutate func(*models.Config)) models.Config {
	t.Helper()

	cfg, err := config.GetConfig()
	if err != nil {
		t.Fatalf("failed to load config: %v", err)
	}

	if mutate != nil {
		mutate(&cfg)
	}

	if err := config.SaveConfig(&cfg); err != nil {
		t.Fatalf("failed to save config: %v", err)
	}
	return cfg
}
