package services

import (
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/Mo7sen007/LocalDrop/internal/models"
	"github.com/Mo7sen007/LocalDrop/internal/paths"
	storagesql "github.com/Mo7sen007/LocalDrop/internal/storage/sql"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

func TestMain(m *testing.M) {
	tempDir, err := os.MkdirTemp("", "localdrop-services-test-")
	if err != nil {
		os.Exit(1)
	}
	defer os.RemoveAll(tempDir)

	_ = os.Setenv("XDG_CONFIG_HOME", tempDir)
	_ = os.Setenv("LOCALDROP_ENV", "test")

	os.Exit(m.Run())
}

type adminTestDeps struct {
	svc  *AdminService
	repo *storagesql.SQLRepository
}

func resetStorage() error {
	filesPath, err := paths.GetFilesPath()
	if err != nil {
		return err
	}

	if err := os.RemoveAll(filepath.Clean(filesPath)); err != nil {
		return err
	}

	if err := os.MkdirAll(filesPath, 0755); err != nil {
		return err
	}

	return nil
}

func setupAdminTest(t *testing.T) (*adminTestDeps, func()) {
	t.Helper()

	if err := resetStorage(); err != nil {
		t.Fatalf("failed to reset storage: %v", err)
	}

	db, err := storagesql.Init()
	if err != nil {
		t.Fatalf("failed to init storage: %v", err)
	}

	repo := storagesql.NewSQLRepository(db)
	svc := NewAdminService(repo)
	cleanup := func() { _ = db.Close() }
	return &adminTestDeps{svc: svc, repo: repo}, cleanup
}

func createAdminInRepo(t *testing.T, repo *storagesql.SQLRepository, username, password string) {
	t.Helper()

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		t.Fatalf("failed to hash password: %v", err)
	}

	admin := &models.Admin{
		ID:           uuid.New(),
		Username:     username,
		PasswordHash: string(hash),
		CreatedAt:    time.Now(),
	}

	if err := repo.CreateAdmin(admin); err != nil {
		t.Fatalf("failed to create admin: %v", err)
	}
}

func TestAuthAdmin_Success(t *testing.T) {
	deps, cleanup := setupAdminTest(t)
	t.Cleanup(cleanup)

	createAdminInRepo(t, deps.repo, "admin", "secret123")

	ok, err := deps.svc.AuthAdmin("admin", "secret123", "")
	if err != nil {
		t.Fatalf("expected no error, got: %v", err)
	}
	if !ok {
		t.Fatal("expected authentication to succeed")
	}
}

func TestAuthAdmin_WrongPassword(t *testing.T) {
	deps, cleanup := setupAdminTest(t)
	t.Cleanup(cleanup)

	createAdminInRepo(t, deps.repo, "admin", "secret123")

	_, err := deps.svc.AuthAdmin("admin", "wrongpassword", "")
	if err != ErrWrongPassword {
		t.Fatalf("expected ErrWrongPassword, got: %v", err)
	}
}

func TestAuthAdmin_UserNotFound(t *testing.T) {
	deps, cleanup := setupAdminTest(t)
	t.Cleanup(cleanup)

	_, err := deps.svc.AuthAdmin("nonexistent", "irrelevant", "")
	if err != ErrUserNotFound {
		t.Fatalf("expected ErrUserNotFound, got: %v", err)
	}
}

func TestAuthAdmin_EmptyPassword(t *testing.T) {
	deps, cleanup := setupAdminTest(t)
	t.Cleanup(cleanup)

	createAdminInRepo(t, deps.repo, "admin", "")

	ok, err := deps.svc.AuthAdmin("admin", "", "")
	if err != nil {
		t.Fatalf("expected no error for empty password, got: %v", err)
	}
	if !ok {
		t.Fatal("expected authentication to succeed with empty password")
	}
}
