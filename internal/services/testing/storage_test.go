package services_test

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/Mo7sen007/LocalDrop/internal/models"
	"github.com/Mo7sen007/LocalDrop/internal/storage"
	"github.com/google/uuid"
)

// helper: create a temporary JSON file with admin data
func createTempAdminFile(t *testing.T, admins []models.Admin) string {
	t.Helper()

	// marshal to JSON
	data, err := json.Marshal(admins)
	if err != nil {
		t.Fatalf("failed to marshal admins: %v", err)
	}

	// create temp file
	tmpFile := filepath.Join(os.TempDir(), "adminList.json")
	if err := os.WriteFile(tmpFile, data, 0644); err != nil {
		t.Fatalf("failed to write temp file: %v", err)
	}

	return tmpFile
}

func TestLoadAdminList(t *testing.T) {
	// fake admin entry
	admins := []models.Admin{
		{
			ID:           uuid.New(),
			Username:     "testadmin",
			PasswordHash: "hashedpassword",
			CreatedAt:    time.Now(),
		},
	}

	// create temp file
	tmpFile := createTempAdminFile(t, admins)
	defer os.Remove(tmpFile) // cleanup after test

	// temporarily replace the path inside your function
	// ⚠️ Better: refactor LoadAdminList to accept a filename argument!
	// For now, just rename/move the temp file into the expected location.
	expectedPath := "internal/storage/adminList.json"
	_ = os.MkdirAll(filepath.Dir(expectedPath), 0755)
	if err := os.Rename(tmpFile, expectedPath); err != nil {
		t.Fatalf("failed to move temp file: %v", err)
	}
	defer os.Remove(expectedPath)

	// call the function
	list, err := storage.LoadAdminList(tmpFile)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(list) != 1 {
		t.Fatalf("expected 1 admin, got %d", len(list))
	}

	if list[0].Username != "testadmin" {
		t.Errorf("expected username 'testadmin', got '%s'", list[0].Username)
	}
}
