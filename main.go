package main

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/mikerybka/util"
)

var chatWatchers = map[string]map[string]chan *Chat{} // map of chatIDs to subscriptionIDs to channels of Chat pointers

func main() {
	dataDir := util.RequireEnvVar("DATA_DIR")
	http.HandleFunc("GET /api/chats/{chatID}/update", func(w http.ResponseWriter, r *http.Request) {
		ch := make(chan *Chat)
		chatID := r.PathValue("chatID")
		if chatWatchers[chatID] == nil {
			chatWatchers[chatID] = map[string]chan *Chat{}
		}
		subID := util.RandomID()
		chatWatchers[chatID][subID] = ch
		update := <-ch
		json.NewEncoder(w).Encode(update)
	})
	http.HandleFunc("/chat", func(w http.ResponseWriter, r *http.Request) {
		f, err := os.Open("chat.html")
		if err != nil {
			panic(err)
		}
		io.Copy(w, f)
	})
	http.HandleFunc("GET /api/chats", func(w http.ResponseWriter, r *http.Request) {
		dir := filepath.Join(dataDir, "chats")
		ids, err := listJSONFiles(dir)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		json.NewEncoder(w).Encode(ids)
	})
	http.HandleFunc("GET /api/chats/{chatID}", func(w http.ResponseWriter, r *http.Request) {
		path := filepath.Join(dataDir, "chats", r.PathValue("chatID"))
		f, err := os.Open(path)
		if err != nil {
			if errors.Is(err, os.ErrNotExist) {
				http.Error(w, "not found", http.StatusNotFound)
				return
			}
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		defer f.Close()
		io.Copy(w, f)
	})
	http.HandleFunc("PUT /api/chats/{chatID}", func(w http.ResponseWriter, r *http.Request) {
		chat := &Chat{}
		err := json.NewDecoder(r.Body).Decode(chat)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		chatID := r.PathValue("chatID")
		path := filepath.Join(dataDir, "chats", chatID)
		err = util.WriteJSONFile(path, chat)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		for subID, watcher := range chatWatchers[chatID] {
			watcher <- chat
			delete(chatWatchers[chatID], subID)
		}
	})
	panic(http.ListenAndServe(":3005", nil))
}

type ChatMessage struct {
	From        string
	Text        string
	SentAt      string
	DeliveredAt string
}

type Chat struct {
	Title    string
	Messages []ChatMessage
}

func listJSONFiles(path string) ([]string, error) {
	res := []string{}
	entries, err := os.ReadDir(path)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return res, nil
		}
		return nil, err
	}
	for _, e := range entries {
		if e.IsDir() && strings.HasSuffix(e.Name(), ".json") {
			res = append(res, e.Name())
		}
	}
	return res, nil
}
