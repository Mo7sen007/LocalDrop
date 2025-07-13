package main

import (
	"fileshare/internal/handlers"
	"fileshare/internal/storage"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
)

func main() {
	_, err := storage.InitializeListOfFiles()
	if err != nil {
		fmt.Println("Could not initialize file list:", err)
	}

	router := gin.Default()
	router.Static("/static", "./static")
	router.MaxMultipartMemory = 8 << 20 // 8 MiB

	router.GET("/", func(c *gin.Context) {
		c.File("./static/index.html")
	})

	router.GET("/download.html", func(c *gin.Context) {
		c.File("./static/download.html")
	})

	router.GET("/listOfFiles", func(c *gin.Context) {
		listOfFiles, err := storage.LoadFiles()
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err})
		}
		c.JSON(http.StatusOK, listOfFiles)
	})

	router.POST("/upload", handlers.UploadFileHandler)

	router.GET("/download/:id", handlers.DownloadFileHandler)

	router.GET("delete/:id", handlers.DeleteFileHandler)

	router.Run(":8080")
}
