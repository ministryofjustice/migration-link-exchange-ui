FROM node:22.13-bookworm-slim AS base

LABEL maintainer="HMPPS Digital Studio <info@digital.justice.gov.uk>"

ENV TZ=Europe/London
RUN ln -snf "/usr/share/zoneinfo/$TZ" /etc/localtime && echo "$TZ" > /etc/timezone

RUN addgroup --gid 2000 --system appgroup && \
    adduser --uid 2000 --system appuser --gid 2000

WORKDIR /app

RUN apt-get update && \
    apt-get upgrade -y && \
    apt-get autoremove -y && \
    apt-get install -y make g++ curl && \
    rm -rf /var/lib/apt/lists/*

FROM base AS development
ENV NODE_ENV='development'

FROM base AS build

COPY . .
RUN rm -rf dist node_modules
RUN CYPRESS_INSTALL_BINARY=0 npm ci --no-audit
RUN npm run build
RUN npm prune --no-audit --omit=dev

FROM base AS production
COPY --from=build --chown=appuser:appgroup /app/package.json /app/package-lock.json ./
COPY --from=build --chown=appuser:appgroup /app/dist ./dist
COPY --from=build --chown=appuser:appgroup /app/node_modules ./node_modules
EXPOSE 3000
ENV NODE_ENV='production'
USER 2000
CMD ["npm", "start"]
