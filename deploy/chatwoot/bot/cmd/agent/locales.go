package main

import (
	"net/http"
	"strings"
)

type LocalizedFAQ struct {
	Questions []FAQ  `json:"questions"`
	Greeting  string `json:"greeting"`
	Fallback  string `json:"fallback"`
	Notice    string `json:"notice"`
}

func validLocale(locale string) bool {
	switch locale {
	case "es", "en", "ar", "zh", "ru", "it":
		return true
	}
	return false
}
func requestLocale(r *http.Request) string {
	l := strings.ToLower(strings.Split(r.Header.Get("X-Dracma-Locale"), "-")[0])
	if !validLocale(l) {
		return "es"
	}
	return l
}
func (a *App) localized(locale string) LocalizedFAQ {
	if f, ok := a.locales[locale]; ok && len(f.Questions) > 0 {
		return f
	}
	return LocalizedFAQ{Questions: a.faq,
		Greeting: "Hola. Soy el asistente de preguntas frecuentes de DRACMA. Puedo explicar proyectos, comisiones, riesgos, contratos y el proceso de compra usando información pública. Elige una pregunta sugerida o cuéntame qué quieres revisar.",
		Fallback: "No tengo una respuesta verificada para esa consulta. Puedo explicar la información pública de proyectos, comisiones, riesgos y compra del token; no veo cuentas ni documentos privados. He dejado esta conversación para revisión del equipo, sin un plazo de respuesta confirmado. No compartas claves privadas, contraseñas ni documentos de identidad.",
		Notice:   "Respuestas automáticas basadas en información pública. No consulta cuentas privadas ni envía avisos contables."}
}

func (a *App) answerIn(content, locale string) (string, bool) {
	target := a.localized(locale)
	n := normalized(content)
	sets := [][]FAQ{target.Questions, a.faq}
	for _, l := range []string{"en", "ar", "zh", "ru", "it"} {
		sets = append(sets, a.localized(l).Questions)
	}
	answer := func(id string) (string, bool) {
		for _, f := range target.Questions {
			if f.ID == id {
				return f.Answer, f.Handoff
			}
		}
		return target.Fallback, true
	}
	for _, set := range sets {
		for _, f := range set {
			if n == normalized(f.Question) {
				return answer(f.ID)
			}
		}
	}
	for _, set := range sets {
		for _, f := range set {
			if f.Handoff {
				for _, term := range f.Terms {
					if strings.Contains(n, normalized(term)) {
						return answer(f.ID)
					}
				}
			}
		}
	}
	best, score := "", 0
	for _, set := range sets {
		for _, f := range set {
			hits := 0
			for _, term := range f.Terms {
				if term != "" && strings.Contains(n, normalized(term)) {
					hits++
				}
			}
			if hits > score {
				best, score = f.ID, hits
			}
		}
	}
	if best != "" {
		return answer(best)
	}
	for _, word := range strings.Fields(n) {
		for _, greeting := range []string{"hola", "gracias", "hello", "hi", "thanks", "ciao", "grazie", "привет", "спасибо", "مرحبا", "شكرا", "你好", "谢谢"} {
			if word == greeting {
				return target.Greeting, false
			}
		}
	}
	return target.Fallback, true
}
