package handlers

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/Mo7sen007/LocalDrop/internal/models"
	"github.com/Mo7sen007/LocalDrop/internal/paths"
	"github.com/Mo7sen007/LocalDrop/internal/testutil"
	"github.com/google/uuid"
)

func TestDeleteFolderHandlerInvalidUUID(t *testing.T) {
	testutil.ResetStorage(t)
	deps, cleanup := newHandlerDeps(t)
	t.Cleanup(cleanup)

	router := newTestRouter(false, deps.uploadHandler.UploadHandler, deps.fileHandler.DeleteFileHandler, deps.folderHandler.DeleteFolderHandler)
	req := httptest.NewRequest(http.MethodDelete, "/delete/folder/not-a-uuid", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected status %d, got %d", http.StatusBadRequest, rec.Code)
	}
}

func TestDeleteFolderHandlerSuccess(t *testing.T) {
	testutil.ResetStorage(t)
	deps, cleanup := newHandlerDeps(t)
	t.Cleanup(cleanup)

	filesPath, err := paths.GetFilesPath()
	if err != nil {
		t.Fatalf("failed to get files path: %v", err)
	}

	folderID := uuid.New()
	folderPath := filepath.Join(filesPath, "folder-to-delete")
	if err := os.MkdirAll(folderPath, 0o755); err != nil {
		t.Fatalf("failed to create folder: %v", err)
	}

	folder := models.Folder{
		ID:        folderID,
		Name:      "folder-to-delete",
		Path:      folderPath,
		CreatedAt: time.Now(),
	}

	if err := deps.repo.CreateFolder(&folder); err != nil {
		t.Fatalf("failed to create folder record: %v", err)
	}

	router := newTestRouter(false, deps.uploadHandler.UploadHandler, deps.fileHandler.DeleteFileHandler, deps.folderHandler.DeleteFolderHandler)
	req := httptest.NewRequest(http.MethodDelete, "/delete/folder/"+folderID.String(), nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d", http.StatusOK, rec.Code)
	}

	if _, err := os.Stat(folderPath); !os.IsNotExist(err) {
		t.Fatalf("expected folder to be deleted from disk")
	}

	if _, err := deps.repo.GetFolderByID(folderID); err == nil {
		t.Fatalf("expected folder record to be deleted")
	}
}
