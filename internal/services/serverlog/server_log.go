package serverlog

import (
	"log"
	"os"
)

var LogFile *os.File

func InitLogToFile() {
	var err error
	LogFile, err = os.OpenFile("localdrop.log", os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0644)
	if err != nil {
		log.Fatal("Failed to open log file:", err)
	}

	log.SetOutput(LogFile) // all logs now go to the file
	log.Println("Server started")
}
