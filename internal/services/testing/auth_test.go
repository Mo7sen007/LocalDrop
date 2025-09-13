package services_test

import (
	"os"
	"testing"
	"time"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"

	"github.com/Mo7sen007/LocalDrop/internal/models"
	"github.com/Mo7sen007/LocalDrop/internal/services"
)

// helper: create temp admin list JSON

func TestAuthAdmin(t *testing.T) {
	// create bcrypt hash for password "admin123"
	hash, err := bcrypt.GenerateFromPassword([]byte("admin123"), bcrypt.DefaultCost)
	if err != nil {
		t.Fatalf("failed to generate hash: %v", err)
	}

	admins := []models.Admin{
		{
			ID:           uuid.New(),
			Username:     "testadmin",
			PasswordHash: string(hash),
			CreatedAt:    time.Now(),
		},
	}

	// create temp JSON file
	tmpFile := createTempAdminFile(t, admins)
	defer os.Remove(tmpFile)

	// ---- Test correct login ----
	ok, err := services.AuthAdmin("testadmin", "admin123", tmpFile)

	if err != nil || !ok {
		t.Errorf("expected successful login, got ok=%v, err=%v", ok, err)
	}

	// ---- Test wrong password ----
	ok, err = services.AuthAdmin("testadmin", "wrongpass", tmpFile)
	if err != services.ErrWrongPassword {
		t.Errorf("expected ErrWrongPassword, got %v", err)
	}
	if ok {
		t.Errorf("expected ok=false for wrong password")
	}

	// ---- Test nonexistent user ----
	ok, err = services.AuthAdmin("nouser", "any", tmpFile)
	if err != services.ErrUserNotFound {
		t.Errorf("expected ErrUserNotFound, got %v", err)
	}
	if ok {
		t.Errorf("expected ok=false for nonexistent user")
	}
}
