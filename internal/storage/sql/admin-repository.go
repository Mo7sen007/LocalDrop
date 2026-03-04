package storage

import (
	"database/sql"
	"fmt"
	"time"

	"github.com/Mo7sen007/LocalDrop/internal/models"
	"github.com/google/uuid"
)

func (r *SQLRepository) CreateAdmin(admin *models.Admin) error {
	if admin == nil {
		return fmt.Errorf("admin is nil")
	}
	if admin.Username == "" {
		return fmt.Errorf("admin username is required")
	}
	if admin.ID == uuid.Nil {
		admin.ID = uuid.New()
	}
	if admin.CreatedAt.IsZero() {
		admin.CreatedAt = time.Now()
	}

	query := `INSERT INTO admins (id, user_name, password, created_at) VALUES (?, ?, ?, ?)`
	ctx, err := r.db.Begin()
	if err != nil {
		return fmt.Errorf("create admin: %w", err)
	}
	defer func() { _ = ctx.Rollback() }()

	_, err = ctx.Exec(query, admin.ID.String(), admin.Username, admin.PasswordHash, admin.CreatedAt)
	if err != nil {
		return fmt.Errorf("create admin: %w", err)
	}

	return ctx.Commit()
}

func (r *SQLRepository) UpdateAdmin(admin *models.Admin) error {
	if admin == nil {
		return fmt.Errorf("admin is nil")
	}
	if admin.Username == "" {
		return fmt.Errorf("admin username is required")
	}

	query := `UPDATE admins SET password = ? WHERE user_name = ?`
	ctx, err := r.db.Begin()
	if err != nil {
		return fmt.Errorf("update admin: %w", err)
	}
	defer func() { _ = ctx.Rollback() }()

	res, err := ctx.Exec(query, admin.PasswordHash, admin.Username)
	if err != nil {
		return fmt.Errorf("update admin: %w", err)
	}
	affected, err := res.RowsAffected()
	if err == nil && affected == 0 {
		return sql.ErrNoRows
	}

	return ctx.Commit()
}

func (r *SQLRepository) DeleteAdminByUsername(username string) error {
	if username == "" {
		return fmt.Errorf("admin username is required")
	}

	query := `DELETE FROM admins WHERE user_name = ?`
	ctx, err := r.db.Begin()
	if err != nil {
		return fmt.Errorf("delete admin: %w", err)
	}
	defer func() { _ = ctx.Rollback() }()

	res, err := ctx.Exec(query, username)
	if err != nil {
		return fmt.Errorf("delete admin: %w", err)
	}
	affected, err := res.RowsAffected()
	if err == nil && affected == 0 {
		return sql.ErrNoRows
	}

	return ctx.Commit()
}

func (r *SQLRepository) GetAdminByUsername(username string) (*models.Admin, error) {
	if username == "" {
		return nil, fmt.Errorf("admin username is required")
	}

	var admin models.Admin
	var idStr string

	query := `SELECT id, user_name, password, created_at FROM admins WHERE user_name = ?`
	if err := r.db.QueryRow(query, username).Scan(&idStr, &admin.Username, &admin.PasswordHash, &admin.CreatedAt); err != nil {
		return nil, err
	}
	if idStr != "" {
		admin.ID = uuid.MustParse(idStr)
	}

	return &admin, nil
}

func (r *SQLRepository) GetAllAdmins() ([]models.Admin, error) {

	rows, err := r.db.Query(`SELECT id, user_name, password, created_at FROM admins ORDER BY created_at DESC`)
	if err != nil {
		return nil, fmt.Errorf("get all admins: %w", err)
	}
	defer rows.Close()

	var admins []models.Admin
	for rows.Next() {
		var admin models.Admin
		var idStr sql.NullString
		if err := rows.Scan(&idStr, &admin.Username, &admin.PasswordHash, &admin.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan admin: %w", err)
		}
		if idStr.Valid && idStr.String != "" {
			u, err := uuid.Parse(idStr.String)
			if err != nil {
				return nil, fmt.Errorf("parse admin id: %w", err)
			}
			admin.ID = u
		}
		admins = append(admins, admin)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("rows error: %w", err)
	}

	return admins, nil
}

func (r *SQLRepository) GetAdminByID(id uuid.UUID) (*models.Admin, error) {
	var admin models.Admin
	var idStr string

	query := `SELECT id, user_name, password, created_at FROM admins WHERE id = ?`
	if err := r.db.QueryRow(query, id.String()).Scan(&idStr, &admin.Username, &admin.PasswordHash, &admin.CreatedAt); err != nil {
		return nil, err
	}
	if idStr != "" {
		admin.ID = uuid.MustParse(idStr)
	}

	return &admin, nil
}
