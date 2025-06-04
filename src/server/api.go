package main

import (
	"encoding/gob"
	"errors"
	"io"
	"log"
	"os"
	"path/filepath"
	"strings"

	"github.com/baldurstod/go-vpk"
	"github.com/gin-gonic/gin"
)

var _ = registerToken()

func registerToken() bool {
	gob.Register(map[string]any{})
	gob.Register(map[string]bool{})
	gob.Register(struct{}{})
	return true
}

var vpkRoot = "vpk/"

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
	case "get-file-list":
		apiError = apiGetFileList(c, request.Params)
	case "get-file":
		apiError = apiGetFile(c, request.Params)
	default:
		jsonError(c, NotFoundError{})
		return
	}

	if apiError != nil {
		jsonError(c, apiError)
	}
}

func apiGetVpkList(c *gin.Context) apiError {
	//files, err = FilePathWalkDir(root)
	var files []string
	err := Walk(vpkRoot, func(path string, info os.FileInfo, err error) error {
		if !info.IsDir() && strings.HasSuffix(path, "_dir.vpk") {
			//files = append(files, strings.TrimSuffix(info.Name(), "_dir.vpk"))
			//dir, file := filepath.Split(strings.TrimPrefix(path, root))
			//fmt.Printf("input: %q\n\tdir: %q\n\tfile: %q\n", path, dir, file)
			files = append(files, strings.TrimPrefix(path, vpkRoot))
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

// symwalkFunc calls the provided WalkFn for regular files.
// However, when it encounters a symbolic link, it resolves the link fully using the
// filepath.EvalSymlinks function and recursively calls symwalk.Walk on the resolved path.
// This ensures that unlike filepath.Walk, traversal does not stop at symbolic links.
func walk(filename string, linkDirname string, walkFn filepath.WalkFunc, visitedDirs map[string]struct{}) error {
	symWalkFunc := func(path string, info os.FileInfo, err error) error {

		if fname, err := filepath.Rel(filename, path); err == nil {
			path = filepath.Join(linkDirname, fname)
		} else {
			return err
		}

		if err == nil && info.Mode()&os.ModeSymlink == os.ModeSymlink {
			finalPath, err := filepath.EvalSymlinks(path)
			if err != nil {
				return err
			}
			info, err := os.Lstat(finalPath)
			if err != nil {
				return walkFn(path, info, err)
			}
			if info.IsDir() {
				if _, ok := visitedDirs[finalPath]; ok {
					return filepath.SkipDir
				}
				visitedDirs[finalPath] = struct{}{}

				return walk(finalPath, path, walkFn, visitedDirs)
			}
		}

		return walkFn(path, info, err)
	}
	return filepath.Walk(filename, symWalkFunc)
}

// Walk extends filepath.Walk to also follow symlinks
func Walk(path string, walkFn filepath.WalkFunc) error {
	return walk(path, path, walkFn, make(map[string]struct{}))
}

func apiGetFileList(c *gin.Context, params map[string]any) apiError {
	if params == nil {
		return CreateApiError(NoParamsError)
	}

	vpkPath, ok := params["vpk_path"].(string)
	if !ok {
		return CreateApiError(InvalidParamVpkPath)
	}

	var pak vpk.VPK
	var err error
	inputFile := filepath.Join(vpkRoot, vpkPath)

	if strings.HasSuffix(inputFile, "_dir.vpk") {
		pak, err = vpk.OpenDir(inputFile)
	} else {
		pak, err = vpk.OpenSingle(inputFile)
	}

	log.Println(pak, err)

	var files = []string{}
	for _, entry := range pak.Entries() {
		files = append(files, entry.Filename())
	}

	jsonSuccess(c, map[string]any{"files": files})
	return nil
}

func apiGetFile(c *gin.Context, params map[string]any) apiError {
	if params == nil {
		return CreateApiError(NoParamsError)
	}

	vpkPath, ok := params["vpk_path"].(string)
	if !ok {
		return CreateApiError(InvalidParamVpkPath)
	}

	filePath, ok := params["path"].(string)
	if !ok {
		return CreateApiError(InvalidParamPath)
	}

	var pak vpk.VPK
	var err error
	inputFile := filepath.Join(vpkRoot, vpkPath)

	if strings.HasSuffix(inputFile, "_dir.vpk") {
		pak, err = vpk.OpenDir(inputFile)
	} else {
		pak, err = vpk.OpenSingle(inputFile)
	}
	if err != nil {
		logError(c, err)
		return CreateApiError(UnexpectedError)
	}

	reader, err := pak.Open(filePath)
	if err != nil {
		logError(c, err)
		return CreateApiError(UnexpectedError)
	}

	buf, err := io.ReadAll(reader)
	if err != nil {
		logError(c, err)
		return CreateApiError(UnexpectedError)
	}

	jsonSuccess(c, map[string]any{"content": buf})
	return nil
}
