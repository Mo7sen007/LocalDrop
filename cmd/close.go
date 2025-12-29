package cmd

import (
	"fmt"
	"os"
	"strconv"
	"strings"

	"github.com/Mo7sen007/LocalDrop/internal/paths"
	"github.com/spf13/cobra"
)

var closeCmd = &cobra.Command{
	Use:   "stop",
	Short: "Stop the background server",
	Run: func(cmd *cobra.Command, args []string) {
		pidFilePath, err := paths.GetPidFilePath()
		if err != nil {
			fmt.Printf("Could not get PID file path: %v\n", err)
			return
		}

		pidData, err := os.ReadFile(pidFilePath)
		if err != nil {
			fmt.Println("No running server found")
			return
		}

		parts := strings.Split(strings.TrimSpace(string(pidData)), ":")
		if len(parts) == 0 {
			fmt.Println("Invalid PID file")
			os.Remove(pidFilePath)
			return
		}

		pid, err := strconv.Atoi(parts[0])
		if err != nil {
			fmt.Println("Invalid PID in file:", err)
			os.Remove(pidFilePath)
			return
		}

		serverPort := "8080"
		if len(parts) > 1 {
			serverPort = parts[1]
		}

		process, err := os.FindProcess(pid)
		if err != nil {
			fmt.Printf("Process with PID %d not found\n", pid)
			os.Remove(pidFilePath)
			return
		}

		if err := process.Kill(); err != nil {
			fmt.Printf("Failed to stop server (PID %d): %v\n", pid, err)
			fmt.Println("The process may have already stopped")
			os.Remove(pidFilePath)
			return
		}

		os.Remove(pidFilePath)
		fmt.Printf("LocalDrop server stopped successfully (PID %d, port %s)\n", pid, serverPort)
	},
}

func init() {
	rootCmd.AddCommand(closeCmd)
}
