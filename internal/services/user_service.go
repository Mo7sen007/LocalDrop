package services

import (
	"errors"

	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func GetUserIDFromSession(c *gin.Context) (uuid.UUID, error) {
	session := sessions.Default(c)
	userIdInterface := session.Get("user_id")
	if userIdInterface == nil {
		return uuid.UUID{}, errors.New("no user_id in session")
	}

	userIdStr, ok := userIdInterface.(string)
	if !ok {
		return uuid.UUID{}, errors.New("user_id in session is not a string")
	}

	userID, err := uuid.Parse(userIdStr)
	if err != nil {
		return uuid.UUID{}, err
	}

	return userID, nil
}
