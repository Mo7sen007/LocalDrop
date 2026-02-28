package models

import (
	"fmt"
)

type Config struct {
	App     AppConfig     `yaml:"server" json:"server"`
	TLS     TLSConfig     `yaml:"tls" json:"tls"`
	Storage StorageConfig `yaml:"storage" json:"storage"`
	Auth    AuthConfig    `yaml:"auth" json:"auth"`
	Logging LoggingConfig `yaml:"logging" json:"logging"`
}

type TLSConfig struct {
	Enabled  bool   `yaml:"tls_enabled" json:"tls_enabled"`
	CertFile string `yaml:"cert_file" json:"cert_file"`
	KeyFile  string `yaml:"key_file" json:"key_file"`
}

type AppConfig struct {
	Port int `yaml:"port" json:"port"`
}

type StorageConfig struct {
	BasePath    string `yaml:"base_path" json:"base_path"`
	MaxFileSize int64  `yaml:"max_size" json:"max_size"`
}

type AuthConfig struct {
	Enabled bool `yaml:"authentication" json:"authentication"`
}

type LoggingConfig struct {
	Enabled bool   `yaml:"logging" json:"logging"`
	Level   string `yaml:"logging_level" json:"logging_level"`
}

func NewAppConfig(port int) AppConfig {
	return AppConfig{Port: port}
}

func NewStorageConfig(basePath string, maxFileSize int64) StorageConfig {
	return StorageConfig{BasePath: basePath, MaxFileSize: maxFileSize}
}

func NewAuthConfig(enabled bool) AuthConfig {
	return AuthConfig{Enabled: enabled}
}

func NewLoggingConfig(enabled bool, level string) LoggingConfig {
	return LoggingConfig{Enabled: enabled, Level: level}
}

func (c *Config) ApplyOverrides(port int, authEnabled *bool, loggingLevel string) {
	if port != 0 {
		c.App.Port = port
	}
	if authEnabled != nil {
		c.Auth.Enabled = *authEnabled
	}
	if loggingLevel != "" {
		c.Logging.Level = loggingLevel
	}
}

func (c *Config) Validate() error {
	if c.App.Port <= 0 || c.App.Port > 65535 {
		return fmt.Errorf("invalid server.port: %d", c.App.Port)
	}
	if c.Storage.BasePath == "" {
		return fmt.Errorf("storage.base_path is required")
	}
	return nil
}
