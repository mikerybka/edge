package main

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"github.com/mikerybka/edge/pkg/graphics"
	"github.com/mikerybka/util"
)

var chatWatchers = map[string]map[string]chan *Chat{} // map of chatIDs to subscriptionIDs to channels of Chat pointers
var chatLocks = map[string]*sync.Mutex{}
var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

var frame = graphics.TUI("ABABABABABABABABABABBABABABABBABABBABABABBABBABBABABABBABAABABABABBABABBBABBBBBABAAAABABABABABACCCCCABC")
var clients = map[string]chan string{}

func refreshClients() {
	msg := strconv.FormatInt(time.Now().UnixNano(), 10)
	for _, ch := range clients {
		ch <- msg
	}
}

func main() {
	writePID()
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
	http.HandleFunc("GET /demo", func(w http.ResponseWriter, r *http.Request) {
		f, err := os.Open("demo.html")
		if err != nil {
			panic(err)
		}
		io.Copy(w, f)
	})
	http.HandleFunc("GET /demo/updates", func(w http.ResponseWriter, r *http.Request) {
		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			panic(err)
		}
		defer conn.Close()
		id := util.RandomToken(32)
		ch := make(chan string)
		clients[id] = ch
		defer func() {
			delete(clients, id)
		}()
		for msg := range ch {
			conn.WriteMessage(1, []byte(msg))
		}
	})
	http.HandleFunc("GET /demo/frame", func(w http.ResponseWriter, r *http.Request) {
		w.Write(frame)
	})
	http.HandleFunc("PUT /demo/frame", func(w http.ResponseWriter, r *http.Request) {
		b, err := io.ReadAll(r.Body)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		frame = graphics.TUI(string(b))
		refreshClients()
	})
	http.HandleFunc("GET /demo.js", func(w http.ResponseWriter, r *http.Request) {
		f, err := os.Open("demo.js")
		if err != nil {
			panic(err)
		}
		w.Header().Add("Content-Type", "application/javascript")
		io.Copy(w, f)
	})
	http.HandleFunc("GET /chat.js", func(w http.ResponseWriter, r *http.Request) {
		f, err := os.Open("chat.js")
		if err != nil {
			panic(err)
		}
		io.Copy(w, f)
	})
	http.HandleFunc("GET /chats.js", func(w http.ResponseWriter, r *http.Request) {
		f, err := os.Open("chats.js")
		if err != nil {
			panic(err)
		}
		io.Copy(w, f)
	})
	http.HandleFunc("GET /chats", func(w http.ResponseWriter, r *http.Request) {
		f, err := os.Open("chats.html")
		if err != nil {
			panic(err)
		}
		io.Copy(w, f)
	})
	http.HandleFunc("GET /chats/{chatID}", func(w http.ResponseWriter, r *http.Request) {
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
		path := filepath.Join(dataDir, "chats", r.PathValue("chatID")) + ".json"
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
	http.HandleFunc("POST /api/chats/{chatID}", func(w http.ResponseWriter, r *http.Request) {
		msg := ChatMessage{}
		err := json.NewDecoder(r.Body).Decode(&msg)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		r.Body.Close()

		chatID := r.PathValue("chatID")

		if chatLocks[chatID] == nil {
			chatLocks[chatID] = &sync.Mutex{}
		}
		chatLocks[chatID].Lock()
		defer chatLocks[chatID].Unlock()

		path := filepath.Join(dataDir, "chats", chatID) + ".json"
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
		chat := &Chat{}
		err = json.NewDecoder(f).Decode(chat)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		chat.Messages = append(chat.Messages, msg)

		err = util.WriteJSONFile(path, chat)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		go func() {
			for subID, watcher := range chatWatchers[chatID] {
				watcher <- chat
				close(watcher)
				delete(chatWatchers[chatID], subID)
			}
		}()
	})
	panic(http.ListenAndServe(":3005", nil))
}

type ChatMessage struct {
	From   string `json:"from"`
	Text   string `json:"text"`
	SentAt string `json:"sentAt"`
}

type Chat struct {
	Title    string        `json:"title"`
	Messages []ChatMessage `json:"messages"`
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
		if !e.IsDir() && strings.HasSuffix(e.Name(), ".json") {
			res = append(res, strings.TrimSuffix(e.Name(), ".json"))
		}
	}
	return res, nil
}

func writePID() error {
	pidFile := os.Getenv("PID_FILE")
	if pidFile != "" {
		pid := os.Getpid()
		return os.WriteFile(pidFile, []byte(strconv.Itoa(pid)), os.ModePerm)
	}
	return nil
}
