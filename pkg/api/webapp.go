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

	router.NoRoute(func(c *gin.Context) {
		if strings.HasPrefix(c.Request.URL.Path, "/api/") {
			c.Status(http.StatusNotFound)
			return
		}

		if f, err := root.Open(c.Request.URL.Path); err == nil {
			f.Close()
			fileServer.ServeHTTP(c.Writer, c.Request)
			return
		}

		c.File(indexFile)
	})
}
