package dto

import (
	"mime/multipart"

	"github.com/google/uuid"
)

type UploadFileRequestBody struct {
	FileHeaders    []*multipart.FileHeader
	DisplayName    string     `json:"display_name,omitempty" form:"display_name"`
	PinCode        string     `json:"pin_code,omitempty" form:"pin_code"`
	ParentFolderID *uuid.UUID `json:"parent_folder_id,omitempty" form:"parent_id"`
	ContentType    string     `json:"contentType,omitempty" form:"contentType"`
}
