FROM node:22-alpine AS base

LABEL maintainer="HMPPS Digital Studio <info@digital.justice.gov.uk>"

RUN apk --update-cache upgrade --available \
  && apk --no-cache add tzdata \
  && rm -rf /var/cache/apk/*

ENV TZ=Europe/London
RUN ln -snf "/usr/share/zoneinfo/$TZ" /etc/localtime && echo "$TZ" > /etc/timezone

RUN addgroup --gid 2000 --system appgroup && \
    adduser --uid 2000 --system appuser --ingroup appgroup

WORKDIR /app

ARG BUILD_NUMBER
ARG GIT_REF
ARG GIT_BRANCH

FROM base AS development
ENV BUILD_NUMBER=${BUILD_NUMBER}
ENV GIT_REF=${GIT_REF}
ENV GIT_BRANCH=${GIT_BRANCH}
ENV NODE_ENV=development

FROM base AS build

COPY package*.json ./
RUN CYPRESS_INSTALL_BINARY=0 npm ci --no-audit

COPY . .

RUN npm run build

RUN npm prune --no-audit --omit=dev

FROM base AS production

ENV BUILD_NUMBER=${BUILD_NUMBER}
ENV GIT_REF=${GIT_REF}
ENV GIT_BRANCH=${GIT_BRANCH}
ENV NODE_ENV=production

# Ensure required build / git args defined
RUN test -n "$BUILD_NUMBER" || (echo "BUILD_NUMBER not set" && false)
RUN test -n "$GIT_REF" || (echo "GIT_REF not set" && false)
RUN test -n "$GIT_BRANCH" || (echo "GIT_BRANCH not set" && false)

COPY --from=build --chown=appuser:appgroup /app/package.json /app/package-lock.json ./
COPY --from=build --chown=appuser:appgroup /app/dist ./dist
COPY --from=build --chown=appuser:appgroup /app/node_modules ./node_modules
EXPOSE 3000
USER 2000

CMD [ "npm", "start" ]
