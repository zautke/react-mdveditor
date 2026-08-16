FROM node:24-alpine AS base

WORKDIR /app

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable

# Only design-system/ui is copied, though pnpm-workspace.yaml also globs apps/*.
# That is deliberate: apps/tabbar-harness is a standalone Next.js harness the
# image does not serve, and pnpm treats a workspace glob matching nothing as an
# empty set rather than an error, so --frozen-lockfile is still satisfied.
# Copying its manifest here would pull Next.js into the image for nothing.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY design-system/ui/package.json design-system/ui/package.json

RUN pnpm install --frozen-lockfile

COPY . .

# The app imports '@braisenly/ui/tab-system', whose package exports point at
# design-system/ui/dist — a gitignored build artifact. Without this the image
# only builds when the developer's working tree happens to contain a dist from
# an earlier local build; a clean checkout fails module resolution in `pnpm
# build` and in the vite dev server alike. apps/tabbar-harness already encodes
# this same dependency as a prebuild/predev hook.
RUN pnpm --filter @braisenly/ui build

FROM base AS build

RUN pnpm build

FROM base AS dev

EXPOSE 5250

CMD ["sh", "-c", "pnpm dev --host 0.0.0.0 --port ${MDE_DEV_PORT:-5250}"]

FROM nginxinc/nginx-unprivileged:1.29-alpine AS runtime

USER root

RUN apk add --no-cache curl

COPY --from=build --chown=101:101 /app/dist /usr/share/nginx/html
COPY --chown=101:101 nginx.conf /etc/nginx/nginx.conf.template
COPY --chmod=755 --chown=101:101 docker/nginx-entrypoint.sh /docker-entrypoint.sh

USER 101

EXPOSE 8080

ENTRYPOINT ["/docker-entrypoint.sh"]
