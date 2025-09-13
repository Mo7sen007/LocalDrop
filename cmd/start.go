package cmd

import (
	"fmt"
	"os"
	"os/exec"
	"runtime"
	"strconv"
	"syscall"

	"github.com/Mo7sen007/LocalDrop/internal"
	"github.com/spf13/cobra"
)

var port string
var background bool
var authEnabled bool // default false

var serveCmd = &cobra.Command{
	Use:   "start",
	Short: "Start the sharing server",
	Run: func(cmd *cobra.Command, args []string) {
		if background {
			startServer()
			return
		}

		execPath, err := os.Executable()
		if err != nil {
			fmt.Println("Failed to locate executable:", err)
			return
		}

		// build args for background run
		args = []string{"start", "--background", "--port", port}
		if authEnabled {
			args = append(args, "--auth")
		}
		bgCmd := exec.Command(execPath, args...)

		if runtime.GOOS == "windows" {
			bgCmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
		}

		err = bgCmd.Start()
		if err != nil {
			fmt.Println("Failed to start server in background:", err)
			return
		}

		pid := bgCmd.Process.Pid
		pidFile := "fileshare.pid"
		err = os.WriteFile(pidFile, []byte(strconv.Itoa(pid)), 0644)
		if err != nil {
			fmt.Println("Failed to write PID file:", err)
		}

		fmt.Println("Fileshare server started in background with PID", pid)
	},
}

func init() {
	rootCmd.AddCommand(serveCmd)
	serveCmd.Flags().StringVarP(&port, "port", "p", "8080", "Port to run the server on")
	serveCmd.Flags().BoolVar(&background, "background", false, "Run in background")
	serveCmd.Flags().BoolVar(&authEnabled, "auth", false, "Enable admin authentication")
}

func startServer() {
	router := internal.NewServer(authEnabled)
	err := router.Run(":" + port)
	if err != nil {
		fmt.Println("Server failed to start:", err)
	}
}
