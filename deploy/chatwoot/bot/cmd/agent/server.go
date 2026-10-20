package main

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"
	"unicode/utf8"
)

func respond(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(value)
}
func fail(w http.ResponseWriter, status int, message string) {
	respond(w, status, map[string]string{"error": message})
}
func decode(w http.ResponseWriter, r *http.Request, value any) bool {
	if strings.Split(r.Header.Get("Content-Type"), ";")[0] != "application/json" {
		fail(w, 415, "Se requiere JSON.")
		return false
	}
	d := json.NewDecoder(http.MaxBytesReader(w, r.Body, 8192))
	d.DisallowUnknownFields()
	if d.Decode(value) != nil || d.Decode(new(any)) != io.EOF {
		fail(w, 400, "Solicitud no válida.")
		return false
	}
	return true
}
func (a *App) request(ctx context.Context, method, path string, body any, private bool, out any) error {
	var data []byte
	var err error
	if body != nil {
		data, err = json.Marshal(body)
		if err != nil {
			return err
		}
	}
	r, err := http.NewRequestWithContext(ctx, method, a.base+path, bytes.NewReader(data))
	if err != nil {
		return err
	}
	r.Header.Set("Content-Type", "application/json")
	r.Header.Set("Accept", "application/json")
	// The Railway private network is encrypted; preserve the external HTTPS scheme.
	r.Header.Set("X-Forwarded-Proto", "https")
	if private {
		r.Header.Set("api_access_token", a.token)
	}
	response, err := a.client.Do(r)
	if err != nil {
		return err
	}
	defer response.Body.Close()
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		_, _ = io.Copy(io.Discard, io.LimitReader(response.Body, 4096))
		return fmt.Errorf("upstream status %d", response.StatusCode)
	}
	if out == nil {
		_, _ = io.Copy(io.Discard, io.LimitReader(response.Body, 4096))
		return nil
	}
	return json.NewDecoder(io.LimitReader(response.Body, 2<<20)).Decode(out)
}
func (a *App) health(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 3*time.Second)
	defer cancel()
	var ready bool
	if a.db.QueryRow(ctx, "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='dracma_agent' AND table_name='events')").Scan(&ready) != nil || !ready {
		fail(w, 503, "Inicializando el chat.")
		return
	}
	respond(w, 200, map[string]bool{"ok": true})
}

type bucket struct {
	minute int64
	count  int
}
type rateLimits struct {
	sync.Mutex
	clients   map[string]bucket
	lastSweep int64
}

func (l *rateLimits) allow(key string, limit int) bool {
	l.Lock()
	defer l.Unlock()
	now := time.Now().Unix() / 60
	if l.clients == nil {
		l.clients = make(map[string]bucket)
	}
	if now != l.lastSweep {
		for k, b := range l.clients {
			if b.minute < now-1 {
				delete(l.clients, k)
			}
		}
		l.lastSweep = now
	}
	if len(l.clients) > 10000 {
		return false
	}
	b := l.clients[key]
	if b.minute != now {
		b = bucket{minute: now}
	}
	b.count++
	l.clients[key] = b
	return b.count <= limit
}
func (a *App) protected(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if subtle.ConstantTimeCompare([]byte(r.Header.Get("X-Dracma-Chat-Proxy")), []byte(a.proxySecret)) != 1 {
			fail(w, 401, "Acceso no autorizado.")
			return
		}
		ip := r.Header.Get("X-Dracma-Client-IP")
		if ip == "" {
			ip = "proxy"
		}
		limit, key := 120, ip
		if r.URL.Path == "/chat/session" {
			limit = 5
			key = "session:" + ip
		}
		if !a.limits.allow(key, limit) {
			w.Header().Set("Retry-After", "60")
			fail(w, 429, "Espera un momento antes de continuar.")
			return
		}
		next(w, r)
	}
}
func (a *App) questions(w http.ResponseWriter, _ *http.Request) {
	q := make([]map[string]string, 0, len(a.faq))
	for _, f := range a.faq {
		q = append(q, map[string]string{"id": f.ID, "question": f.Question})
	}
	respond(w, 200, map[string]any{"questions": q, "mode": "faq", "notice": "Respuestas automáticas basadas en información pública. No consulta cuentas privadas ni envía avisos contables."})
}

type session struct {
	Source       string `json:"source"`
	Conversation int64  `json:"conversation"`
	Expires      int64  `json:"expires"`
}

func (a *App) readSession(r *http.Request) (session, error) {
	var s session
	token := strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
	raw, err := base64.RawURLEncoding.DecodeString(token)
	if err != nil {
		return s, err
	}
	plain, err := a.cipher.Open(nil, nil, raw, []byte("dracma-chat-v1"))
	if err != nil {
		return s, err
	}
	if err = json.Unmarshal(plain, &s); err != nil {
		return s, err
	}
	if len(s.Source) != 64 || s.Conversation <= 0 || s.Expires < time.Now().Unix() {
		return s, errors.New("expired session")
	}
	return s, nil
}
func (a *App) publicPath(s session) string {
	return fmt.Sprintf("/public/api/v1/inboxes/%s/contacts/%s/conversations/%d", a.identifier, s.Source, s.Conversation)
}
func (a *App) createSession(w http.ResponseWriter, r *http.Request) {
	var in struct{}
	if !decode(w, r, &in) {
		return
	}
	random := make([]byte, 32)
	if _, err := rand.Read(random); err != nil {
		fail(w, 503, "No se pudo abrir el chat.")
		return
	}
	source := hex.EncodeToString(random)
	var contact struct {
		Source string `json:"source_id"`
	}
	if a.request(r.Context(), "POST", "/public/api/v1/inboxes/"+a.identifier+"/contacts", map[string]string{"source_id": source}, false, &contact) != nil || contact.Source != source {
		fail(w, 503, "No se pudo abrir el chat. Inténtalo más tarde.")
		return
	}
	var conv struct {
		ID int64 `json:"id"`
	}
	if a.request(r.Context(), "POST", "/public/api/v1/inboxes/"+a.identifier+"/contacts/"+source+"/conversations", map[string]any{}, false, &conv) != nil || conv.ID <= 0 {
		fail(w, 503, "No se pudo iniciar la conversación.")
		return
	}
	s := session{source, conv.ID, time.Now().Add(24 * time.Hour).Unix()}
	data, _ := json.Marshal(s)
	token := base64.RawURLEncoding.EncodeToString(a.cipher.Seal(nil, nil, data, []byte("dracma-chat-v1")))
	respond(w, 201, map[string]string{"sessionToken": token})
}

type publicMessage struct {
	ID           int64          `json:"id"`
	Content      string         `json:"content"`
	Type         int            `json:"message_type"`
	Created      int64          `json:"created_at"`
	Private      bool           `json:"private"`
	Attributes   map[string]any `json:"content_attributes"`
	Source       string         `json:"source_id"`
	Conversation struct {
		ContactInbox struct {
			Source string `json:"source_id"`
		} `json:"contact_inbox"`
	} `json:"conversation"`
}

func (a *App) messages(w http.ResponseWriter, r *http.Request) {
	s, err := a.readSession(r)
	if err != nil {
		fail(w, 401, "La sesión del chat caducó. Inicia una nueva consulta.")
		return
	}
	var upstream []publicMessage
	if a.request(r.Context(), "GET", a.publicPath(s)+"/messages", nil, false, &upstream) != nil {
		fail(w, 503, "No se pudo actualizar la conversación.")
		return
	}
	out := make([]map[string]any, 0, len(upstream))
	for _, m := range upstream {
		if m.Private || m.Type < 0 || m.Type > 1 || m.Content == "" {
			continue
		}
		kind := "user"
		if m.Type == 1 {
			kind = "agent"
		}
		out = append(out, map[string]any{"id": m.ID, "content": m.Content, "kind": kind, "createdAt": m.Created})
	}
	respond(w, 200, map[string]any{"messages": out})
}
func (a *App) send(w http.ResponseWriter, r *http.Request) {
	s, err := a.readSession(r)
	if err != nil {
		fail(w, 401, "La sesión del chat caducó.")
		return
	}
	var in struct {
		Content string `json:"content"`
	}
	if !decode(w, r, &in) {
		return
	}
	in.Content = strings.TrimSpace(in.Content)
	if !utf8.ValidString(in.Content) || utf8.RuneCountInString(in.Content) < 1 || utf8.RuneCountInString(in.Content) > 2000 {
		fail(w, 400, "Escribe entre 1 y 2000 caracteres.")
		return
	}
	var m publicMessage
	if a.request(r.Context(), "POST", a.publicPath(s)+"/messages", map[string]string{"content": in.Content}, false, &m) != nil {
		fail(w, 503, "No se pudo confirmar el envío. Revisa el historial antes de reenviar.")
		return
	}
	respond(w, 201, map[string]any{"id": m.ID})
}
func (a *App) webhook(w http.ResponseWriter, r *http.Request) {
	raw, err := io.ReadAll(http.MaxBytesReader(w, r.Body, 1<<20))
	if err != nil {
		fail(w, 413, "Payload too large")
		return
	}
	ts := r.Header.Get("X-Chatwoot-Timestamp")
	epoch, err := strconv.ParseInt(ts, 10, 64)
	now := time.Now().Unix()
	if err != nil || epoch < now-300 || epoch > now+300 {
		fail(w, 401, "Invalid signature")
		return
	}
	signature, err := hex.DecodeString(strings.TrimPrefix(r.Header.Get("X-Chatwoot-Signature"), "sha256="))
	mac := hmac.New(sha256.New, []byte(a.webhookSecret))
	mac.Write([]byte(ts + "."))
	mac.Write(raw)
	if err != nil || !hmac.Equal(mac.Sum(nil), signature) {
		fail(w, 401, "Invalid signature")
		return
	}
	var event struct {
		Event   string `json:"event"`
		ID      int64  `json:"id"`
		Type    string `json:"message_type"`
		Private bool   `json:"private"`
		Account struct {
			ID int64 `json:"id"`
		} `json:"account"`
		Inbox struct {
			ID int64 `json:"id"`
		} `json:"inbox"`
		Conversation struct {
			ID int64 `json:"id"`
		} `json:"conversation"`
	}
	if json.Unmarshal(raw, &event) != nil {
		fail(w, 400, "Invalid event")
		return
	}
	if event.Event != "message_created" || event.Type != "incoming" || event.Private {
		w.WriteHeader(204)
		return
	}
	if event.Account.ID != a.account || event.Inbox.ID != a.inbox || event.ID <= 0 || event.Conversation.ID <= 0 {
		fail(w, 403, "Unexpected inbox")
		return
	}
	if _, err = a.db.Exec(r.Context(), "INSERT INTO dracma_agent.events(message_id,conversation_id) VALUES($1,$2) ON CONFLICT DO NOTHING", event.ID, event.Conversation.ID); err != nil {
		fail(w, 500, "Queue unavailable")
		return
	}
	w.WriteHeader(202)
}
