FROM node:18-alpine AS builder
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci

FROM node:18-alpine 
WORKDIR /usr/src/app
RUN apk add --no-cache curl
USER node
COPY --chown=node:node --from=builder /usr/src/app/node_modules ./node_modules
COPY --chown=node:node . .
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-interval=10s --retries=3 \
   CMD curl -f http://localhost:3000/health || exit 1

CMD ["node", "index.js"]
