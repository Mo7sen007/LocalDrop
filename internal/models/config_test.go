package models

import "testing"

func TestConfigValidate_Valid(t *testing.T) {
	cfg := Config{
		App:     AppConfig{Port: 8080},
		Storage: StorageConfig{BasePath: "/tmp", MaxFileSize: 100},
		Logging: LoggingConfig{Level: "info"},
	}
	if err := cfg.Validate(); err != nil {
		t.Fatalf("expected no error, got: %v", err)
	}
}

func TestConfigValidate_InvalidPort(t *testing.T) {
	cfg := Config{
		App:     AppConfig{Port: 0},
		Storage: StorageConfig{BasePath: "/tmp"},
		Logging: LoggingConfig{Level: "info"},
	}
	if err := cfg.Validate(); err == nil {
		t.Fatal("expected error for invalid port, got nil")
	}
}

func TestConfigValidate_EmptyBasePath(t *testing.T) {
	cfg := Config{
		App:     AppConfig{Port: 8080},
		Storage: StorageConfig{BasePath: ""},
		Logging: LoggingConfig{Level: "info"},
	}
	if err := cfg.Validate(); err == nil {
		t.Fatal("expected error for empty base path, got nil")
	}
}

func TestConfigValidate_InvalidLogLevel(t *testing.T) {
	cfg := Config{
		App:     AppConfig{Port: 8080},
		Storage: StorageConfig{BasePath: "/tmp"},
		Logging: LoggingConfig{Level: "verbose"},
	}
	if err := cfg.Validate(); err == nil {
		t.Fatal("expected error for invalid log level, got nil")
	}
}

func TestConfigValidate_ValidLogLevels(t *testing.T) {
	for _, level := range []string{"debug", "info", "warn", "warning", "error"} {
		cfg := Config{
			App:     AppConfig{Port: 8080},
			Storage: StorageConfig{BasePath: "/tmp"},
			Logging: LoggingConfig{Level: level},
		}
		if err := cfg.Validate(); err != nil {
			t.Fatalf("expected no error for log level %q, got: %v", level, err)
		}
	}
}

func TestConfigValidate_AcceptsNonCanonicalLogLevel(t *testing.T) {
	cfg := Config{
		App:     AppConfig{Port: 8080},
		Storage: StorageConfig{BasePath: "/tmp"},
		Logging: LoggingConfig{Level: "  INFO  "},
	}
	if err := cfg.Validate(); err != nil {
		t.Fatalf("expected no error for uppercase/trimmed log level, got: %v", err)
	}
}

func TestConfigValidate_OutOfRangePort(t *testing.T) {
	cfg := Config{
		App:     AppConfig{Port: 70000},
		Storage: StorageConfig{BasePath: "/tmp"},
		Logging: LoggingConfig{Level: "info"},
	}
	if err := cfg.Validate(); err == nil {
		t.Fatal("expected error for out-of-range port, got nil")
	}
}

func TestApplyOverrides_Port(t *testing.T) {
	cfg := Config{
		App:     AppConfig{Port: 8080},
		Storage: StorageConfig{BasePath: "/tmp"},
		Logging: LoggingConfig{Level: "info"},
	}
	cfg.ApplyOverrides(9090, nil, "")
	if cfg.App.Port != 9090 {
		t.Fatalf("expected port 9090, got %d", cfg.App.Port)
	}
}

func TestApplyOverrides_AuthEnabled(t *testing.T) {
	cfg := Config{
		App:     AppConfig{Port: 8080},
		Storage: StorageConfig{BasePath: "/tmp"},
		Logging: LoggingConfig{Level: "info"},
	}
	enabled := true
	cfg.ApplyOverrides(0, &enabled, "")
	if !cfg.Auth.Enabled {
		t.Fatal("expected auth enabled")
	}
}

func TestApplyOverrides_LoggingLevel(t *testing.T) {
	cfg := Config{
		App:     AppConfig{Port: 8080},
		Storage: StorageConfig{BasePath: "/tmp"},
		Logging: LoggingConfig{Level: "info"},
	}
	cfg.ApplyOverrides(0, nil, "debug")
	if cfg.Logging.Level != "debug" {
		t.Fatalf("expected logging level 'debug', got %q", cfg.Logging.Level)
	}
}
