package main

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"strconv"
	"strings"
	"testing"
	"time"
)

func testApp(t *testing.T) *App {
	t.Helper()
	b, _ := aes.NewCipher(make([]byte, 32))
	c, _ := cipher.NewGCMWithRandomNonce(b)
	return &App{cipher: c, proxySecret: "proxy-test", webhookSecret: "webhook-test", account: 1, inbox: 1}
}
func sealed(a *App, s session) string {
	p, _ := json.Marshal(s)
	return base64.RawURLEncoding.EncodeToString(a.cipher.Seal(nil, nil, p, []byte("dracma-chat-v1")))
}
func TestSessionAuthenticityAndExpiry(t *testing.T) {
	a := testApp(t)
	valid := sealed(a, session{strings.Repeat("a", 64), 7, time.Now().Add(time.Hour).Unix()})
	for _, v := range []struct {
		token string
		ok    bool
	}{{valid, true}, {valid[:len(valid)-4] + "abcd", false}, {sealed(a, session{strings.Repeat("a", 64), 7, time.Now().Add(-time.Hour).Unix()}), false}, {"{}", false}} {
		r := httptest.NewRequest("GET", "/chat/messages", nil)
		r.Header.Set("Authorization", "Bearer "+v.token)
		s, err := a.readSession(r)
		if (err == nil) != v.ok {
			t.Fatalf("unexpected session validity: %v", err)
		}
		if v.ok && s.Conversation != 7 {
			t.Fatal("conversation changed")
		}
	}
}
func TestProxyCannotBeBypassed(t *testing.T) {
	a := testApp(t)
	called := false
	h := a.protected(func(w http.ResponseWriter, r *http.Request) { called = true; w.WriteHeader(204) })
	r := httptest.NewRequest("GET", "/chat/questions", nil)
	w := httptest.NewRecorder()
	h(w, r)
	if w.Code != 401 || called {
		t.Fatal("unauthenticated proxy accepted")
	}
	r.Header.Set("X-Dracma-Chat-Proxy", a.proxySecret)
	w = httptest.NewRecorder()
	h(w, r)
	if w.Code != 204 || !called {
		t.Fatal("authenticated proxy rejected")
	}
}
func TestWebhookSecurity(t *testing.T) {
	a := testApp(t)
	for _, v := range []struct {
		name, body string
		offset     int64
		forge      bool
		status     int
	}{{"forged", `{}`, 0, true, 401}, {"stale", `{}`, -601, false, 401}, {"foreign", `{"event":"message_created","message_type":"incoming","id":9,"account":{"id":2},"inbox":{"id":1},"conversation":{"id":3}}`, 0, false, 403}, {"private", `{"event":"message_created","message_type":"incoming","private":true}`, 0, false, 204}, {"outgoing", `{"event":"message_created","message_type":"outgoing"}`, 0, false, 204}} {
		t.Run(v.name, func(t *testing.T) {
			ts := strconv.FormatInt(time.Now().Unix()+v.offset, 10)
			m := hmac.New(sha256.New, []byte(a.webhookSecret))
			m.Write([]byte(ts + "." + v.body))
			sig := hex.EncodeToString(m.Sum(nil))
			if v.forge {
				sig = strings.Repeat("0", 64)
			}
			r := httptest.NewRequest("POST", "/webhooks/chatwoot", strings.NewReader(v.body))
			r.Header.Set("X-Chatwoot-Timestamp", ts)
			r.Header.Set("X-Chatwoot-Signature", "sha256="+sig)
			w := httptest.NewRecorder()
			a.webhook(w, r)
			if w.Code != v.status {
				t.Fatalf("got %d want %d", w.Code, v.status)
			}
		})
	}
}
func TestHistoryExcludesPrivateNotesAndActivities(t *testing.T) {
	a := testApp(t)
	up := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`[{"id":1,"content":"public user","message_type":0},{"id":2,"content":"secret note","message_type":1,"private":true},{"id":3,"content":"activity","message_type":2},{"id":4,"content":"public reply","message_type":1}]`))
	}))
	defer up.Close()
	a.base = up.URL
	a.client = up.Client()
	a.identifier = "inbox"
	r := httptest.NewRequest("GET", "/chat/messages", nil)
	r.Header.Set("Authorization", "Bearer "+sealed(a, session{strings.Repeat("a", 64), 7, time.Now().Add(time.Hour).Unix()}))
	w := httptest.NewRecorder()
	a.messages(w, r)
	if w.Code != 200 || strings.Contains(w.Body.String(), "secret note") || strings.Contains(w.Body.String(), "activity") || !strings.Contains(w.Body.String(), "public reply") {
		t.Fatal("history boundary failed")
	}
}
func TestFAQAndFallback(t *testing.T) {
	a := testApp(t)
	data, err := os.ReadFile("../../faq.json")
	if err != nil {
		t.Fatal(err)
	}
	if err = json.Unmarshal(data, &a.faq); err != nil {
		t.Fatal(err)
	}
	for _, f := range a.faq {
		answer, handoff := a.answer(f.Question)
		if answer != f.Answer || handoff != f.Handoff {
			t.Fatalf("FAQ routing failed for %s", f.ID)
		}
	}
	s, h := a.answer("Dame una recomendación individual de inversión de 10000 USD")
	if !h || !strings.Contains(s, "respuesta verificada") {
		t.Fatal("unverified request must hand off")
	}
}
func TestInvalidMessageRejectedBeforeUpstream(t *testing.T) {
	a := testApp(t)
	for _, body := range []string{`{"content":"` + strings.Repeat("x", 2001) + `"}`, `{"content":"hola","conversation":123}`} {
		r := httptest.NewRequest("POST", "/chat/messages", strings.NewReader(body))
		r.Header.Set("Content-Type", "application/json")
		r.Header.Set("Authorization", "Bearer "+sealed(a, session{strings.Repeat("a", 64), 7, time.Now().Add(time.Hour).Unix()}))
		w := httptest.NewRecorder()
		a.send(w, r)
		if w.Code != 400 {
			t.Fatalf("invalid body accepted: %d", w.Code)
		}
	}
}
func TestHumanHandoffTakesPriorityOverProjectKeywords(t *testing.T) {
	a := testApp(t)
	data, err := os.ReadFile("../../faq.json")
	if err != nil {
		t.Fatal(err)
	}
	if err = json.Unmarshal(data, &a.faq); err != nil {
		t.Fatal(err)
	}
	_, h := a.answer("Necesito hablar con el equipo sobre mi proyecto y sus comisiones")
	if !h {
		t.Fatal("explicit human request must be handed off")
	}
}
