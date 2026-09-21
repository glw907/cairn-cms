# cairn's Go operator CLI. `make check` is the gate: a check either gates
# here or does not exist. Tool binaries (golangci-lint, govulncheck) build
# from tools/go.mod, an isolated module so the product go.mod stays
# dependency-free of tooling.

BINARY := cairn
MODULE := github.com/glw907/cairn-cms/tool
GOLANGCI := tools/bin/golangci-lint
GOVULNCHECK := tools/bin/govulncheck

VERSION := $(shell git describe --tags --match 'tool/v*' --dirty --always 2>/dev/null || echo dev)
COMMIT := $(shell git rev-parse --short HEAD 2>/dev/null || echo none)
LDFLAGS := -X '$(MODULE)/internal/version.Version=$(VERSION)' -X '$(MODULE)/internal/version.Commit=$(COMMIT)'

.PHONY: all build test vet install check clean \
	tidy-check fmt-check lint vulncheck vale-comments \
	build-golangci-lint build-govulncheck

all: check

build:
	go build -trimpath -ldflags "$(LDFLAGS)" -o $(BINARY) ./cmd/cairn

# -count=1 disables the test cache: several tests (spine, logs, health, providers) read files
# outside this module (conditions.ts, events.ts, docs, the create-cairn-site sources), and the
# cache does not track those as inputs, so a cached pass can stay green after they drift on main.
test:
	go test -count=1 ./...

vet:
	go vet ./...

install: build
	install -m 0755 $(BINARY) "$(HOME)/.local/bin/$(BINARY)"

check: tidy-check fmt-check vet lint vulncheck vale-comments test

tidy-check:
	go mod tidy
	git diff --exit-code -- go.mod go.sum

fmt-check: build-golangci-lint
	./$(GOLANGCI) fmt --config .golangci.yml --diff ./...

lint: build-golangci-lint
	./$(GOLANGCI) run --config .golangci.yml ./...

vulncheck: build-govulncheck
	./$(GOVULNCHECK) ./...

vale-comments:
	./scripts/vale-comments.sh

build-golangci-lint:
	go build -C tools -o ../$(GOLANGCI) github.com/golangci/golangci-lint/v2/cmd/golangci-lint

build-govulncheck:
	go build -C tools -o ../$(GOVULNCHECK) golang.org/x/vuln/cmd/govulncheck

clean:
	rm -f $(BINARY)
	rm -rf tools/bin
