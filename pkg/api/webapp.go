package api

import (
	"net/http"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"
)

func registerWebApp(router *gin.Engine, webAppPath string) {
	root := http.Dir(webAppPath)
	fileServer := http.FileServer(root)
	indexFile := filepath.Join(webAppPath, "index.html")

	router.NoRoute(func(ctx *gin.Context) {
		if strings.HasPrefix(ctx.Request.URL.Path, "/api/") {
			ctx.Status(http.StatusNotFound)
			return
		}

		// Only regular files are served by the file server. Directories fall
		// back to the index file so that no directory listings are exposed.
		if isFile(root, ctx.Request.URL.Path) {
			fileServer.ServeHTTP(ctx.Writer, ctx.Request)
			return
		}

		ctx.File(indexFile)
	})
}

func isFile(root http.FileSystem, name string) bool {
	file, err := root.Open(name)
	if err != nil {
		return false
	}
	defer file.Close()

	info, err := file.Stat()
	if err != nil {
		return false
	}

	return !info.IsDir()
}
