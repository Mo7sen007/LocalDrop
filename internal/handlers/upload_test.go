package handlers

import (
	"bytes"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/Mo7sen007/LocalDrop/internal/models"
	"github.com/Mo7sen007/LocalDrop/internal/services"
	"github.com/Mo7sen007/LocalDrop/internal/testutil"
)

func buildMultipart(t *testing.T, fields map[string]string, fileField, fileName string, fileContent []byte) (*bytes.Buffer, string) {
	t.Helper()

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)

	for key, value := range fields {
		if err := writer.WriteField(key, value); err != nil {
			t.Fatalf("failed to write field %s: %v", key, err)
		}
	}

	part, err := writer.CreateFormFile(fileField, fileName)
	if err != nil {
		t.Fatalf("failed to create form file: %v", err)
	}

	if _, err := part.Write(fileContent); err != nil {
		t.Fatalf("failed to write file content: %v", err)
	}

	if err := writer.Close(); err != nil {
		t.Fatalf("failed to close multipart writer: %v", err)
	}

	return body, writer.FormDataContentType()
}

func TestUploadHandlerRequiresAuth(t *testing.T) {
	testutil.ResetStorage(t)

	deps, cleanup := newHandlerDeps(t)
	t.Cleanup(cleanup)

	router := newTestRouter(true, deps.uploadHandler.UploadHandler, deps.fileHandler.DeleteFileHandler, deps.folderHandler.DeleteFolderHandler)

	req := httptest.NewRequest(http.MethodPost, "/upload", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusFound {
		t.Fatalf("expected status %d, got %d", http.StatusFound, rec.Code)
	}

	if location := rec.Header().Get("Location"); location != "/login" {
		t.Fatalf("expected redirect to /login, got %q", location)
	}
}

func TestUploadHandlerFileSuccess(t *testing.T) {
	testutil.ResetStorage(t)
	testutil.LoadAndSaveConfig(t, func(cfg *models.Config) {
		cfg.Storage.MaxFileSize = 10 << 20
	})

	deps, cleanup := newHandlerDeps(t)
	t.Cleanup(cleanup)

	router := newTestRouter(false, deps.uploadHandler.UploadHandler, deps.fileHandler.DeleteFileHandler, deps.folderHandler.DeleteFolderHandler)

	body, contentType := buildMultipart(t, map[string]string{
		"contentType":  "file",
		"display_name": "report",
		"pin_code":     "1234",
	}, "files", "hello.txt", []byte("hello"))

	req := httptest.NewRequest(http.MethodPost, "/upload", body)
	req.Header.Set("Content-Type", contentType)

	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d", http.StatusOK, rec.Code)
	}

	files := deps.fileService.GetAllFiles()
	if len(files) != 1 {
		t.Fatalf("expected 1 file, got %d", len(files))
	}

	uploaded := files[0]
	if uploaded.Name != "report.txt" {
		t.Fatalf("expected name report.txt, got %q", uploaded.Name)
	}
	if uploaded.Pin == nil || !services.CheckPasswordHash("1234", *uploaded.Pin) {
		t.Fatalf("expected pin to be hashed and verified")
	}

	if _, err := os.Stat(uploaded.Path); err != nil {
		t.Fatalf("expected file to exist on disk: %v", err)
	}
}

func TestUploadHandlerMissingContentType(t *testing.T) {
	testutil.ResetStorage(t)
	deps, cleanup := newHandlerDeps(t)
	t.Cleanup(cleanup)

	router := newTestRouter(false, deps.uploadHandler.UploadHandler, deps.fileHandler.DeleteFileHandler, deps.folderHandler.DeleteFolderHandler)

	body, contentType := buildMultipart(t, map[string]string{}, "files", "hello.txt", []byte("hello"))
	req := httptest.NewRequest(http.MethodPost, "/upload", body)
	req.Header.Set("Content-Type", contentType)

	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected status %d, got %d", http.StatusBadRequest, rec.Code)
	}
}
