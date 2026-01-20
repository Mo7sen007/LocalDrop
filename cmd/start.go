package cmd

import (
	"fmt"
	"net"
	"os"
	"os/exec"
	"strconv"
	"strings"

	"github.com/Mo7sen007/LocalDrop/internal"
	"github.com/Mo7sen007/LocalDrop/internal/paths"
	"github.com/Mo7sen007/LocalDrop/internal/services/serverlog"
	"github.com/spf13/cobra"
)

var port int         //default :8080
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
		//temp, must be changed!
		pidFile, err := paths.GetPidFilePath()
		if err != nil {
			fmt.Printf("Could not get pid file path: %v\n", err)
			return
		}

		if isServerRunning(pidFile) {
			fmt.Println("LocalDrop server is already running!")
			fmt.Println("Use 'localdrop stop' to stop it first")
			return
		}

		if isPortInUse(strconv.Itoa(port)) {
			fmt.Printf("Port %d is already in use by another application.\n", port)
			fmt.Println("Choose a different port with --port flag")
			return
		}

		execPath, err := os.Executable()
		if err != nil {
			fmt.Println("Failed to locate executable:", err)
			return
		}

		args = []string{"start", "--debug", "--port", strconv.Itoa(port)}
		if authEnabled {
			args = append(args, "--auth")
		}
		bgCmd := exec.Command(execPath, args...)

		setProcAttributes(bgCmd)

		bgCmd.Stdin = nil
		bgCmd.Stdout = nil
		bgCmd.Stderr = nil

		err = bgCmd.Start()
		if err != nil {
			fmt.Println("Failed to start server in background:", err)
			return
		}

		pid := bgCmd.Process.Pid

		pidInfo := fmt.Sprintf("%d:%d", pid, port)
		err = os.WriteFile(pidFile, []byte(pidInfo), 0644)
		if err != nil {
			fmt.Println("Failed to write PID file:", err)
			return
		}

		fmt.Printf("LocalDrop server started in background with PID %d\n", pid)
		fmt.Printf("Server running on http://localhost:%d\n", port)
		fmt.Println("Use 'localdrop stop' to stop the server")
	},
}

func init() {
	rootCmd.AddCommand(serveCmd)
	serveCmd.Flags().IntVarP(&port, "port", "p", 8080, "Port to run the server on")
	serveCmd.Flags().BoolVarP(&debug, "debug", "d", false, "Run in debug mode (foreground with console output)")
	serveCmd.Flags().BoolVarP(&authEnabled, "auth", "a", false, "Enable admin authentication")
}

func isServerRunning(pidFile string) bool {
	pidData, err := os.ReadFile(pidFile)
	if err != nil {
		return false
	}

	parts := strings.Split(strings.TrimSpace(string(pidData)), ":")
	if len(parts) == 0 {
		os.Remove(pidFile)
		return false
	}

	pid, err := strconv.Atoi(parts[0])
	if err != nil {
		os.Remove(pidFile)
		return false
	}

	if !isProcessRunning(pid) {
		os.Remove(pidFile)
		return false
	}

	return true
}

func isPortInUse(port string) bool {
	ln, err := net.Listen("tcp", ":"+port)
	if err != nil {
		return true
	}
	ln.Close()
	return false
}

func startServer() {
	if err := paths.Initialize(); err != nil {
		fmt.Println("Failed to initialize storage:", err)
		return
	}

	if debug {
		fmt.Println("Storage initialized successfully")
		fmt.Printf("Starting server on port %d...\n", port)
		if authEnabled {
			fmt.Println("Admin authentication: ENABLED")
		} else {
			fmt.Println("Admin authentication: DISABLED")
		}
	}

	serverlog.InitLogToFile()
	defer serverlog.LogFile.Close()

	server := internal.NewServer(port, authEnabled, "full")
	if err := server.Init(); err != nil {
		fmt.Printf("Failed to initialize server: %v\n", err)
		return
	}

	//router, mdnsServer := internal.NewServer(authEnabled)
	//mdnsServer.Shutdown()

	if debug {
		fmt.Printf("Server ready at http://localhost:%d\n", port)
		fmt.Println("Press Ctrl+C to stop")
	}

	if err := server.Start(); err != nil {
		fmt.Printf("Server failed to start: %v\n", err)
	}
	//err := server.router.Run(":" + port)
	//if err != nil {
	//fmt.Printf("Server failed to start: %v\n", err)
	//}
}
