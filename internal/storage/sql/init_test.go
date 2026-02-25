package storage

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/Mo7sen007/LocalDrop/internal/paths"
	"github.com/google/uuid"
)

func resetStorageForTest(t *testing.T) {
	db, err := Init()
	if err != nil {
		t.Fatalf("failed to init storage: %v", err)
	}
	t.Helper()

	filesPath, err := paths.GetFilesPath()
	if err != nil {
		t.Fatalf("failed to get files path: %v", err)
	}

	if db != nil {
		_ = db.Close()
		db = nil
	}

	_ = os.RemoveAll(filepath.Clean(filesPath))
	if err := os.MkdirAll(filesPath, 0o755); err != nil {
		t.Fatalf("failed to recreate files dir: %v", err)
	}

	configPath, err := paths.GetConfigPath()
	if err != nil {
		t.Fatalf("failed to get config path: %v", err)
	}
	_ = os.Remove(configPath)

	if _, err := Init(); err != nil {
		t.Fatalf("failed to init storage: %v", err)
	}
}

func TestInitCreatesRootFolder(t *testing.T) {
	resetStorageForTest(t)
	var RootFolderID = "00000000-0000-0000-0000-000000000000"
	db, err := Init()
	if err != nil {
		t.Fatalf("failed to init storage: %v", err)
	}
	defer func() { _ = db.Close() }()

	r := NewSQLRepository(db)

	rootID, err := uuid.Parse(RootFolderID)
	if err != nil {
		t.Fatalf("failed to parse root id: %v", err)
	}

	root, err := r.GetFolder(rootID)
	if err != nil {
		t.Fatalf("failed to load root folder: %v", err)
	}

	if root.Name != "Root" {
		t.Fatalf("expected root folder name Root, got %q", root.Name)
	}

	filesPath, err := paths.GetFilesPath()
	if err != nil {
		t.Fatalf("failed to get files path: %v", err)
	}

	expectedPath := filepath.Join(filesPath, "Root")
	if root.Path != expectedPath {
		t.Fatalf("expected root path %q, got %q", expectedPath, root.Path)
	}
}
