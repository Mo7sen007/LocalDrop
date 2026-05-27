package config

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/Mo7sen007/LocalDrop/internal/models"
	"github.com/Mo7sen007/LocalDrop/internal/paths"
)

func TestMain(m *testing.M) {
	tempDir, err := os.MkdirTemp("", "localdrop-config-test-")
	if err != nil {
		os.Exit(1)
	}
	defer os.RemoveAll(tempDir)

	_ = os.Setenv("XDG_CONFIG_HOME", tempDir)
	_ = os.Setenv("LOCALDROP_ENV", "test")

	os.Exit(m.Run())
}

func TestGetConfig_CreatesDefaultOnMissing(t *testing.T) {
	configPath, err := paths.GetConfigPath()
	if err != nil {
		t.Fatalf("failed to get config path: %v", err)
	}
	_ = os.Remove(configPath)

	cfg, err := GetConfig()
	if err != nil {
		t.Fatalf("GetConfig failed: %v", err)
	}

	if cfg.App.Port != 8080 {
		t.Fatalf("expected default port 8080, got %d", cfg.App.Port)
	}
	if cfg.Auth.Enabled {
		t.Fatal("expected auth disabled by default")
	}
	if !cfg.Logging.Enabled {
		t.Fatal("expected logging enabled by default")
	}
	if cfg.Logging.Level != "info" {
		t.Fatalf("expected log level 'info', got %q", cfg.Logging.Level)
	}
}

func TestSaveAndLoadRoundtrip(t *testing.T) {
	configPath, err := paths.GetConfigPath()
	if err != nil {
		t.Fatalf("failed to get config path: %v", err)
	}
	_ = os.Remove(configPath)

	original := models.Config{
		App:     models.NewAppConfig(9090),
		Storage: models.NewStorageConfig("/custom/storage", 50<<20),
		Auth:    models.NewAuthConfig(true),
		Logging: models.NewLoggingConfig(false, "debug"),
	}

	if err := SaveConfig(&original); err != nil {
		t.Fatalf("SaveConfig failed: %v", err)
	}

	if _, err := os.Stat(configPath); os.IsNotExist(err) {
		t.Fatal("expected config file to exist after save")
	}

	loaded, err := GetConfig()
	if err != nil {
		t.Fatalf("GetConfig failed: %v", err)
	}

	if loaded.App.Port != 9090 {
		t.Fatalf("expected port 9090, got %d", loaded.App.Port)
	}
	if !loaded.Auth.Enabled {
		t.Fatal("expected auth enabled")
	}
	if loaded.Logging.Enabled {
		t.Fatal("expected logging disabled")
	}
	if loaded.Logging.Level != "debug" {
		t.Fatalf("expected log level 'debug', got %q", loaded.Logging.Level)
	}
	if loaded.Storage.BasePath != "/custom/storage" {
		t.Fatalf("expected base path '/custom/storage', got %q", loaded.Storage.BasePath)
	}
	if loaded.Storage.MaxFileSize != 50<<20 {
		t.Fatalf("expected max file size %d, got %d", 50<<20, loaded.Storage.MaxFileSize)
	}
}

func TestGetConfig_ReturnsErrorOnMalformedYAML(t *testing.T) {
	configPath, err := paths.GetConfigPath()
	if err != nil {
		t.Fatalf("failed to get config path: %v", err)
	}
	if err := os.WriteFile(configPath, []byte("invalid: yaml: content: {{"), 0644); err != nil {
		t.Fatalf("failed to write malformed config: %v", err)
	}

	_, err = GetConfig()
	if err == nil {
		t.Fatal("expected error for malformed YAML, got nil")
	}
}

func TestSaveConfig_OverwritesExisting(t *testing.T) {
	configPath, err := paths.GetConfigPath()
	if err != nil {
		t.Fatalf("failed to get config path: %v", err)
	}
	_ = os.Remove(configPath)

	original := models.Config{
		App:     models.NewAppConfig(8080),
		Storage: models.NewStorageConfig(filepath.Join(os.TempDir(), "test-storage"), 100<<20),
		Auth:    models.NewAuthConfig(false),
		Logging: models.NewLoggingConfig(true, "info"),
	}
	if err := SaveConfig(&original); err != nil {
		t.Fatalf("initial SaveConfig failed: %v", err)
	}

	updated := original
	updated.App.Port = 7070
	updated.Auth.Enabled = true
	if err := SaveConfig(&updated); err != nil {
		t.Fatalf("overwrite SaveConfig failed: %v", err)
	}

	loaded, err := GetConfig()
	if err != nil {
		t.Fatalf("GetConfig after overwrite failed: %v", err)
	}
	if loaded.App.Port != 7070 {
		t.Fatalf("expected port 7070 after overwrite, got %d", loaded.App.Port)
	}
	if !loaded.Auth.Enabled {
		t.Fatal("expected auth enabled after overwrite")
	}
}
