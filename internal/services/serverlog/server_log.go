package serverlog

import (
	"log"
	"os"
	"path/filepath"
)

var LogFile *os.File

func InitLogToFile() {
	configDir, err := os.UserConfigDir()
	if err != nil {
		log.Fatal("Failed to get config directory:", err)
	}

	logDir := filepath.Join(configDir, "localdrop", "logs")
	if err := os.MkdirAll(logDir, 0755); err != nil {
		log.Fatal("Failed to create log directory:", err)
	}

	logPath := filepath.Join(logDir, "localdrop.log")

	LogFile, err = os.OpenFile(logPath, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0644)
	if err != nil {
		log.Fatal("Failed to open log file:", err)
	}

	log.SetOutput(LogFile)
	log.Println("Server started")
}
