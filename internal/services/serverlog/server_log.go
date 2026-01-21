package serverlog

import (
	"fmt"
	"io"
	"log"
	"os"
	"path/filepath"
	"strings"
)

var LogFile *os.File

type Level int

const (
	Debug Level = iota
	Info
	Warn
	Error
)

var minLevel = Info

func parseLevel(level string) Level {
	switch strings.ToLower(strings.TrimSpace(level)) {
	case "debug":
		return Debug
	case "info":
		return Info
	case "warn", "warning":
		return Warn
	case "error":
		return Error
	default:
		return Info
	}
}

func SetLevel(level string) {
	minLevel = parseLevel(level)
}

func logf(level Level, label string, format string, args ...any) {
	if level < minLevel {
		return
	}
	log.Printf("[%s] %s", label, fmt.Sprintf(format, args...))
}

func Debugf(format string, args ...any) { logf(Debug, "DEBUG", format, args...) }
func Infof(format string, args ...any)  { logf(Info, "INFO", format, args...) }
func Warnf(format string, args ...any)  { logf(Warn, "WARN", format, args...) }
func Errorf(format string, args ...any) { logf(Error, "ERROR", format, args...) }

func InitLogToFile(enabled bool, level string) error {
	SetLevel(level)
	if !enabled {
		log.SetOutput(io.Discard)
		return nil
	}

	configDir, err := os.UserConfigDir()
	if err != nil {
		return err
	}

	logDir := filepath.Join(configDir, "localdrop", "logs")
	if err := os.MkdirAll(logDir, 0755); err != nil {
		return err
	}

	logPath := filepath.Join(logDir, "localdrop.log")

	LogFile, err = os.OpenFile(logPath, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0644)
	if err != nil {
		return err
	}

	log.SetOutput(LogFile)
	Infof("Server started")
	return nil
}

func Close() {
	if LogFile != nil {
		_ = LogFile.Close()
	}
}
