#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PACKAGE_FILE="$REPO_DIR/deploy/apt-packages.txt"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run this script as root." >&2
  exit 1
fi

if [[ ! -f "$PACKAGE_FILE" ]]; then
  echo "Package manifest not found: $PACKAGE_FILE" >&2
  exit 1
fi

mapfile -t PACKAGES < <(grep -Ev '^\s*(#|$)' "$PACKAGE_FILE")

if [[ "${#PACKAGES[@]}" -eq 0 ]]; then
  echo "No packages defined in $PACKAGE_FILE" >&2
  exit 1
fi

apt-get update
apt-get install -y "${PACKAGES[@]}"

echo "easy-latex TeX/tooling dependencies installed."
