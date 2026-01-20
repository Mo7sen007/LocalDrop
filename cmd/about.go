package cmd

import (
	"fmt"

	"github.com/spf13/cobra"
)

var aboutCmd = &cobra.Command{
	Use:   "about",
	Short: "About this tool",
	Run: func(cmd *cobra.Command, args []string) {
		fmt.Println(` _                     _______                 
| |                   | |  _  \                
| |     ___   ___ __ _| | | | |_ __ ___  _ __  
| |    / _ \ / __/ _` + "`" + ` | | | | | '__/ _ \| '_ \ 
| |___| (_) | (_| (_| | | |/ /| | | (_) | |_) |
\_____/ \___/ \___\__,_|_|___/ |_|  \___/| .__/ 
                                        | |    
                                        |_|    

localdrop is a lightweight CLI tool to start and stop a local file sharing server.

Usage:
  localdrop [command]

Available Commands:
  start       Start the server in the background
  stop      Stop the background server
  help        Show help for any command`)
	},
}

func init() {
	rootCmd.AddCommand(aboutCmd)
}
