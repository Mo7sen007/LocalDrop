package storage

import (
	"database/sql"

	"github.com/Mo7sen007/LocalDrop/internal/models"
	"github.com/google/uuid"
)

func (r *SQLRepository) CreateFile(file *models.File) error {
	query := `
		INSERT INTO files (id, folder_id, name, path, size, extension, mimetype, pin, mod_time, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`
	var folderID interface{}
	if file.FolderID != nil {
		folderID = file.FolderID.String()
	} else {

		folderID = r.RootFolderID
	}

	var pin interface{}
	if file.Pin != nil {
		pin = *file.Pin
	} else {
		pin = nil
	}

	tx, err := r.db.Begin()
	if err != nil {
		return err
	}

	_, err = tx.Exec(query,
		file.ID.String(),
		folderID,
		file.Name,
		file.Path,
		file.Size,
		file.Extension,
		file.MIMEType,
		pin,
		file.ModTime,
		file.CreatedAt,
	)
	if err != nil {
		_ = tx.Rollback()
		return err
	}

	_, err = tx.Exec(`UPDATE folders SET size = size + ? WHERE id = ?`, file.Size, folderID)
	if err != nil {
		_ = tx.Rollback()
		return err
	}

	return tx.Commit()
}

func (r *SQLRepository) GetFileByID(fileId uuid.UUID) (*models.File, error) {
	var file models.File
	var folderIDStr sql.NullString
	var pin sql.NullString

	query := `SELECT id, folder_id, name, path, size, extension, mimetype, pin, mod_time, created_at FROM files WHERE id = ?`

	err := r.db.QueryRow(query, fileId.String()).Scan(
		&file.ID, &folderIDStr, &file.Name, &file.Path, &file.Size, &file.Extension, &file.MIMEType, &pin, &file.ModTime, &file.CreatedAt,
	)
	if err != nil {
		return nil, err
	}

	if folderIDStr.Valid {
		parsedID := uuid.MustParse(folderIDStr.String)
		file.FolderID = &parsedID
	}

	if pin.Valid {
		file.Pin = &pin.String
	}

	return &file, nil
}

func (r *SQLRepository) DeleteFile(fileId uuid.UUID) error {
	tx, err := r.db.Begin()
	if err != nil {
		return err
	}

	var folderIDStr sql.NullString
	var size int64
	err = tx.QueryRow(`SELECT folder_id, size FROM files WHERE id = ?`, fileId.String()).Scan(&folderIDStr, &size)
	if err != nil {
		_ = tx.Rollback()
		return err
	}

	folderID := r.RootFolderID
	if folderIDStr.Valid {
		folderID = folderIDStr.String
	}

	_, err = tx.Exec("DELETE FROM files WHERE id = ?", fileId.String())
	if err != nil {
		_ = tx.Rollback()
		return err
	}

	_, err = tx.Exec(`UPDATE folders SET size = size - ? WHERE id = ?`, size, folderID)
	if err != nil {
		_ = tx.Rollback()
		return err
	}

	return tx.Commit()
}

func (r *SQLRepository) GetAllFiles() ([]*models.File, error) {
	rows, err := r.db.Query(`SELECT id, folder_id, name, path, size, extension, mimetype, pin, mod_time, created_at FROM files`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var files []*models.File
	for rows.Next() {
		var file models.File
		var folderIDStr sql.NullString
		var pin sql.NullString
		if err := rows.Scan(&file.ID, &folderIDStr, &file.Name, &file.Path, &file.Size, &file.Extension, &file.MIMEType, &pin, &file.ModTime, &file.CreatedAt); err != nil {
			return nil, err
		}
		if folderIDStr.Valid {
			parsedID := uuid.MustParse(folderIDStr.String)
			file.FolderID = &parsedID
		}
		if pin.Valid {
			file.Pin = &pin.String
		}
		files = append(files, &file)
	}
	return files, nil
}

func (r *SQLRepository) UpdateFile(fileID uuid.UUID, newFile models.File) error {
	query := `UPDATE files SET name = ?, path = ?, folder_id = ?, pin = ? WHERE id = ?`

	var folderID interface{}
	if newFile.FolderID != nil {
		folderID = newFile.FolderID.String()
	} else {
		folderID = r.RootFolderID
	}

	var pin interface{}
	if newFile.Pin != nil {
		pin = *newFile.Pin
	} else {
		pin = nil
	}

	_, err := r.db.Exec(query, newFile.Name, newFile.Path, folderID, pin, fileID.String())
	return err
}
