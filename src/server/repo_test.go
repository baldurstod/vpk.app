// #cgo windows CFLAGS: -I D:\Divers\libmongocrypt\include\mongocrypt

package main_test

import (
	"log"
	"path/filepath"
	"slices"
	"testing"
)

func TestSplitPath(t *testing.T) {
	log.Println(splitPath("vpk/dota2/rep1/rep2/rep3/filename"))
}

/*
func splitPath(path string) []string {
	segments := []string{}

	d := filepath.SplitList(path)

	log.Println(d)

	return segments
}*/

func splitPath(path string) []string {
	subPath := path
	var result []string
	for {
		subPath = filepath.Clean(subPath) // Amongst others, removes trailing slashes (except for the root directory).

		dir, last := filepath.Split(subPath)
		if last == "" {
			if dir != "" { // Root directory.
				result = append(result, dir)
			}
			break
		}
		result = append(result, last)

		if dir == "" { // Nothing to split anymore.
			break
		}
		subPath = dir
	}

	slices.Reverse(result)
	return result
}
