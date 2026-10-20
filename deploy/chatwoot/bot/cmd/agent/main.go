package main

import (
	"context"
	"crypto/aes"
	"crypto/cipher"
	"encoding/hex"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type FAQ struct {
	ID       string   `json:"id"`
	Question string   `json:"question"`
	Terms    []string `json:"terms"`
	Answer   string   `json:"answer"`
	Handoff  bool     `json:"handoff"`
}
type App struct {
	db                                                  *pgxpool.Pool
	client                                              *http.Client
	base, identifier, token, webhookSecret, proxySecret string
	account, inbox                                      int64
	cipher                                              cipher.AEAD
	faq                                                 []FAQ
	locales                                             map[string]LocalizedFAQ
	limits                                              rateLimits
}

func required(name string) string {
	s := os.Getenv(name)
	if s == "" {
		panic("missing configuration: " + name)
	}
	return s
}
func main() {
	if err := run(); err != nil {
		slog.Error("agent stopped", "reason", err.Error())
		os.Exit(1)
	}
}
func run() error {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	a := &App{base: required("CHATWOOT_INTERNAL_URL"), identifier: required("CHATWOOT_INBOX_IDENTIFIER"), token: required("CHATWOOT_AGENT_TOKEN"), webhookSecret: required("CHATWOOT_WEBHOOK_SECRET"), proxySecret: required("CHAT_PROXY_SECRET"), client: &http.Client{Timeout: 8 * time.Second, CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }}}
	var err error
	a.account, err = strconv.ParseInt(required("CHATWOOT_ACCOUNT_ID"), 10, 64)
	if err != nil {
		return err
	}
	a.inbox, err = strconv.ParseInt(required("CHATWOOT_INBOX_ID"), 10, 64)
	if err != nil {
		return err
	}
	key, err := hex.DecodeString(required("CHAT_SESSION_KEY"))
	if err != nil || len(key) != 32 {
		return errors.New("invalid session encryption")
	}
	block, err := aes.NewCipher(key)
	if err != nil {
		return err
	}
	a.cipher, err = cipher.NewGCMWithRandomNonce(block)
	if err != nil {
		return err
	}
	data, err := os.ReadFile("/faq.json")
	if err != nil {
		return err
	}
	if err = json.Unmarshal(data, &a.faq); err != nil {
		return err
	}
	data, err = os.ReadFile("/faq-locales.json")
	if err != nil {
		return err
	}
	if err = json.Unmarshal(data, &a.locales); err != nil {
		return err
	}
	for _, l := range []string{"en", "ar", "zh", "ru", "it"} {
		if len(a.locales[l].Questions) != len(a.faq) || a.locales[l].Fallback == "" {
			return errors.New("incomplete localized FAQ")
		}
	}
	config, err := pgxpool.ParseConfig(required("DATABASE_URL"))
	if err != nil {
		return errors.New("invalid database configuration")
	}
	config.MaxConns = 4
	config.ConnConfig.ConnectTimeout = 3 * time.Second
	a.db, err = pgxpool.NewWithConfig(ctx, config)
	if err != nil {
		return errors.New("database pool initialization failed")
	}
	defer a.db.Close()
	if _, err = a.db.Exec(ctx, `CREATE TABLE IF NOT EXISTS dracma_agent.conversation_locales (conversation_id bigint PRIMARY KEY, locale text NOT NULL CHECK (locale IN ('es','en','ar','zh','ru','it')))`); err != nil {
		return errors.New("chat language storage unavailable")
	}
	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", a.health)
	mux.HandleFunc("POST /webhooks/chatwoot", a.webhook)
	mux.HandleFunc("GET /chat/questions", a.protected(a.questions))
	mux.HandleFunc("POST /chat/session", a.protected(a.createSession))
	mux.HandleFunc("GET /chat/messages", a.protected(a.messages))
	mux.HandleFunc("POST /chat/messages", a.protected(a.send))
	server := &http.Server{Addr: ":" + required("PORT"), Handler: http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "no-store")
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'")
		mux.ServeHTTP(w, r)
	}), ReadHeaderTimeout: 5 * time.Second, ReadTimeout: 10 * time.Second, WriteTimeout: 20 * time.Second, IdleTimeout: 45 * time.Second, MaxHeaderBytes: 16 << 10}
	done := make(chan struct{})
	go func() { defer close(done); a.work(ctx) }()
	errs := make(chan error, 1)
	go func() { slog.Info("DRACMA agent listening"); errs <- server.ListenAndServe() }()
	select {
	case <-ctx.Done():
	case err = <-errs:
		if err != http.ErrServerClosed {
			stop()
		}
	}
	shutdown, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	_ = server.Shutdown(shutdown)
	stop()
	<-done
	if err == http.ErrServerClosed {
		return nil
	}
	return err
}
