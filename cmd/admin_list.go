package cmd

import (
	"fmt"
	"time"

	"github.com/Mo7sen007/LocalDrop/internal/paths"
	"github.com/Mo7sen007/LocalDrop/internal/storage"
	"github.com/spf13/cobra"
)

var listAdmin = &cobra.Command{
	Use:   "listadmin",
	Short: "List admins",
	Long:  "Prints the list of admins with their information",
	Run: func(cmd *cobra.Command, args []string) {
		if err := printAdminList(); err != nil {
			fmt.Println("Error reading admin list:", err)
			return
		}
	},
}

func printAdminList() error {
	path, err := paths.GetAdminFilePath()
	if err != nil {
		return fmt.Errorf("could not get admin list file path")
	}
	adminList, err := storage.LoadAdminList(path)
	if err != nil {
		return err
	}

	if len(adminList) == 0 {
		fmt.Println("No admins found.")
		return nil
	}

	fmt.Println("=== Admin List ===")
	for i, admin := range adminList {
		fmt.Printf("%d. ID: %s\n", i+1, admin.ID)
		fmt.Printf("   Username: %s\n", admin.Username)
		fmt.Printf("   Created At: %s\n", admin.CreatedAt.Format(time.RFC3339))
		fmt.Println("-----------------------")
	}

	return nil
}
func init() {
	rootCmd.AddCommand(listAdmin)
}
