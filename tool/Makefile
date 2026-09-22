# cairn's Go operator CLI. `make check` is the gate: a check either gates
# here or does not exist. Tool binaries (golangci-lint, govulncheck) build
# from tools/go.mod, an isolated module so the product go.mod stays
# dependency-free of tooling.

BINARY := cairn
MODULE := github.com/glw907/cairn-cms/tool
GOLANGCI := tools/bin/golangci-lint
GOVULNCHECK := tools/bin/govulncheck

# The tag namespace prefix comes off the described version: `tool/v` is how this monorepo
# separates the CLI's tags from the package's, and it is not part of the version an operator
# reads out of `cairn --version`. The release workflow strips it the same way.
DESCRIBED := $(shell git describe --tags --match 'tool/v*' --dirty --always 2>/dev/null || echo dev)
VERSION := $(patsubst tool/v%,%,$(DESCRIBED))
COMMIT := $(shell git rev-parse --short HEAD 2>/dev/null || echo none)
LDFLAGS := -X '$(MODULE)/internal/version.Version=$(VERSION)' -X '$(MODULE)/internal/version.Commit=$(COMMIT)'

.PHONY: all build test vet install install-check check clean golden man \
	tidy-check fmt-check lint vulncheck vale-comments \
	copy-list check-copy copy-review \
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

# man writes every man page to man/, fresh from a build it runs itself: cmd/mangen harvests the
# tree from the real binary's own --help text rather than importing cmd/cairn (a package main,
# which Go forbids importing), so it always builds cairn before reading it.
man:
	go run ./cmd/mangen man

install: build man
	install -m 0755 $(BINARY) "$(HOME)/.local/bin/$(BINARY)"
	install -d "$(HOME)/.local/share/man/man1"
	install -m 0644 man/*.1 "$(HOME)/.local/share/man/man1/"

# install-check is local-only and never part of `check`: it needs podman and the network, and it
# reads the module proxy rather than this working tree, so it can only run after a tag is
# published. Pass the tag: `make install-check VERSION=v1.0.1`. Read scripts/install-check.sh for
# what each of its two containers proves.
install-check:
	./scripts/install-check.sh "$(VERSION)"

check: tidy-check fmt-check vet lint vulncheck vale-comments check-copy test

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

# copy-list writes testdata/copy.golden.md from internal/health's own messages and fix tables
# (tool/docs/design/copy-standard.md section 4.3). Run this and commit the diff whenever a task
# adds an operator-facing string.
copy-list:
	go run ./cmd/copylist > testdata/copy.golden.md

# check-copy is the light-lane half of `make check`: it runs no browser and reads no Go source,
# only the committed golden. It never runs `make copy-list` itself, so a new string that never
# made it into the golden fails TestRenderMatchesCommittedGolden (in `make test`) rather than
# silently passing here. On failure, read tool/docs/design/copy-standard.md.
check-copy:
	./scripts/check-copy.sh

# copy-review is local-only, never part of `check`: tellgrader is a Linux-only binary at
# ~/.local/bin, and .github/workflows/tool.yml runs `make -C tool check` on macOS and Windows
# runners too, where this step would hard-fail rather than skip. It is the editorial gate Task
# 22a runs once before the 1.0 tag (copy-standard.md section 4.5).
copy-review:
	tellgrader --register editor testdata/copy.golden.md

# golden recuts every committed render frame from the current renderer. Run it and read the
# diff whenever a body changes; `make test` compares the committed frames on every run, so a
# frame that changed without this step is a failing test rather than a silent drift.
golden:
	go test ./internal/render -run TestGolden -update

build-golangci-lint:
	go build -C tools -o ../$(GOLANGCI) github.com/golangci/golangci-lint/v2/cmd/golangci-lint

build-govulncheck:
	go build -C tools -o ../$(GOVULNCHECK) golang.org/x/vuln/cmd/govulncheck

clean:
	rm -f $(BINARY)
	rm -rf tools/bin
