package cmd

import (
	"fmt"
	"os"
	"strconv"

	"github.com/Mo7sen007/LocalDrop/internal/paths"
	"github.com/spf13/cobra"
)

var closeCmd = &cobra.Command{
	Use:   "stop",
	Short: "Stop the background server",
	Run: func(cmd *cobra.Command, args []string) {
		pidFilePath, err := paths.GetPidFilePath()
		if err != nil {
			fmt.Printf("Could not find file path %v", err)
			return
		}
		pidData, err := os.ReadFile(pidFilePath)
		if err != nil {
			fmt.Println("Could not read PID file. Is the server running?")
			return
		}

		pid, err := strconv.Atoi(string(pidData))
		if err != nil {
			fmt.Println("Invalid PID in file:", err)
			return
		}

		process, err := os.FindProcess(pid)
		if err != nil {
			fmt.Println("Failed to find process:", err)
			return
		}

		if err := process.Kill(); err != nil {
			fmt.Println("Failed to stop server:", err)
			return
		}

		os.Remove(pidFilePath)
		fmt.Println("Fileshare server stopped")
	},
}

func init() {
	rootCmd.AddCommand(closeCmd)
}
