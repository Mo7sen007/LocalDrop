package cmd

import (
	"fmt"
	"time"

	"github.com/Mo7sen007/LocalDrop/internal/models"
	"github.com/Mo7sen007/LocalDrop/internal/storage"
	"github.com/google/uuid"
	"github.com/spf13/cobra"
	"golang.org/x/crypto/bcrypt"
)

var addAdminCmd = &cobra.Command{
	Use:   "addadmin",
	Short: "Add a new admin user",
	Long:  "Add a new admin user to the LocalDrop server with a username and password.",
	Run: func(cmd *cobra.Command, args []string) {
		if err := addAdmin(); err != nil {
			fmt.Println("Error adding admin:", err)
			return
		}
		fmt.Println("Admin user added successfully!")
	},
}

func init() {
	rootCmd.AddCommand(addAdminCmd)
}

func addAdmin() error {
	var userName string
	var password string
	var path string = "internal/storage/adminList.json" // Use / instead of \ for cross-platform

	fmt.Print("Enter the username: ")
	_, err := fmt.Scanln(&userName)
	if err != nil {
		return fmt.Errorf("input error: %w", err)
	}

	fmt.Print("Enter the password: ")
	_, err = fmt.Scanln(&password)
	if err != nil {
		return fmt.Errorf("input error: %w", err)
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("can't generate hash: %w", err)
	}

	newAdmin := models.Admin{
		ID:           uuid.New(),
		Username:     userName,
		PasswordHash: string(hash),
		CreatedAt:    time.Now(),
	}

	// Update the JSON file
	if err := storage.UpdateAdmin(newAdmin, path); err != nil {
		return fmt.Errorf("failed to update admin list: %w", err)
	}

	return nil
}
