package main

import (
	"context"
	"fmt"
	"log/slog"
	"strings"
	"time"
	"unicode"

	"github.com/jackc/pgx/v5"
)

func normalized(s string) string {
	return strings.Map(func(r rune) rune {
		if unicode.Is(unicode.Mn, r) || r == 'ـ' {
			return -1
		}
		return r
	}, strings.NewReplacer("á", "a", "é", "e", "í", "i", "ó", "o", "ú", "u", "ü", "u", "ё", "е", "أ", "ا", "إ", "ا", "آ", "ا").Replace(strings.ToLower(s)))
}
func (a *App) answer(content string) (string, bool) { return a.answerIn(content, "es") }
func (a *App) accountPath(id int64) string {
	return fmt.Sprintf("/api/v1/accounts/%d/conversations/%d", a.account, id)
}
func (a *App) work(ctx context.Context) {
	timer := time.NewTicker(time.Second)
	defer timer.Stop()
	var lastWarning time.Time
	for {
		select {
		case <-ctx.Done():
			return
		case <-timer.C:
			if err := a.tick(ctx); err != nil && ctx.Err() == nil && time.Since(lastWarning) > 30*time.Second {
				lastWarning = time.Now()
				slog.Warn("chat queue temporarily unavailable")
			}
		}
	}
}
func (a *App) state(ctx context.Context, id int64, state string) error {
	_, err := a.db.Exec(ctx, "UPDATE dracma_agent.events SET state=$2,updated_at=now() WHERE message_id=$1", id, state)
	return err
}
func (a *App) tick(parent context.Context) (err error) {
	ctx, cancel := context.WithTimeout(parent, 15*time.Second)
	defer cancel()
	var id, conversation int64
	var state string
	err = a.db.QueryRow(ctx, "SELECT message_id,conversation_id,state FROM dracma_agent.events WHERE state IN ('pending','sending','uncertain') ORDER BY updated_at,message_id LIMIT 1").Scan(&id, &conversation, &state)
	if err == pgx.ErrNoRows {
		return nil
	}
	if err != nil {
		return err
	}
	// Rotate failing conversations so they cannot block later questions.
	defer func() {
		if err != nil {
			retry, cancel := context.WithTimeout(context.Background(), 2*time.Second)
			defer cancel()
			_, _ = a.db.Exec(retry, "UPDATE dracma_agent.events SET updated_at=now() WHERE message_id=$1", id)
		}
	}()
	base := a.accountPath(conversation)
	marker := fmt.Sprintf("dracma-agent:%d", id)
	// AgentBot tokens can show a conversation, but cannot list account messages.
	// Read only its public thread, using the contact reference returned by Chatwoot.
	var info struct {
		Status   string          `json:"status"`
		Inbox    int64           `json:"inbox_id"`
		Messages []publicMessage `json:"messages"`
	}
	if err = a.request(ctx, "GET", base, nil, true, &info); err != nil {
		return err
	}
	if info.Inbox != a.inbox || len(info.Messages) == 0 {
		return a.state(ctx, id, "skipped")
	}
	source := info.Messages[0].Conversation.ContactInbox.Source
	if len(source) != 64 || strings.ContainsAny(source, "/?.%") {
		return a.state(ctx, id, "manual_review")
	}
	var history []publicMessage
	if err = a.request(ctx, "GET", a.publicPath(session{Source: source, Conversation: conversation})+"/messages", nil, false, &history); err != nil {
		return err
	}
	for _, m := range history {
		if m.Type == 1 && (m.Source == marker || m.Attributes["dracma_reply_to"] == marker) {
			return a.state(ctx, id, "done")
		}
	}
	if state == "sending" || state == "uncertain" {
		_ = a.state(ctx, id, "manual_review")
		_ = a.request(ctx, "POST", base+"/toggle_status", map[string]string{"status": "open"}, true, nil)
		return nil
	}
	if info.Status != "pending" {
		return a.state(ctx, id, "skipped")
	}
	var content string
	for _, m := range history {
		if m.ID == id && m.Type == 0 && !m.Private {
			content = m.Content
			break
		}
	}
	if content == "" {
		return a.state(ctx, id, "skipped")
	}
	locale := "es"
	err = a.db.QueryRow(ctx, "SELECT locale FROM dracma_agent.conversation_locales WHERE conversation_id=$1", conversation).Scan(&locale)
	if err != nil && err != pgx.ErrNoRows {
		return err
	}
	answer, handoff := a.answerIn(content, locale)
	// Persist intent before the HTTP side effect. Never blindly replay an ambiguous send.
	if err = a.state(ctx, id, "sending"); err != nil {
		return err
	}
	payload := map[string]any{"content": answer, "message_type": "outgoing", "private": false, "source_id": marker, "content_attributes": map[string]any{"in_reply_to": id, "dracma_reply_to": marker}}
	if err = a.request(ctx, "POST", base+"/messages", payload, true, nil); err != nil {
		_ = a.state(ctx, id, "uncertain")
		return nil
	}
	if err = a.state(ctx, id, "done"); err != nil {
		return err
	}
	if handoff {
		_ = a.request(ctx, "POST", base+"/toggle_status", map[string]string{"status": "open"}, true, nil)
	}
	return nil
}
