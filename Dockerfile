FROM node:24-alpine AS base

WORKDIR /app

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY design-system/ui/package.json design-system/ui/package.json

RUN pnpm install --frozen-lockfile

COPY . .

FROM base AS build

RUN pnpm build

FROM base AS dev

EXPOSE 5250

CMD ["sh", "-c", "pnpm dev --host 0.0.0.0 --port ${MDE_DEV_PORT:-5250}"]

FROM nginxinc/nginx-unprivileged:1.29-alpine AS runtime

COPY --from=build --chown=101:101 /app/dist /usr/share/nginx/html
COPY --chown=101:101 nginx.conf /etc/nginx/nginx.conf.template
COPY --chmod=755 --chown=101:101 docker/nginx-entrypoint.sh /docker-entrypoint.sh

USER 101

EXPOSE 8080

ENTRYPOINT ["/docker-entrypoint.sh"]
