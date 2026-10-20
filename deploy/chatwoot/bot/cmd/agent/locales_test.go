package main

import (
	"encoding/json"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
)

func TestEveryLanguageRoutesQuestionsAndProtectsHandoff(t *testing.T) {
	a := testApp(t)
	data, err := os.ReadFile("../../faq.json")
	if err != nil {
		t.Fatal(err)
	}
	if err = json.Unmarshal(data, &a.faq); err != nil {
		t.Fatal(err)
	}
	data, err = os.ReadFile("../../faq-locales.json")
	if err != nil {
		t.Fatal(err)
	}
	if err = json.Unmarshal(data, &a.locales); err != nil {
		t.Fatal(err)
	}
	for _, l := range []string{"es", "en", "ar", "zh", "ru", "it"} {
		set := a.localized(l)
		if len(set.Questions) != 10 {
			t.Fatal("incomplete FAQ", l)
		}
		for _, f := range set.Questions {
			answer, handoff := a.answerIn(f.Question, l)
			if answer != f.Answer || handoff != f.Handoff {
				t.Fatalf("incorrect localized answer: %s %s", l, f.ID)
			}
		}
		answer, handoff := a.answerIn("UNVERIFIED_XYZ_178", l)
		if !handoff || answer != set.Fallback {
			t.Fatal("unknown question did not use the selected language", l)
		}
		r := httptest.NewRequest("GET", "/chat/questions", nil)
		r.Header.Set("X-Dracma-Locale", l)
		w := httptest.NewRecorder()
		a.questions(w, r)
		var response struct {
			Locale    string `json:"locale"`
			Questions []FAQ  `json:"questions"`
		}
		if w.Code != 200 || json.Unmarshal(w.Body.Bytes(), &response) != nil || response.Locale != l || response.Questions[0].Question != set.Questions[0].Question {
			t.Fatal("localized questions API failed", l)
		}
	}
	for l, question := range map[string]string{"en": "I need human support for this project", "ar": "أحتاج الدعم البشري بخصوص المشروع", "zh": "我要人工客服讨论这个项目", "ru": "Хочу связаться с командой по проекту", "it": "Voglio parlare con un operatore del progetto"} {
		_, handoff := a.answerIn(question, l)
		if !handoff {
			t.Fatal("human request was overridden by a topic", l)
		}
	}
	for l, question := range map[string]string{"en": "What is the DRACMA token price?", "ar": "ما سعر DRACMA؟", "zh": "DRACMA价格是多少？", "ru": "Какая цена DRACMA?", "it": "Qual è il prezzo DRACMA?"} {
		answer, handoff := a.answerIn(question, l)
		if handoff || !strings.Contains(answer, "/"+l+"/comprar/") {
			t.Fatal("free-text token question failed", l, answer)
		}
	}
}
