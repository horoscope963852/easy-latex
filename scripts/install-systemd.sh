#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DATA_DIR=/var/lib/easy-latex
ENV_DIR=/etc/easy-latex
ENV_FILE="$ENV_DIR/easy-latex.env"
SERVICE_USER=easylatex

if ! id "$SERVICE_USER" >/dev/null 2>&1; then
  useradd --system --home-dir "$DATA_DIR" --no-create-home --shell /usr/sbin/nologin "$SERVICE_USER"
fi

mkdir -p "$DATA_DIR" "$ENV_DIR"
chown -R "$SERVICE_USER:$SERVICE_USER" "$DATA_DIR"

if [ ! -f "$ENV_FILE" ]; then
  install -m 640 "$APP_DIR/.env.example" "$ENV_FILE"
fi

install -m 644 "$APP_DIR/systemd/easy-latex.service" /etc/systemd/system/easy-latex.service
install -m 644 "$APP_DIR/systemd/easy-latex-cleanup.service" /etc/systemd/system/easy-latex-cleanup.service
install -m 644 "$APP_DIR/systemd/easy-latex-cleanup.timer" /etc/systemd/system/easy-latex-cleanup.timer

systemctl daemon-reload
systemctl enable --now easy-latex.service
systemctl enable --now easy-latex-cleanup.timer

echo "easy-latex systemd units installed."
