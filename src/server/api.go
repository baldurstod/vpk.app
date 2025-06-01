package main

import (
	"encoding/gob"
	"errors"
	"os"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"
)

var _ = registerToken()

func registerToken() bool {
	gob.Register(map[string]any{})
	gob.Register(map[string]bool{})
	gob.Register(struct{}{})
	return true
}

/*
type ApiHandler struct {
}*/

type apiRequest struct {
	Action  string         `json:"action" binding:"required"`
	Version int            `json:"version" binding:"required"`
	Params  map[string]any `json:"params"`
}

func apiHandler(c *gin.Context) {
	var request apiRequest
	var err error

	if err = c.ShouldBindJSON(&request); err != nil {
		logError(c, err)
		jsonError(c, errors.New("bad request"))
		return
	}

	var apiError apiError
	switch request.Action {
	case "get-vpk-list":
		apiError = apiGetVpkList(c)
	default:
		jsonError(c, NotFoundError{})
		return
	}

	if apiError != nil {
		jsonError(c, apiError)
	}
}

func apiGetVpkList(c *gin.Context) apiError {
	root := "./vpk/"
	//files, err = FilePathWalkDir(root)
	var files []string
	err := filepath.Walk(root, func(path string, info os.FileInfo, err error) error {
		if !info.IsDir() && strings.HasSuffix(path, "_dir.vpk") {
			files = append(files, info.Name())
		}
		return nil
	})

	//entries, err := os.ReadDir("./vpk/")
	if err != nil {
		logError(c, err)
		return CreateApiError(UnexpectedError)
	}

	/*
		for _, e := range entries {
			fmt.Println(e.Name())
		}
	*/

	jsonSuccess(c, map[string]any{"files": files})
	return nil
}
