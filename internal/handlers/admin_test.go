package handlers

import (
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
	"time"

	"github.com/Mo7sen007/LocalDrop/internal/middleware"
	"github.com/Mo7sen007/LocalDrop/internal/models"
	"github.com/Mo7sen007/LocalDrop/internal/testutil"
	"github.com/gin-contrib/sessions"
	"github.com/gin-contrib/sessions/cookie"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

func newAdminTestRouter(adminHandler *AdminHandler) *gin.Engine {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	store := cookie.NewStore([]byte("test-session-secret"))
	store.Options(sessions.Options{
		Path:     "/",
		MaxAge:   86400,
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
	})
	router.Use(sessions.Sessions("localdrop_session", store))

	router.POST("/login", adminHandler.LoginHandler)
	router.POST("/logout", adminHandler.LogoutHandler)

	return router
}

func adminTestRouterWithAuth(adminHandler *AdminHandler) *gin.Engine {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	store := cookie.NewStore([]byte("test-session-secret"))
	store.Options(sessions.Options{
		Path:     "/",
		MaxAge:   86400,
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
	})
	router.Use(sessions.Sessions("localdrop_session", store))

	authGroup := router.Group("/", middleware.AuthMiddleware())
	authGroup.POST("/logout", adminHandler.LogoutHandler)

	return router
}

func seedAdmin(t *testing.T, deps *testutil.StorageDeps, username, password string) {
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
	if err := deps.Repo.CreateAdmin(admin); err != nil {
		t.Fatalf("failed to create admin: %v", err)
	}
}

func postForm(router *gin.Engine, path string, data map[string]string) *httptest.ResponseRecorder {
	form := url.Values{}
	for k, v := range data {
		form.Set(k, v)
	}
	req := httptest.NewRequest(http.MethodPost, path, strings.NewReader(form.Encode()))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	return rec
}

func TestAdminLogin_Success(t *testing.T) {
	testutil.ResetStorage(t)
	deps, cleanup := testutil.SetupStorageDeps(t)
	t.Cleanup(cleanup)

	seedAdmin(t, deps, "admin", "secret123")

	adminHandler := NewAdminHandler(deps.AdminService)
	router := newAdminTestRouter(adminHandler)

	rec := postForm(router, "/login", map[string]string{
		"username": "admin",
		"password": "secret123",
	})

	if rec.Code != http.StatusFound {
		t.Fatalf("expected redirect (302) on login success, got %d", rec.Code)
	}
	if location := rec.Header().Get("Location"); location != "/dashboard" {
		t.Fatalf("expected redirect to /dashboard, got %q", location)
	}
}

func TestAdminLogin_WrongPassword(t *testing.T) {
	testutil.ResetStorage(t)
	deps, cleanup := testutil.SetupStorageDeps(t)
	t.Cleanup(cleanup)

	seedAdmin(t, deps, "admin", "secret123")

	adminHandler := NewAdminHandler(deps.AdminService)
	router := newAdminTestRouter(adminHandler)

	rec := postForm(router, "/login", map[string]string{
		"username": "admin",
		"password": "wrongpassword",
	})

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 for wrong password, got %d", rec.Code)
	}
}

func TestAdminLogin_UserNotFound(t *testing.T) {
	testutil.ResetStorage(t)
	deps, cleanup := testutil.SetupStorageDeps(t)
	t.Cleanup(cleanup)

	adminHandler := NewAdminHandler(deps.AdminService)
	router := newAdminTestRouter(adminHandler)

	rec := postForm(router, "/login", map[string]string{
		"username": "nonexistent",
		"password": "irrelevant",
	})

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 for nonexistent user, got %d", rec.Code)
	}
}

func TestAdminLogout_Success(t *testing.T) {
	testutil.ResetStorage(t)
	deps, cleanup := testutil.SetupStorageDeps(t)
	t.Cleanup(cleanup)

	seedAdmin(t, deps, "admin", "secret123")

	adminHandler := NewAdminHandler(deps.AdminService)

	loginRouter := newAdminTestRouter(adminHandler)
	rec := postForm(loginRouter, "/login", map[string]string{
		"username": "admin",
		"password": "secret123",
	})
	if rec.Code != http.StatusFound {
		t.Fatalf("login should succeed, got %d", rec.Code)
	}

	cookies := rec.Header().Values("Set-Cookie")
	if len(cookies) == 0 {
		t.Fatal("expected session cookie after login")
	}

	logoutRouter := adminTestRouterWithAuth(adminHandler)
	req := httptest.NewRequest(http.MethodPost, "/logout", nil)
	for _, c := range cookies {
		parts := strings.SplitN(c, ";", 2)
		req.Header.Add("Cookie", strings.TrimSpace(parts[0]))
	}
	logoutRec := httptest.NewRecorder()
	logoutRouter.ServeHTTP(logoutRec, req)

	if logoutRec.Code != http.StatusOK {
		t.Fatalf("expected 200 on logout success, got %d", logoutRec.Code)
	}
}
