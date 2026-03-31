FROM debian:trixie-slim

ENV DEBIAN_FRONTEND=noninteractive
ENV NODE_ENV=production
ENV EASY_LATEX_PORT=9999
ENV EASY_LATEX_DATA_DIR=/var/lib/easy-latex

WORKDIR /opt/easy-latex

COPY deploy/apt-packages.txt /tmp/apt-packages.txt

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl gnupg git build-essential pkg-config nodejs npm \
  && awk '!/^[[:space:]]*(#|$)/ {print $1}' /tmp/apt-packages.txt | xargs apt-get install -y --no-install-recommends \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

RUN useradd --system --home-dir /var/lib/easy-latex --no-create-home --shell /usr/sbin/nologin easylatex \
  && mkdir -p /var/lib/easy-latex \
  && chown -R easylatex:easylatex /var/lib/easy-latex /opt/easy-latex

USER easylatex

EXPOSE 9999

HEALTHCHECK --interval=30s --timeout=10s --start-period=45s --retries=3 \
  CMD node --input-type=module -e "const r=await fetch('http://127.0.0.1:9999/health'); process.exit(r.ok?0:1)"

CMD ["node", "src/server.js"]
