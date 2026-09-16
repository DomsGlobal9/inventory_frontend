# Inventory web app.
#
#   docker build --build-arg VITE_API_URL=https://inventory-backend-1-ym8d.onrender.com/api/v1 -t scaleezy-inventory-frontend .
#   docker run -p 8080:8080 scaleezy-inventory-frontend
#
# Built once with Vite, then served as static files by nginx. The API address is a BUILD argument,
# not a run-time setting: Vite writes VITE_* values into the JavaScript while building, so an image
# built for one backend always talks to that backend. Build one image per environment.

ARG NODE_VERSION=22.16.0

# ── 1. Build ────────────────────────────────────────────────────────────────────────────────
FROM node:${NODE_VERSION}-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .

ARG VITE_API_URL
# Refused here rather than shipped: src/lib/config.ts stops a production build that has no API
# address from starting at all, which would otherwise surface as a blank page after deploying.
RUN test -n "$VITE_API_URL" || (echo "Build with --build-arg VITE_API_URL=<backend>/api/v1" && exit 1)
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# ── 2. Serve ────────────────────────────────────────────────────────────────────────────────
# The unprivileged nginx image runs as a non-root user and listens on 8080.
FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
