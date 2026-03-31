# easy-latex

`easy-latex` is a single-host online LaTeX editor/compiler for direct `IP:9999` access. It includes the frontend, backend, systemd units, and bootstrap scripts needed to reproduce the running service on a Debian server.

[中文文档 / Chinese documentation](README.zh-CN.md)

## What This Repository Publishes

- Frontend and backend source code in one repository
- Bootstrap/install/verify scripts for a fresh server
- `systemd` service units
- Environment template
- Reproducible TeX/tooling package manifest

This repository does **not** include runtime state:

- user data
- database contents
- sessions
- previews
- uploaded projects
- `/etc/easy-latex/easy-latex.env`

## Main Features

- Username/password user accounts only
- Admin-controlled auth toggle
- Anonymous guest mode when auth is disabled
- Multi-file LaTeX projects with selectable main `.tex`
- Side-by-side source editor and PDF preview
- Manual compile plus optional auto compile
- Download compiled PDF or save it into a logged-in user's cloud space
- Per-user storage quota of `256MB`
- First-login onboarding guide
- Chinese/English UI toggle
- Default XeLaTeX-oriented workflow for Chinese documents

## Recommended Publish/Deploy Model

Use this repository as the source of truth, and deploy with:

```bash
git clone https://github.com/horoscope963852/easy-latex.git
cd easy-latex
sudo ./scripts/bootstrap-server.sh
```

This model is preferred over publishing only a huge shell script, because it keeps version control, reviewability, and reproducible installation together.

## Quick Start on a Fresh Server

Supported baseline:

- Debian 13 (`trixie`) compatible host
- `systemd`
- outbound network access for `apt` and `npm`

Run:

```bash
git clone https://github.com/horoscope963852/easy-latex.git /root/easy-latex
cd /root/easy-latex
sudo ./scripts/bootstrap-server.sh
```

The bootstrap script will:

1. Install base OS packages and Node.js 20
2. Sync the repository into `/opt/easy-latex`
3. Install TeX/tooling dependencies
4. Run `npm ci`
5. Install and start the `systemd` service
6. Run a smoke-test verification

Then open:

```text
http://SERVER_IP:9999/admin
```

and create the first admin account.

## Important Paths

- Code: `/opt/easy-latex`
- Data: `/var/lib/easy-latex`
- Environment file: `/etc/easy-latex/easy-latex.env`
- Service: `easy-latex.service`
- Cleanup timer: `easy-latex-cleanup.timer`

## Repository Layout

- `public/`: frontend assets
- `src/`: backend source
- `scripts/bootstrap-server.sh`: one-command server bootstrap
- `scripts/install-tex-deps.sh`: TeX/tooling dependency installer
- `scripts/install-systemd.sh`: service installation
- `scripts/verify-install.sh`: smoke-test verification
- `deploy/apt-packages.txt`: curated apt dependency manifest
- `systemd/`: systemd unit files

## Environment Configuration

Use `.env.example` as the starting point. On deployed hosts the live environment file is:

```text
/etc/easy-latex/easy-latex.env
```

Defaults include:

- Port: `9999`
- Auth system: enabled
- Default engine: `xelatex`
- Max concurrent logged-in normal users: `10`
- User storage quota: `256MB`
- Guest retention: `24h`
- Safe compile mode disables `shell-escape`

## Verification

After install, the verifier runs a small XeLaTeX + bibliography smoke test. You can also rerun it manually:

```bash
sudo /opt/easy-latex/scripts/verify-install.sh
```

## Docker Deployment

An optional Docker-based reproduction path is also included:

```bash
docker compose up -d --build
```

See:

- [docker-deploy.md](docs/docker-deploy.md)
- [docker-deploy.zh-CN.md](docs/docker-deploy.zh-CN.md)

## Versioning and Releases

- Versioning follows SemVer
- Git tags use the form `vX.Y.Z`
- Release workflow details:
  [release-process.md](docs/release-process.md)
  and
  [release-process.zh-CN.md](docs/release-process.zh-CN.md)

## Extra Documentation

- Runtime baseline: [runtime-baseline.md](docs/runtime-baseline.md)
- Runtime baseline (Chinese): [runtime-baseline.zh-CN.md](docs/runtime-baseline.zh-CN.md)
- GitHub SSH publish flow: [github-ssh-publish.md](docs/github-ssh-publish.md)
- GitHub SSH publish flow (Chinese): [github-ssh-publish.zh-CN.md](docs/github-ssh-publish.zh-CN.md)
- Changelog: [CHANGELOG.md](CHANGELOG.md)
- Changelog (Chinese): [CHANGELOG.zh-CN.md](CHANGELOG.zh-CN.md)
