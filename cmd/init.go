package cmd

import (
	"bufio"
	"errors"
	"fmt"
	"io"
	"os"
	"strings"
	"time"

	"github.com/Mo7sen007/LocalDrop/internal/config"
	"github.com/Mo7sen007/LocalDrop/internal/models"
	"github.com/Mo7sen007/LocalDrop/internal/paths"
	"github.com/Mo7sen007/LocalDrop/internal/services/serverlog"
	"github.com/Mo7sen007/LocalDrop/internal/storage"
	"github.com/google/uuid"
	"github.com/spf13/cobra"
	"golang.org/x/crypto/bcrypt"
)

var initCmd = &cobra.Command{
	Use:   "init",
	Short: "Initialize LocalDrop storage and admin",
	Run: func(cmd *cobra.Command, args []string) {
		if err := runInit(); err != nil {
			fmt.Println("Init failed:", err)
			return
		}
		fmt.Println("Initialization complete.")
	},
}

func init() {
	rootCmd.AddCommand(initCmd)
}

func runInit() error {
	if err := paths.Initialize(); err != nil {
		serverlog.Errorf("failed to initialize paths: %v", err)
		return fmt.Errorf("failed to initialize paths: %w", err)
	}

	if err := storage.Init(); err != nil {
		serverlog.Errorf("failed to initialize storage: %v", err)
		return fmt.Errorf("failed to initialize storage: %w", err)
	}

	if _, err := config.GetConfig(); err != nil {
		serverlog.Errorf("failed to load config: %v", err)
		return fmt.Errorf("failed to load config: %w", err)
	}

	admins, err := storage.GetAllAdmins()
	if err != nil {
		serverlog.Errorf("failed to read admins: %v", err)
		return fmt.Errorf("failed to read admins: %w", err)
	}

	if len(admins) > 0 {
		serverlog.Infof("Admin already exists. Skipping admin creation.")
		fmt.Println("Admin already exists. Skipping admin creation.")
		return nil
	}

	reader := bufio.NewReader(os.Stdin)
	fmt.Print("Create admin account now? (y/N): ")
	choice, err := readLine(reader)
	if err != nil {
		return err
	}
	choice = strings.ToLower(strings.TrimSpace(choice))
	if choice != "y" && choice != "yes" {
		fmt.Println("Skipping admin creation.")
		return nil
	}

	userName, err := promptNonEmpty(reader, "Enter the username: ")
	if err != nil {
		return err
	}

	password, err := promptNonEmpty(reader, "Enter the password: ")
	if err != nil {
		return err
	}

	confirm, err := promptNonEmpty(reader, "Confirm the password: ")
	if err != nil {
		return err
	}
	if password != confirm {
		return fmt.Errorf("passwords do not match")
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

	if err := storage.CreateAdmin(&newAdmin); err != nil {
		return fmt.Errorf("failed to create admin: %w", err)
	}

	fmt.Println("Admin user created successfully!")
	return nil
}

func readLine(reader *bufio.Reader) (string, error) {
	input, err := reader.ReadString('\n')
	if err != nil && !errors.Is(err, io.EOF) {
		return "", err
	}
	return strings.TrimSpace(input), nil
}

func promptNonEmpty(reader *bufio.Reader, prompt string) (string, error) {
	for {
		fmt.Print(prompt)
		value, err := readLine(reader)
		if err != nil {
			return "", err
		}
		if strings.TrimSpace(value) != "" {
			return value, nil
		}
		fmt.Println("Value cannot be empty.")
	}
}
