package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"

	"github.com/Mo7sen007/LocalDrop/internal/services/serverlog"
	"github.com/joho/godotenv"
)

func LoadDotEnv() {
	if _, err := os.Stat(".env"); err == nil {
		if err := godotenv.Load(); err != nil {
			serverlog.Warnf("failed to load .env: %v", err)
		}
	}
}

func IsProduction() bool {
	ginMode := strings.ToLower(strings.TrimSpace(os.Getenv("GIN_MODE")))
	if ginMode == "release" {
		return true
	}

	env := strings.ToLower(strings.TrimSpace(os.Getenv("LOCALDROP_ENV")))
	return env == "production" || env == "prod"
}

func GetString(key string) (string, bool) {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return "", false
	}
	return value, true
}

func GetStringDefault(key, defaultValue string) string {
	if value, ok := GetString(key); ok {
		return value
	}
	return defaultValue
}

func GetRequiredString(key string) (string, error) {
	value, ok := GetString(key)
	if !ok {
		return "", fmt.Errorf("%s is required", key)
	}
	return value, nil
}

func GetBool(key string) (bool, bool, error) {
	raw, ok := GetString(key)
	if !ok {
		return false, false, nil
	}
	parsed, err := strconv.ParseBool(raw)
	if err != nil {
		return false, true, fmt.Errorf("%s must be a boolean, got %q", key, raw)
	}
	return parsed, true, nil
}

func GetBoolDefault(key string, defaultValue bool) bool {
	value, ok, err := GetBool(key)
	if err != nil {
		serverlog.Warnf("%v (using default %v)", err, defaultValue)
		return defaultValue
	}
	if !ok {
		return defaultValue
	}
	return value
}

func GetInt(key string) (int, bool, error) {
	raw, ok := GetString(key)
	if !ok {
		return 0, false, nil
	}
	parsed, err := strconv.Atoi(raw)
	if err != nil {
		return 0, true, fmt.Errorf("%s must be an integer, got %q", key, raw)
	}
	return parsed, true, nil
}

func GetIntDefault(key string, defaultValue int) int {
	value, ok, err := GetInt(key)
	if err != nil {
		serverlog.Warnf("%v (using default %d)", err, defaultValue)
		return defaultValue
	}
	if !ok {
		return defaultValue
	}
	return value
}
