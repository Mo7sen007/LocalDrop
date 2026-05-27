package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/Mo7sen007/LocalDrop/internal/config"
	"github.com/Mo7sen007/LocalDrop/internal/models"
	"github.com/Mo7sen007/LocalDrop/internal/testutil"
	"github.com/gin-gonic/gin"
)

func newConfigTestRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.GET("/config/api", GetConfig)
	router.PUT("/config/api", UpdateConfig)
	return router
}

func TestConfigGet_ReturnsConfig(t *testing.T) {
	testutil.ResetStorage(t)
	testutil.LoadAndSaveConfig(t, func(cfg *models.Config) {
		cfg.App.Port = 8080
		cfg.Storage.BasePath = "/tmp"
		cfg.Logging.Level = "info"
	})

	router := newConfigTestRouter()
	req := httptest.NewRequest(http.MethodGet, "/config/api", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}

	var resp map[string]interface{}
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to parse response: %v", err)
	}
	server := resp["server"].(map[string]interface{})
	port := server["port"].(float64)
	if port != 8080 {
		t.Fatalf("expected port 8080, got %v", port)
	}
}

func TestConfigPut_ValidUpdate(t *testing.T) {
	testutil.ResetStorage(t)
	testutil.LoadAndSaveConfig(t, func(cfg *models.Config) {
		cfg.App.Port = 8080
		cfg.Storage.BasePath = "/tmp"
		cfg.Storage.MaxFileSize = 100 << 20
		cfg.Logging.Level = "info"
	})

	payload := map[string]interface{}{
		"server": map[string]interface{}{
			"port": 9090,
		},
		"tls": map[string]interface{}{
			"tls_enabled": false,
			"cert_file":   "",
			"key_file":    "",
		},
		"storage": map[string]interface{}{
			"base_path": "/custom/storage",
			"max_size":  50 << 20,
		},
		"auth": map[string]interface{}{
			"authentication": true,
		},
		"logging": map[string]interface{}{
			"logging":        false,
			"logging_level": "debug",
		},
	}

	body, _ := json.Marshal(payload)
	router := newConfigTestRouter()
	req := httptest.NewRequest(http.MethodPut, "/config/api", strings.NewReader(string(body)))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}

	updated, err := config.GetConfig()
	if err != nil {
		t.Fatalf("failed to load config after update: %v", err)
	}
	if updated.App.Port != 9090 {
		t.Fatalf("expected port 9090, got %d", updated.App.Port)
	}
	if !updated.Auth.Enabled {
		t.Fatal("expected auth enabled")
	}
}

func TestConfigPut_InvalidPort(t *testing.T) {
	testutil.ResetStorage(t)
	testutil.LoadAndSaveConfig(t, func(cfg *models.Config) {
		cfg.App.Port = 8080
		cfg.Storage.BasePath = "/tmp"
		cfg.Logging.Level = "info"
	})

	payload := map[string]interface{}{
		"server": map[string]interface{}{
			"port": 99999,
		},
	}

	body, _ := json.Marshal(payload)
	router := newConfigTestRouter()
	req := httptest.NewRequest(http.MethodPut, "/config/api", strings.NewReader(string(body)))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 for invalid port, got %d: %s", rec.Code, rec.Body.String())
	}
}

func TestConfigPut_EmptyBasePath(t *testing.T) {
	testutil.ResetStorage(t)
	testutil.LoadAndSaveConfig(t, func(cfg *models.Config) {
		cfg.App.Port = 8080
		cfg.Storage.BasePath = "/tmp"
		cfg.Logging.Level = "info"
	})

	payload := map[string]interface{}{
		"storage": map[string]interface{}{
			"base_path": "",
			"max_size":  100,
		},
	}

	body, _ := json.Marshal(payload)
	router := newConfigTestRouter()
	req := httptest.NewRequest(http.MethodPut, "/config/api", strings.NewReader(string(body)))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 for empty base path, got %d: %s", rec.Code, rec.Body.String())
	}
}

func TestConfigPut_InvalidLogLevel(t *testing.T) {
	testutil.ResetStorage(t)
	testutil.LoadAndSaveConfig(t, func(cfg *models.Config) {
		cfg.App.Port = 8080
		cfg.Storage.BasePath = "/tmp"
		cfg.Logging.Level = "info"
	})

	payload := map[string]interface{}{
		"logging": map[string]interface{}{
			"logging":        true,
			"logging_level": "invalid-level",
		},
	}

	body, _ := json.Marshal(payload)
	router := newConfigTestRouter()
	req := httptest.NewRequest(http.MethodPut, "/config/api", strings.NewReader(string(body)))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 for invalid log level, got %d: %s", rec.Code, rec.Body.String())
	}
}

func TestConfigPut_LogLevelNormalized(t *testing.T) {
	testutil.ResetStorage(t)
	testutil.LoadAndSaveConfig(t, func(cfg *models.Config) {
		cfg.App.Port = 8080
		cfg.Storage.BasePath = "/tmp"
		cfg.Storage.MaxFileSize = 100 << 20
		cfg.Logging.Level = "info"
	})

	payload := map[string]interface{}{
		"server": map[string]interface{}{
			"port": 8080,
		},
		"tls": map[string]interface{}{
			"tls_enabled": false,
			"cert_file":   "",
			"key_file":    "",
		},
		"storage": map[string]interface{}{
			"base_path": "/tmp",
			"max_size":  100 << 20,
		},
		"auth": map[string]interface{}{
			"authentication": false,
		},
		"logging": map[string]interface{}{
			"logging":        true,
			"logging_level": "  WARN  ",
		},
	}

	body, _ := json.Marshal(payload)
	router := newConfigTestRouter()
	req := httptest.NewRequest(http.MethodPut, "/config/api", strings.NewReader(string(body)))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 after normalized log level, got %d: %s", rec.Code, rec.Body.String())
	}

	updated, err := config.GetConfig()
	if err != nil {
		t.Fatalf("failed to load config after update: %v", err)
	}
	if updated.Logging.Level != "warn" {
		t.Fatalf("expected normalized log level 'warn', got %q", updated.Logging.Level)
	}
}
