package cmd

import (
	"fmt"
	"os"

	"github.com/spf13/cobra"
)

var (
	Version   = "2.0.0"
	BuildDate = "2025-10-12"
)

var rootCmd = &cobra.Command{
	Use:   "localdrop",
	Short: "localdrop is a simple local file sharing server",
	Long:  `A simple file sharing app built with Go and Gin for quick local file shareing.`,
	Run: func(cmd *cobra.Command, args []string) {

		fmt.Println("Use the 'help' command for help.")
	},
}

func Execute() {
	if err := rootCmd.Execute(); err != nil {
		fmt.Println(err)
		os.Exit(1)
	}
}
