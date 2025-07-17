package main

import (
	"io"
	"net/http"
	"os"
)

func main() {
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		f, _ := os.Open("main.html")
		io.Copy(w, f)
	})
	panic(http.ListenAndServe(":3005", nil))
}
