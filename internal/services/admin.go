package services

import (
	"errors"
	"fmt"

	"github.com/Mo7sen007/LocalDrop/internal/storage"
	"golang.org/x/crypto/bcrypt"
)

var (
	ErrUserNotFound  = errors.New("user not found")
	ErrWrongPassword = errors.New("wrong password")
)

func AuthAdmin(userName, plainPassword, path string) (bool, error) {

	admin, err := storage.GetAdminByUsername(userName)
	if err != nil {
		return false, fmt.Errorf("faild to get admin:%w", err)
	}

	err = bcrypt.CompareHashAndPassword([]byte(admin.PasswordHash), []byte(plainPassword))
	if err == nil {
		return true, nil
	}
	return false, ErrWrongPassword
}
