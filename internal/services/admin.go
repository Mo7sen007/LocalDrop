package services

import (
	"errors"
	"fmt"

	"github.com/Mo7sen007/LocalDrop/internal/storage"
	"golang.org/x/crypto/bcrypt"
)

type AdminService struct {
	repo storage.AdminRepository
}

func NewAdminService(repo storage.AdminRepository) *AdminService {
	return &AdminService{repo: repo}
}

var (
	ErrUserNotFound  = errors.New("user not found")
	ErrWrongPassword = errors.New("wrong password")
)

func (s *AdminService) AuthAdmin(userName, plainPassword, path string) (bool, error) {

	admin, err := s.repo.GetAdminByUsername(userName)
	if err != nil {
		return false, fmt.Errorf("faild to get admin:%w", err)
	}

	err = bcrypt.CompareHashAndPassword([]byte(admin.PasswordHash), []byte(plainPassword))
	if err == nil {
		return true, nil
	}
	return false, ErrWrongPassword
}
