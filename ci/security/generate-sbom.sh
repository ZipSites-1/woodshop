#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
BIN_DIR="${REPO_ROOT}/ci/bin"
OUTPUT_DIR="${REPO_ROOT}/artifacts/sbom"

mkdir -p "$BIN_DIR" "$OUTPUT_DIR"

SYFT_VERSION="${SYFT_VERSION:-1.9.0}"

function detect_platform() {
  local os arch
  os=$(uname -s)
  arch=$(uname -m)

  case "$os" in
    Linux) os="linux" ;;
    Darwin) os="darwin" ;;
    *)
      echo "[security] Unsupported OS: $os" >&2
      exit 1
      ;;
  esac

  case "$arch" in
    x86_64|amd64) arch="amd64" ;;
    arm64|aarch64) arch="arm64" ;;
    *)
      echo "[security] Unsupported architecture: $arch" >&2
      exit 1
      ;;
  esac

  echo "${os}_${arch}"
}

function ensure_syft() {
  local platform archive url tmp
  platform=$(detect_platform)
  archive="syft_${SYFT_VERSION}_${platform}.tar.gz"
  url="https://github.com/anchore/syft/releases/download/v${SYFT_VERSION}/${archive}"
  tmp=$(mktemp)

  if [[ -x "${BIN_DIR}/syft" ]]; then
    if "${BIN_DIR}/syft" version 2>/dev/null | grep -q "${SYFT_VERSION}"; then
      return
    fi
    rm -f "${BIN_DIR}/syft"
  fi

  echo "[security] Installing syft ${SYFT_VERSION} (${platform})"
  curl -sSL "$url" -o "$tmp"
  tar -xzf "$tmp" -C "$BIN_DIR" syft
  rm -f "$tmp"
  chmod +x "${BIN_DIR}/syft"
}

ensure_syft

GIT_SHA=$(git -C "$REPO_ROOT" rev-parse --short HEAD)
TIMESTAMP=$(date -u +%Y%m%dT%H%M%SZ)
OUTPUT_FILE="${OUTPUT_DIR}/woodshop-${GIT_SHA}-${TIMESTAMP}.spdx.json"

echo "[security] Generating SBOM to $OUTPUT_FILE"

"${BIN_DIR}/syft" dir:"$REPO_ROOT" \
  --output "spdx-json=$OUTPUT_FILE"

echo "[security] SBOM ready at $OUTPUT_FILE"
