package internal

import (
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	"github.com/Mo7sen007/LocalDrop/internal/handlers"
	"github.com/Mo7sen007/LocalDrop/internal/models"
	"github.com/Mo7sen007/LocalDrop/internal/testutil"
)

func TestMain(m *testing.M) {
	tempDir, err := os.MkdirTemp("", "localdrop-test-")
	if err != nil {
		os.Exit(1)
	}
	defer os.RemoveAll(tempDir)

	testutil.SetTestEnv(tempDir)

	os.Exit(m.Run())
}

func TestSetupRouterSetsMaxMultipartMemory(t *testing.T) {
	testutil.ResetStorage(t)
	cfg := testutil.LoadAndSaveConfig(t, func(c *models.Config) {
		c.Storage.MaxFileSize = 7 << 20
		c.Auth.Enabled = false
	})

	deps, cleanup := testutil.SetupStorageDeps(t)
	t.Cleanup(cleanup)

	server := &Server{config: &cfg}
	if err := server.setupRouter(
		handlers.NewFileHandler(deps.FileService),
		handlers.NewFolderHandler(deps.FolderService, deps.FileService),
		handlers.NewAdminHandler(deps.AdminService),
		handlers.NewUploadHandler(deps.FolderService, deps.FileService),
	); err != nil {
		t.Fatalf("setupRouter failed: %v", err)
	}

	if server.router == nil {
		t.Fatalf("expected router to be initialized")
	}

	if server.router.MaxMultipartMemory != cfg.Storage.MaxFileSize {
		t.Fatalf("expected MaxMultipartMemory %d, got %d", cfg.Storage.MaxFileSize, server.router.MaxMultipartMemory)
	}
}

func TestDashboardRequiresAuthWhenEnabled(t *testing.T) {
	testutil.ResetStorage(t)
	cfg := testutil.LoadAndSaveConfig(t, func(c *models.Config) {
		c.Auth.Enabled = true
	})

	deps, cleanup := testutil.SetupStorageDeps(t)
	t.Cleanup(cleanup)

	server := &Server{config: &cfg}
	if err := server.setupRouter(
		handlers.NewFileHandler(deps.FileService),
		handlers.NewFolderHandler(deps.FolderService, deps.FileService),
		handlers.NewAdminHandler(deps.AdminService),
		handlers.NewUploadHandler(deps.FolderService, deps.FileService),
	); err != nil {
		t.Fatalf("setupRouter failed: %v", err)
	}

	req := httptest.NewRequest(http.MethodGet, "/dashboard", nil)
	rec := httptest.NewRecorder()
	server.router.ServeHTTP(rec, req)

	if rec.Code != http.StatusFound {
		t.Fatalf("expected status %d (redirect to login) for /dashboard when auth enabled, got %d", http.StatusFound, rec.Code)
	}
}

func TestDashboardAccessibleWhenAuthDisabled(t *testing.T) {
	testutil.ResetStorage(t)
	cfg := testutil.LoadAndSaveConfig(t, func(c *models.Config) {
		c.Auth.Enabled = false
	})

	deps, cleanup := testutil.SetupStorageDeps(t)
	t.Cleanup(cleanup)

	server := &Server{config: &cfg}
	if err := server.setupRouter(
		handlers.NewFileHandler(deps.FileService),
		handlers.NewFolderHandler(deps.FolderService, deps.FileService),
		handlers.NewAdminHandler(deps.AdminService),
		handlers.NewUploadHandler(deps.FolderService, deps.FileService),
	); err != nil {
		t.Fatalf("setupRouter failed: %v", err)
	}

	req := httptest.NewRequest(http.MethodGet, "/dashboard", nil)
	rec := httptest.NewRecorder()
	server.router.ServeHTTP(rec, req)

	if rec.Code == http.StatusFound {
		t.Fatalf("expected /dashboard to be accessible when auth disabled, but got redirect (status %d)", rec.Code)
	}
}

func TestSetupRouterAuthProtectsUpload(t *testing.T) {
	testutil.ResetStorage(t)
	cfg := testutil.LoadAndSaveConfig(t, func(c *models.Config) {
		c.Auth.Enabled = true
	})

	deps, cleanup := testutil.SetupStorageDeps(t)
	t.Cleanup(cleanup)

	server := &Server{config: &cfg}
	if err := server.setupRouter(
		handlers.NewFileHandler(deps.FileService),
		handlers.NewFolderHandler(deps.FolderService, deps.FileService),
		handlers.NewAdminHandler(deps.AdminService),
		handlers.NewUploadHandler(deps.FolderService, deps.FileService),
	); err != nil {
		t.Fatalf("setupRouter failed: %v", err)
	}

	req := httptest.NewRequest(http.MethodPost, "/upload", nil)
	rec := httptest.NewRecorder()
	server.router.ServeHTTP(rec, req)

	if rec.Code != http.StatusFound {
		t.Fatalf("expected status %d, got %d", http.StatusFound, rec.Code)
	}
}

type protectedRoute struct {
	method string
	path   string
}

func TestAllProtectedRoutesBlockedWhenAuthEnabled(t *testing.T) {
	testutil.ResetStorage(t)
	cfg := testutil.LoadAndSaveConfig(t, func(c *models.Config) {
		c.Auth.Enabled = true
	})

	deps, cleanup := testutil.SetupStorageDeps(t)
	t.Cleanup(cleanup)

	server := &Server{config: &cfg}
	if err := server.setupRouter(
		handlers.NewFileHandler(deps.FileService),
		handlers.NewFolderHandler(deps.FolderService, deps.FileService),
		handlers.NewAdminHandler(deps.AdminService),
		handlers.NewUploadHandler(deps.FolderService, deps.FileService),
	); err != nil {
		t.Fatalf("setupRouter failed: %v", err)
	}

	routes := []protectedRoute{
		{http.MethodGet, "/dashboard"},
		{http.MethodGet, "/config"},
		{http.MethodGet, "/admin"},
		{http.MethodPost, "/upload"},
		{http.MethodDelete, "/delete/file/some-id"},
		{http.MethodDelete, "/delete/folder/some-id"},
		{http.MethodGet, "/config/api"},
		{http.MethodPut, "/config/api"},
	}

	for _, rt := range routes {
		req := httptest.NewRequest(rt.method, rt.path, nil)
		rec := httptest.NewRecorder()
		server.router.ServeHTTP(rec, req)

		if rec.Code != http.StatusFound {
			t.Errorf("expected redirect (302) for %s %s when auth enabled, got %d", rt.method, rt.path, rec.Code)
		}
	}
}

func TestAllProtectedRoutesAccessibleWhenAuthDisabled(t *testing.T) {
	testutil.ResetStorage(t)
	cfg := testutil.LoadAndSaveConfig(t, func(c *models.Config) {
		c.Auth.Enabled = false
	})

	deps, cleanup := testutil.SetupStorageDeps(t)
	t.Cleanup(cleanup)

	server := &Server{config: &cfg}
	if err := server.setupRouter(
		handlers.NewFileHandler(deps.FileService),
		handlers.NewFolderHandler(deps.FolderService, deps.FileService),
		handlers.NewAdminHandler(deps.AdminService),
		handlers.NewUploadHandler(deps.FolderService, deps.FileService),
	); err != nil {
		t.Fatalf("setupRouter failed: %v", err)
	}

	routes := []protectedRoute{
		{http.MethodGet, "/dashboard"},
		{http.MethodGet, "/config"},
		{http.MethodGet, "/admin"},
		{http.MethodPost, "/upload"},
		{http.MethodDelete, "/delete/file/some-id"},
		{http.MethodDelete, "/delete/folder/some-id"},
		{http.MethodGet, "/config/api"},
		{http.MethodPut, "/config/api"},
	}

	for _, rt := range routes {
		req := httptest.NewRequest(rt.method, rt.path, nil)
		rec := httptest.NewRecorder()
		server.router.ServeHTTP(rec, req)

		if rec.Code == http.StatusFound {
			t.Errorf("unexpected redirect for %s %s when auth disabled (got 302)", rt.method, rt.path)
		}
	}
}

func TestAuthStatusEndpoint(t *testing.T) {
	testutil.ResetStorage(t)
	cfg := testutil.LoadAndSaveConfig(t, func(c *models.Config) {
		c.Auth.Enabled = true
	})

	deps, cleanup := testutil.SetupStorageDeps(t)
	t.Cleanup(cleanup)

	server := &Server{config: &cfg}
	if err := server.setupRouter(
		handlers.NewFileHandler(deps.FileService),
		handlers.NewFolderHandler(deps.FolderService, deps.FileService),
		handlers.NewAdminHandler(deps.AdminService),
		handlers.NewUploadHandler(deps.FolderService, deps.FileService),
	); err != nil {
		t.Fatalf("setupRouter failed: %v", err)
	}

	req := httptest.NewRequest(http.MethodGet, "/auth/status", nil)
	rec := httptest.NewRecorder()
	server.router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}

	body := rec.Body.String()
	if !strings.Contains(body, `"authEnabled":true`) {
		t.Fatalf("expected authEnabled true in response, got: %s", body)
	}
}
