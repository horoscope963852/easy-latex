# Runtime Baseline

[中文版本](runtime-baseline.zh-CN.md)

This repository is intended to reproduce the current single-host deployment shape of `easy-latex`.

## Tested Host Profile

- OS family: Debian 13 (`trixie`) compatible systems
- Node.js: 20.x
- npm: bundled with Node 20
- Service manager: `systemd`
- Port: `9999`

## Installed Tooling Baseline

The bootstrap path installs the package list in [apt-packages.txt](../deploy/apt-packages.txt), which currently covers:

- TeX Live base, XeLaTeX, LuaLaTeX, language packs, science/bibtex/pstricks extras
- `latexmk`, `biber`, `xindy`
- `python3-pygments` for `minted`
- `gnuplot`, `graphviz`, `asymptote`, `inkscape`, `imagemagick`
- `ghostscript`, `poppler-utils`
- CJK fonts including `Noto Sans CJK SC`, `Noto Serif CJK SC`, `WenQuanYi Zen Hei`

## Runtime Layout

- Code: `/opt/easy-latex`
- Environment file: `/etc/easy-latex/easy-latex.env`
- Data: `/var/lib/easy-latex`
- Service: `easy-latex.service`
- Cleanup timer: `easy-latex-cleanup.timer`

## Reproducibility Notes

- Repository contents include both frontend and backend sources.
- The repository does not include runtime state, user data, database files, sessions, previews, or uploaded projects.
- `scripts/bootstrap-server.sh` is the preferred reproduction entrypoint on a fresh server.
