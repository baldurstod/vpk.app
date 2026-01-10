package main

import (
	"encoding/gob"
	"errors"
	"io"
	"log"
	"os"
	"path"
	"path/filepath"
	"runtime/debug"
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

var repositoryRoot = "content/"

var games []Game
var applications map[string]string
var filesPerApp map[string][]string
var filesToVpk map[string]map[string]string

func initApi(g []Game) {
	games = g

	applications = map[string]string{}
	filesPerApp = map[string][]string{}
	filesToVpk = map[string]map[string]string{}

	for _, e := range games {
		applications[e.Alias] = e.Name
		listVpks(e)
	}
}

func listVpks(g Game) {
	filesPerApp[g.Alias] = []string{}
	filesToVpk[g.Alias] = map[string]string{}

	for _, e := range g.VpkSearchPaths {
		root := path.Join(repositoryRoot, g.Path, e)
		Walk(root, func(path string, info os.FileInfo, err error) error {
			if info != nil && !info.IsDir() && strings.HasSuffix(path, "_dir.vpk") {
				listVpksFiles(g, path)
			}
			return nil
		})
	}
}

func listVpksFiles(g Game, filePath string) {
	files := filesPerApp[g.Alias]
	f := filesToVpk[g.Alias]

	var pak vpk.VPK
	var err error
	if strings.HasSuffix(filePath, "_dir.vpk") {
		pak, err = vpk.OpenDir(filePath)
	} else {
		pak, err = vpk.OpenSingle(filePath)
	}

	if err != nil {
		log.Printf("error while listing %s %s", filePath, err)
	}

	for _, entry := range pak.Entries() {
		filename := entry.Filename()
		_, found := f[filename]
		if !found {
			files = append(files, filename)
			f[filename] = filePath
		}
	}

	filesPerApp[g.Alias] = files
}

type apiRequest struct {
	Action  string         `json:"action" binding:"required"`
	Version int            `json:"version" binding:"required"`
	Params  map[string]any `json:"params"`
}

func apiHandler(c *gin.Context) {
	var request apiRequest
	var err error

	defer func() {
		if err := recover(); err != nil {
			jsonError(c, CreateApiError(UnexpectedError))
			log.Println(err, string(debug.Stack()))
		}
	}()

	if err = c.ShouldBindJSON(&request); err != nil {
		logError(c, err)
		jsonError(c, errors.New("bad request"))
		return
	}

	var apiError apiError
	switch request.Action {
	case "get-application-list":
		apiError = apiGetApplicationList(c)
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

func apiGetApplicationList(c *gin.Context) apiError {
	jsonSuccess(c, map[string]any{"applications": applications})
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

	application, ok := params["application"].(string)
	if !ok {
		return CreateApiError(InvalidParamApplication)
	}

	files, found := filesPerApp[application]
	if !found {
		return CreateApiError(InvalidParamApplication)
	}

	jsonSuccess(c, map[string]any{"files": files})
	return nil
}

func apiGetFile(c *gin.Context, params map[string]any) apiError {
	if params == nil {
		return CreateApiError(NoParamsError)
	}

	application, ok := params["application"].(string)
	if !ok {
		return CreateApiError(InvalidParamApplication)
	}

	filePath, ok := params["path"].(string)
	if !ok {
		return CreateApiError(InvalidParamPath)
	}

	vpkPath, found := filesToVpk[application][filePath]
	if !found {
		return CreateApiError(InvalidParamPath)
	}

	filePath = strings.ReplaceAll(filePath, "\\", "/")
	filePath = path.Clean(filePath)

	var pak vpk.VPK
	var err error
	//inputFile := filepath.Join(repositoryRoot, repository)

	if strings.HasSuffix(vpkPath, "_dir.vpk") {
		pak, err = vpk.OpenDir(vpkPath)
	} else {
		pak, err = vpk.OpenSingle(vpkPath)
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
