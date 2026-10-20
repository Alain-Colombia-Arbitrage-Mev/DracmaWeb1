FROM golang:1.26.9-alpine@sha256:3082400e369fa24d5fc60bca20edab3f6d604e0c5a690ec66b295eff4dd87ade AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY cmd ./cmd
RUN CGO_ENABLED=0 go build -trimpath -ldflags='-s -w' -o /out/agent ./cmd/agent
FROM scratch
COPY --from=build /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/ca-certificates.crt
COPY --from=build /out/agent /agent
COPY --chmod=0444 faq.json /faq.json
COPY --chmod=0444 faq-locales.json /faq-locales.json
USER 65532:65532
EXPOSE 8080
ENTRYPOINT ["/agent"]
