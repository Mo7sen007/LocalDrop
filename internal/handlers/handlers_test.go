package handlers

import (
	"net/http"
	"os"
	"testing"

	"github.com/Mo7sen007/LocalDrop/internal/middleware"
	"github.com/gin-contrib/sessions"
	"github.com/gin-contrib/sessions/cookie"
	"github.com/gin-gonic/gin"
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

func newTestRouter(authEnabled bool) *gin.Engine {
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

	group := router.Group("/")
	if authEnabled {
		group = router.Group("/", middleware.AuthMiddleware())
	}

	group.POST("/upload", UploadHandler)
	group.DELETE("/delete/file/:id", DeleteFileHandler)
	group.DELETE("/delete/folder/:id", DeleteFolderHandler)

	return router
}
