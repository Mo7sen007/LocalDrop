package internal

import (
	"net/http"
	"net/http/httptest"
	"os"
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
