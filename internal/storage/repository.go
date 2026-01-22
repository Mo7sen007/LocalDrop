package storage

import (
	"database/sql"

	"github.com/Mo7sen007/LocalDrop/internal/models"
	"github.com/google/uuid"
)

const RootFolderID = "00000000-0000-0000-0000-000000000000"

// --- Folder Operations ---

func CreateFolder(folder *models.Folder) error {
	tx, err := DB.Begin()
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	query := `
        INSERT INTO folders (id, name, path, pin_code, created_at, size, parent_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `

	parentID := RootFolderID
	if folder.ParentID != nil {
		parentID = folder.ParentID.String()
	}

	var pin interface{}
	if folder.PinCode != nil {
		pin = *folder.PinCode
	} else {
		pin = nil
	}

	if _, err := tx.Exec(
		query,
		folder.ID.String(),
		folder.Name,
		folder.Path,
		pin,
		folder.CreatedAt,
		folder.Size,
		parentID,
	); err != nil {
		return err
	}

	return tx.Commit()
}

func UpdateFolder(newFolder models.Folder, folderID uuid.UUID) error {
	tx, err := DB.Begin()
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	query := `
        UPDATE folders
        SET name = ?, path = ?, pin_code = ?, created_at = ?, size = ?, parent_id = ?
        WHERE id = ?
    `

	parentID := RootFolderID
	if newFolder.ParentID != nil {
		parentID = newFolder.ParentID.String()
	}

	var pin interface{}
	if newFolder.PinCode != nil {
		pin = *newFolder.PinCode
	} else {
		pin = nil
	}

	if _, err := tx.Exec(
		query,
		newFolder.Name,
		newFolder.Path,
		pin,
		newFolder.CreatedAt,
		newFolder.Size,
		parentID,
		folderID.String(),
	); err != nil {
		return err
	}

	return tx.Commit()
}

func GetFolderByNameAndParent(name string, parentID *uuid.UUID) (*models.Folder, error) {
	var folder models.Folder
	var pinCode sql.NullString
	var parentIDStr sql.NullString

	query := `SELECT id, name, path, pin_code, created_at, size, parent_id FROM folders WHERE name = ? AND `
	var args []interface{}
	args = append(args, name)

	if parentID == nil {

		query += `parent_id = ?`
		args = append(args, RootFolderID)
	} else {
		query += `parent_id = ?`
		args = append(args, parentID.String())
	}

	err := DB.QueryRow(query, args...).Scan(
		&folder.ID, &folder.Name, &folder.Path, &pinCode, &folder.CreatedAt, &folder.Size, &parentIDStr,
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

	query := `SELECT id, name, path, pin_code, created_at, size, parent_id FROM folders WHERE id = ?`

	err := DB.QueryRow(query, folderId.String()).Scan(
		&folder.ID, &folder.Name, &folder.Path, &pinCode, &folder.CreatedAt, &folder.Size, &parentIDStr,
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

	folder.SubFolder, err = GetSubFolders(folderId)
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
	// this deletes all sub-content automatically!!

	tx, err := DB.Begin()

	if err != nil {
		_ = tx.Rollback()
		return err
	}
	_, err = tx.Exec("DELETE FROM folders WHERE id = ?", folderId.String())
	return tx.Commit()
}

// Helper to get subfolders
func GetSubFolders(parentID uuid.UUID) ([]models.Folder, error) {
	rows, err := DB.Query(`SELECT id, name, path, pin_code, created_at, size FROM folders WHERE parent_id = ?`, parentID.String())
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var folders []models.Folder
	for rows.Next() {
		var folder models.Folder
		var pinCode sql.NullString
		if err := rows.Scan(&folder.ID, &folder.Name, &folder.Path, &pinCode, &folder.CreatedAt, &folder.Size); err != nil {
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
        SELECT id, folder_id, name, path, size, extension, mimetype, pin, mod_time, created_at 
        FROM files WHERE folder_id = ?`, folderID.String())
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var files []models.File
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
		files = append(files, file)
	}
	return files, nil
}

// --- File Operations ---

func CreateFile(file *models.File) error {
	query := `
		INSERT INTO files (id, folder_id, name, path, size, extension, mimetype, pin, mod_time, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`
	var folderID interface{}
	if file.FolderID != nil {
		folderID = file.FolderID.String()
	} else {

		folderID = RootFolderID
	}

	var pin interface{}
	if file.Pin != nil {
		pin = *file.Pin
	} else {
		pin = nil
	}

	tx, err := DB.Begin()
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

func GetFile(fileId uuid.UUID) (*models.File, error) {
	var file models.File
	var folderIDStr sql.NullString
	var pin sql.NullString

	query := `SELECT id, folder_id, name, path, size, extension, mimetype, pin, mod_time, created_at FROM files WHERE id = ?`

	err := DB.QueryRow(query, fileId.String()).Scan(
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

func DeleteFile(fileId uuid.UUID) error {
	tx, err := DB.Begin()
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

	folderID := RootFolderID
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

func GetAllFiles() ([]models.File, error) {
	rows, err := DB.Query(`SELECT id, folder_id, name, path, size, extension, mimetype, pin, mod_time, created_at FROM files`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var files []models.File
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
		files = append(files, file)
	}
	return files, nil
}

// --- Root Operations ---

func GetRootFolders() ([]models.Folder, error) {
	rows, err := DB.Query(`SELECT id, name, path, pin_code, created_at, size FROM folders WHERE parent_id = ?`, RootFolderID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var folders []models.Folder
	for rows.Next() {
		var folder models.Folder
		var pinCode sql.NullString
		if err := rows.Scan(&folder.ID, &folder.Name, &folder.Path, &pinCode, &folder.CreatedAt, &folder.Size); err != nil {
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
        SELECT id, folder_id, name, path, size, extension, mimetype, pin, mod_time, created_at 
        FROM files WHERE folder_id = ?`, RootFolderID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var files []models.File
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

	rootID := uuid.MustParse(RootFolderID)

	var rootPath string
	err = DB.QueryRow(`SELECT path FROM folders WHERE id = ?`, RootFolderID).Scan(&rootPath)
	if err != nil {
		return nil, err
	}

	return &models.Folder{
		ID:        rootID,
		Name:      "Root",
		Path:      rootPath,
		SubFolder: subFolders,
		Files:     files,
	}, nil
}
