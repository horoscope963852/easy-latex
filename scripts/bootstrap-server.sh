#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
TARGET_DIR=/opt/easy-latex
BASE_PACKAGES=(
  ca-certificates
  curl
  git
  gnupg
  rsync
  build-essential
  pkg-config
)

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run this script with sudo or as root." >&2
  exit 1
fi

install_nodesource_20() {
  install -d -m 0755 /etc/apt/keyrings
  if [[ ! -f /etc/apt/keyrings/nodesource.gpg ]]; then
    curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key \
      | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
  fi
  cat >/etc/apt/sources.list.d/nodesource.list <<'EOF'
deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main
EOF
  apt-get update
  apt-get install -y nodejs
}

ensure_node_20() {
  if command -v node >/dev/null 2>&1; then
    local major
    major="$(node -p "process.versions.node.split('.')[0]")"
    if [[ "$major" == "20" ]]; then
      return
    fi
  fi

  install_nodesource_20
}

sync_repo() {
  install -d -m 0755 /opt
  if [[ "$REPO_DIR" == "$TARGET_DIR" ]]; then
    return
  fi

  rsync -a --delete \
    --exclude '.git/' \
    --exclude 'node_modules/' \
    "$REPO_DIR/" "$TARGET_DIR/"
}

apt-get update
apt-get install -y "${BASE_PACKAGES[@]}"
ensure_node_20
sync_repo

cd "$TARGET_DIR"

"$TARGET_DIR/scripts/install-tex-deps.sh"
npm ci --omit=dev
"$TARGET_DIR/scripts/install-systemd.sh"
"$TARGET_DIR/scripts/verify-install.sh"

cat <<'EOF'

easy-latex bootstrap complete.
Open http://SERVER_IP:9999/admin to create the first admin account.
EOF
