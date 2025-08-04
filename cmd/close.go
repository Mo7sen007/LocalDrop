package cmd

import (
	"fmt"
	"os"
	"strconv"

	"github.com/spf13/cobra"
)

var closeCmd = &cobra.Command{
	Use:   "stop",
	Short: "Stop the background server",
	Run: func(cmd *cobra.Command, args []string) {
		pidData, err := os.ReadFile("fileshare.pid")
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

		// Kill the process
		if err := process.Kill(); err != nil {
			fmt.Println("Failed to stop server:", err)
			return
		}

		os.Remove("fileshare.pid")
		fmt.Println("Fileshare server stopped")
	},
}

func init() {
	rootCmd.AddCommand(closeCmd)
}
