# Docker Deployment

[中文版本](docker-deploy.zh-CN.md)

## Goal

This Docker setup provides a containerized way to reproduce the current `easy-latex` stack, including frontend, backend, TeX tooling, and fonts.

It is intended as an alternative to the host-level bootstrap flow. The host-level `systemd` deployment remains the primary recommendation for production on a single VPS.

## Files

- `Dockerfile`
- `docker-compose.yml`
- `.dockerignore`

## What the Container Includes

- Node.js 20 on Debian `trixie`
- The same TeX/tooling package baseline listed in `deploy/apt-packages.txt`
- The `easy-latex` application running directly with `node src/server.js`

## What the Container Does Not Use

- `systemd`
- host-level cleanup timer units

The application still runs its internal cleanup loop, so guest/session cleanup remains active.

## Run with Docker Compose

```bash
docker compose up -d --build
```

Then open:

```text
http://SERVER_IP:9999/admin
```

## Data Persistence

Persistent application data is stored in the named Docker volume:

```text
easy_latex_data
```

This volume maps to:

```text
/var/lib/easy-latex
```

inside the container.

## Notes

- The Docker image is large because it includes a broad TeX/tooling baseline.
- For documents that require external commands, you still need the project compile mode set to `relaxed`.
