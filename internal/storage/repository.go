package storage

import (
	"database/sql"

	"github.com/Mo7sen007/LocalDrop/internal/models"
	"github.com/google/uuid"
)

// --- Folder Operations ---

func CreateFolder(folder *models.Folder) error {
	query := `
        INSERT INTO folders (id, name, pin_code, created_at, size, parent_id)
        VALUES (?, ?, ?, ?, ?, ?)
    `

	var parentID interface{}
	if folder.ParentID != nil {
		parentID = folder.ParentID.String()
	}

	_, err := DB.Exec(query, folder.ID.String(), folder.Name, folder.PinCode, folder.CreatedAt, folder.Size, parentID)
	return err
}

func GetFolderByNameAndParent(name string, parentID *uuid.UUID) (*models.Folder, error) {
	var folder models.Folder
	var pinCode sql.NullString
	var parentIDStr sql.NullString

	query := `SELECT id, name, pin_code, created_at, size, parent_id FROM folders WHERE name = ? AND `
	var args []interface{}
	args = append(args, name)

	if parentID == nil {
		query += `parent_id IS NULL`
	} else {
		query += `parent_id = ?`
		args = append(args, parentID.String())
	}

	err := DB.QueryRow(query, args...).Scan(
		&folder.ID, &folder.Name, &pinCode, &folder.CreatedAt, &folder.Size, &parentIDStr,
	)
	if err != nil {
		return nil, err
	}

	if parentIDStr.Valid {
		parsedID := uuid.MustParse(parentIDStr.String)
		folder.ParentID = &parsedID
	}
	if pinCode.Valid {
		folder.PinCode = &pinCode.String
	}

	return &folder, nil
}

func GetFolder(folderId uuid.UUID) (*models.Folder, error) {
	var folder models.Folder
	var parentIDStr sql.NullString
	var pinCode sql.NullString

	query := `SELECT id, name, pin_code, created_at, size, parent_id FROM folders WHERE id = ?`

	err := DB.QueryRow(query, folderId.String()).Scan(
		&folder.ID, &folder.Name, &pinCode, &folder.CreatedAt, &folder.Size, &parentIDStr,
	)
	if err != nil {
		return nil, err
	}

	if parentIDStr.Valid {
		parsedID := uuid.MustParse(parentIDStr.String)
		folder.ParentID = &parsedID
	}
	if pinCode.Valid {
		folder.PinCode = &pinCode.String
	}

	folder.SubFolder, err = getSubFolders(folderId)
	if err != nil {
		return nil, err
	}
	folder.Files, err = getFolderFiles(folderId)
	if err != nil {
		return nil, err
	}

	return &folder, nil
}

func DeleteFolder(folderId uuid.UUID) error {
	// Because of ON DELETE CASCADE in schema, this deletes all sub-content automatically
	_, err := DB.Exec("DELETE FROM folders WHERE id = ?", folderId.String())
	return err
}

// Helper to get subfolders
func getSubFolders(parentID uuid.UUID) ([]models.Folder, error) {
	rows, err := DB.Query(`SELECT id, name, pin_code, created_at, size FROM folders WHERE parent_id = ?`, parentID.String())
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var folders []models.Folder
	for rows.Next() {
		var folder models.Folder
		var pinCode sql.NullString
		if err := rows.Scan(&folder.ID, &folder.Name, &pinCode, &folder.CreatedAt, &folder.Size); err != nil {
			return nil, err
		}
		if pinCode.Valid {
			folder.PinCode = &pinCode.String
		}
		folders = append(folders, folder)
	}
	return folders, nil
}

// Helper to get files in a folder
func getFolderFiles(folderID uuid.UUID) ([]models.File, error) {
	rows, err := DB.Query(`
        SELECT id, folder_id, name, path, size, extension, mimetype, mod_time, created_at 
        FROM files WHERE folder_id = ?`, folderID.String())
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var files []models.File
	for rows.Next() {
		var file models.File
		var folderIDStr sql.NullString
		if err := rows.Scan(&file.ID, &folderIDStr, &file.Name, &file.Path, &file.Size, &file.Extension, &file.MIMEType, &file.ModTime, &file.CreatedAt); err != nil {
			return nil, err
		}
		if folderIDStr.Valid {
			parsedID := uuid.MustParse(folderIDStr.String)
			file.FolderID = &parsedID
		}
		files = append(files, file)
	}
	return files, nil
}

// --- File Operations ---

func CreateFile(file *models.File) error {
	query := `
		INSERT INTO files (id, folder_id, name, path, size, extension, mimetype, mod_time, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
	`
	var folderID interface{}
	if file.FolderID != nil {
		folderID = file.FolderID.String()
	}

	_, err := DB.Exec(query,
		file.ID.String(),
		folderID,
		file.Name,
		file.Path,
		file.Size,
		file.Extension,
		file.MIMEType,
		file.ModTime,
		file.CreatedAt,
	)
	return err
}

func GetFile(fileId uuid.UUID) (*models.File, error) {
	var file models.File
	var folderIDStr sql.NullString

	query := `SELECT id, folder_id, name, path, size, extension, mimetype, mod_time, created_at FROM files WHERE id = ?`

	err := DB.QueryRow(query, fileId.String()).Scan(
		&file.ID, &folderIDStr, &file.Name, &file.Path, &file.Size, &file.Extension, &file.MIMEType, &file.ModTime, &file.CreatedAt,
	)
	if err != nil {
		return nil, err
	}

	if folderIDStr.Valid {
		parsedID := uuid.MustParse(folderIDStr.String)
		file.FolderID = &parsedID
	}

	return &file, nil
}

func DeleteFile(fileId uuid.UUID) error {
	_, err := DB.Exec("DELETE FROM files WHERE id = ?", fileId.String())
	return err
}

func GetAllFiles() ([]models.File, error) {
	rows, err := DB.Query(`SELECT id, folder_id, name, path, size, extension, mimetype, mod_time, created_at FROM files`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var files []models.File
	for rows.Next() {
		var file models.File
		var folderIDStr sql.NullString
		if err := rows.Scan(&file.ID, &folderIDStr, &file.Name, &file.Path, &file.Size, &file.Extension, &file.MIMEType, &file.ModTime, &file.CreatedAt); err != nil {
			return nil, err
		}
		if folderIDStr.Valid {
			parsedID := uuid.MustParse(folderIDStr.String)
			file.FolderID = &parsedID
		}
		files = append(files, file)
	}
	return files, nil
}

// --- Root Operations ---

func GetRootFolders() ([]models.Folder, error) {
	rows, err := DB.Query(`SELECT id, name, pin_code, created_at, size FROM folders WHERE parent_id IS NULL`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var folders []models.Folder
	for rows.Next() {
		var folder models.Folder
		var pinCode sql.NullString
		if err := rows.Scan(&folder.ID, &folder.Name, &pinCode, &folder.CreatedAt, &folder.Size); err != nil {
			return nil, err
		}
		if pinCode.Valid {
			folder.PinCode = &pinCode.String
		}
		folders = append(folders, folder)
	}
	return folders, nil
}

func GetRootFiles() ([]models.File, error) {
	rows, err := DB.Query(`
        SELECT id, folder_id, name, path, size, extension, mimetype, mod_time, created_at 
        FROM files WHERE folder_id IS NULL`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var files []models.File
	for rows.Next() {
		var file models.File
		var folderIDStr sql.NullString
		if err := rows.Scan(&file.ID, &folderIDStr, &file.Name, &file.Path, &file.Size, &file.Extension, &file.MIMEType, &file.ModTime, &file.CreatedAt); err != nil {
			return nil, err
		}
		if folderIDStr.Valid {
			parsedID := uuid.MustParse(folderIDStr.String)
			file.FolderID = &parsedID
		}
		files = append(files, file)
	}
	return files, nil
}

func GetRoot() (*models.Folder, error) {
	subFolders, err := GetRootFolders()
	if err != nil {
		return nil, err
	}

	files, err := GetRootFiles()
	if err != nil {
		return nil, err
	}

	return &models.Folder{
		ID:        uuid.Nil, // Virtual ID for Root
		Name:      "Root",
		SubFolder: subFolders,
		Files:     files,
	}, nil
}
