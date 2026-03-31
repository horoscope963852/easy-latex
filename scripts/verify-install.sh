#!/usr/bin/env bash
set -euo pipefail

REQUIRED_COMMANDS=(
  node
  npm
  pdflatex
  xelatex
  lualatex
  latexmk
  biber
  pygmentize
  gnuplot
  dot
  asy
  inkscape
  magick
  pdftotext
  xindy
)

for cmd in "${REQUIRED_COMMANDS[@]}"; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Missing required command: $cmd" >&2
    exit 1
  fi
done

systemctl is-active --quiet easy-latex.service

if command -v curl >/dev/null 2>&1; then
  curl -fsS http://127.0.0.1:9999/health >/dev/null
else
  node --input-type=module -e "const r=await fetch('http://127.0.0.1:9999/health'); if (!r.ok) process.exit(1);" >/dev/null
fi

WORKDIR="$(mktemp -d)"
trap 'rm -rf "$WORKDIR"' EXIT

cat >"$WORKDIR/smoke.tex" <<'EOF'
\documentclass{ctexart}
\usepackage{fontawesome5}
\usepackage{biblatex}
\addbibresource{refs.bib}

\begin{document}
你好，easy-latex。\faIcon{check}

引用测试~\cite{knuth1984}。

\printbibliography
\end{document}
EOF

cat >"$WORKDIR/refs.bib" <<'EOF'
@book{knuth1984,
  author    = {Donald E. Knuth},
  title     = {The TeXbook},
  year      = {1984},
  publisher = {Addison-Wesley}
}
EOF

(
  cd "$WORKDIR"
  timeout 180s latexmk -norc -f -xelatex -outdir=out -auxdir=out smoke.tex >/dev/null 2>&1
)

if [[ ! -f "$WORKDIR/out/smoke.pdf" ]]; then
  echo "Smoke test PDF was not generated." >&2
  exit 1
fi

echo "easy-latex installation verified."
