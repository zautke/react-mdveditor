FROM node:24-alpine

WORKDIR /app

# Zero runtime dependencies — the sidecar uses only node:http + node:sqlite,
# executed straight from TypeScript via Node's built-in type stripping.
COPY package.json ./
COPY db.ts backup.ts server.ts ./

ENV MDE_DB_SIDECAR_INTERNAL_PORT=15280
ENV MDE_DB_PATH=/data/mdeditor.db

EXPOSE 15280

CMD ["sh", "-c", "node server.ts"]
