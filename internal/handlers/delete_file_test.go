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
	"github.com/Mo7sen007/LocalDrop/internal/storage"
	"github.com/Mo7sen007/LocalDrop/internal/testutil"
	"github.com/google/uuid"
)

func TestDeleteFileHandlerInvalidUUID(t *testing.T) {
	testutil.ResetStorage(t)

	router := newTestRouter(false)
	req := httptest.NewRequest(http.MethodDelete, "/delete/file/not-a-uuid", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected status %d, got %d", http.StatusBadRequest, rec.Code)
	}
}

func TestDeleteFileHandlerSuccess(t *testing.T) {
	testutil.ResetStorage(t)

	filesPath, err := paths.GetFilesPath()
	if err != nil {
		t.Fatalf("failed to get files path: %v", err)
	}

	fileID := uuid.New()
	filePath := filepath.Join(filesPath, "delete-me.txt")
	if err := os.WriteFile(filePath, []byte("data"), 0o644); err != nil {
		t.Fatalf("failed to write file: %v", err)
	}

	info, err := os.Stat(filePath)
	if err != nil {
		t.Fatalf("failed to stat file: %v", err)
	}

	file := models.File{
		ID:        fileID,
		Name:      "delete-me.txt",
		Path:      filePath,
		Size:      info.Size(),
		Extension: filepath.Ext(filePath),
		ModTime:   time.Now(),
		CreatedAt: time.Now(),
	}

	if err := storage.CreateFile(&file); err != nil {
		t.Fatalf("failed to create file record: %v", err)
	}

	router := newTestRouter(false)
	req := httptest.NewRequest(http.MethodDelete, "/delete/file/"+fileID.String(), nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d", http.StatusOK, rec.Code)
	}

	if _, err := os.Stat(filePath); !os.IsNotExist(err) {
		t.Fatalf("expected file to be deleted from disk")
	}

	if _, err := storage.GetFile(fileID); err == nil {
		t.Fatalf("expected file record to be deleted")
	}
}
