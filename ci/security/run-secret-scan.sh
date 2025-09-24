#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
BIN_DIR="${REPO_ROOT}/ci/bin"
REPORT_DIR="${REPO_ROOT}/artifacts/security"
REPORT_PATH="${REPORT_DIR}/gitleaks-report.json"
mkdir -p "$BIN_DIR" "$REPORT_DIR"

GITLEAKS_VERSION="${GITLEAKS_VERSION:-8.18.2}"

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
    x86_64|amd64) arch="x64" ;;
    arm64|aarch64)
      arch="arm64"
      ;;
    *)
      echo "[security] Unsupported architecture: $arch" >&2
      exit 1
      ;;
  esac

  echo "${os}_${arch}"
}

function ensure_gitleaks() {
  local platform archive url tmp
  platform=$(detect_platform)
  archive="gitleaks_${GITLEAKS_VERSION}_${platform}.tar.gz"
  url="https://github.com/gitleaks/gitleaks/releases/download/v${GITLEAKS_VERSION}/${archive}"
  tmp=$(mktemp)

  if [[ -x "${BIN_DIR}/gitleaks" ]]; then
    if "${BIN_DIR}/gitleaks" version 2>/dev/null | grep -q "${GITLEAKS_VERSION}"; then
      return
    fi
    rm -f "${BIN_DIR}/gitleaks"
  fi

  echo "[security] Installing gitleaks ${GITLEAKS_VERSION} (${platform})"
  curl -sSL "$url" -o "$tmp"
  tar -xzf "$tmp" -C "$BIN_DIR" gitleaks
  rm -f "$tmp"
  chmod +x "${BIN_DIR}/gitleaks"
}

ensure_gitleaks

echo "[security] Running secret scan from $REPO_ROOT"

"${BIN_DIR}/gitleaks" detect \
  --source "$REPO_ROOT" \
  --config "${SCRIPT_DIR}/gitleaks.toml" \
  --redact \
  --report-format json \
  --report-path "$REPORT_PATH"

echo "[security] Secret scan complete. Report written to $REPORT_PATH"
