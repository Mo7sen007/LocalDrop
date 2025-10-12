package cmd

import (
	"fmt"
	"os"
	"os/exec"
	"runtime"
	"strconv"
	"syscall"

	"github.com/Mo7sen007/LocalDrop/internal"
	"github.com/Mo7sen007/LocalDrop/internal/paths"
	"github.com/Mo7sen007/LocalDrop/internal/services/serverlog"
	"github.com/spf13/cobra"
)

var port string      //default :8080
var debug bool       //default false
var authEnabled bool // default false

var serveCmd = &cobra.Command{
	Use:   "start",
	Short: "Start the sharing server",
	Run: func(cmd *cobra.Command, args []string) {
		if debug {
			fmt.Println("Starting server in debug mode (foreground)...")
			startServer()
			return
		}

		execPath, err := os.Executable()
		if err != nil {
			fmt.Println("Failed to locate executable:", err)
			return
		}

		args = []string{"start", "--debug", "--port", port}
		if authEnabled {
			args = append(args, "--auth")
		}
		bgCmd := exec.Command(execPath, args...)

		if runtime.GOOS == "windows" {
			bgCmd.SysProcAttr = &syscall.SysProcAttr{
				HideWindow: true,
			}
		}

		bgCmd.Stdin = nil
		bgCmd.Stdout = nil
		bgCmd.Stderr = nil

		err = bgCmd.Start()
		if err != nil {
			fmt.Println("Failed to start server in background:", err)
			return
		}

		pid := bgCmd.Process.Pid

		pidFile, err := paths.GetPidFilePath()
		if err != nil {
			fmt.Printf("Could not get pid file path: %v\n", err)
			return
		}

		err = os.WriteFile(pidFile, []byte(strconv.Itoa(pid)), 0644)
		if err != nil {
			fmt.Println("Failed to write PID file:", err)
			return
		}

		fmt.Printf("LocalDrop server started in background with PID %d\n", pid)
		fmt.Printf("Server running on http://localhost:%s\n", port)
		fmt.Println("Use 'localdrop stop' to stop the server")
	},
}

func init() {
	rootCmd.AddCommand(serveCmd)
	serveCmd.Flags().StringVarP(&port, "port", "p", "8080", "Port to run the server on")
	serveCmd.Flags().BoolVarP(&debug, "debug", "d", false, "Run in debug mode (foreground with console output)")
	serveCmd.Flags().BoolVarP(&authEnabled, "auth", "a", false, "Enable admin authentication")
}

func startServer() {
	if err := paths.Initialize(); err != nil {
		fmt.Println("Failed to initialize storage:", err)
		return
	}

	if debug {
		fmt.Println("Storage initialized successfully")
		fmt.Printf("Starting server on port %s...\n", port)
		if authEnabled {
			fmt.Println("Admin authentication: ENABLED")
		} else {
			fmt.Println("Admin authentication: DISABLED")
		}
	}

	serverlog.InitLogToFile()
	defer serverlog.LogFile.Close()

	router := internal.NewServer(authEnabled)

	if debug {
		fmt.Printf("Server ready at http://localhost:%s\n", port)
		fmt.Println("Press Ctrl+C to stop")
	}

	err := router.Run(":" + port)
	if err != nil {
		fmt.Printf("Server failed to start: %v\n", err)
	}
}
