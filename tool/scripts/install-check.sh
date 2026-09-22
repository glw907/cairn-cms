#!/usr/bin/env bash
# install-check proves a published tag installs on a machine that holds no copy of this
# repository: two containers, each with its own empty module cache, each running
# `go install github.com/glw907/cairn-cms/tool/cmd/cairn@<version>` and then the binary.
#
# The two differ in one variable, which is the whole point. The first runs the current Go image
# with the default GOTOOLCHAIN, so Go downloads whatever toolchain the module asks for and the
# install succeeds however high the `go` directive sits. The second runs the image pinned at
# exactly that directive's own minimum with GOTOOLCHAIN=local, which forbids the download, so it
# succeeds only if the directive is the true floor rather than the version that happened to be
# installed when the tag was cut.
#
# Run it after publishing a tag, never before: `go install` reads the module proxy, not the
# working tree.
#
# Usage: make -C tool install-check VERSION=v1.0.1

set -euo pipefail

version="${1:?usage: install-check.sh <version>}"
case "$version" in
v*) ;;
*) version="v${version}" ;;
esac

# MINIMUM_IMAGE tracks go.mod's own `go` directive. Raising one without the other turns this
# check green while proving nothing about the floor an operator actually meets.
MINIMUM_IMAGE="docker.io/library/golang:1.26"
DEFAULT_IMAGE="docker.io/library/golang:latest"
MODULE="github.com/glw907/cairn-cms/tool/cmd/cairn"

if ! command -v podman >/dev/null 2>&1; then
	echo "install-check: podman is not installed" >&2
	exit 1
fi

# --pull=newer keeps a stale local image from answering for the toolchain under test, and the
# absence of any volume mount is what makes each run a clean machine.
run_container() {
	local label="$1" image="$2"
	shift 2
	echo
	echo "== ${label}: ${image} $*"
	podman run --rm --pull=newer "$@" "$image" sh -c \
		"go install ${MODULE}@${version} && \"\$(go env GOPATH)\"/bin/cairn --version"
}

status=0

if ! run_container "default toolchain" "$DEFAULT_IMAGE"; then
	echo "install-check: the default-toolchain install failed" >&2
	status=1
fi

if ! run_container "minimum toolchain, no download" "$MINIMUM_IMAGE" -e GOTOOLCHAIN=local; then
	echo "install-check: ${version} cannot be installed on the toolchain its own go directive names" >&2
	status=1
fi

exit "$status"
