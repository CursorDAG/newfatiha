# Stage 1: Install dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# Stage 2: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
ENV NEXT_TELEMETRY_DISABLED=1
# Increase Node.js heap for Next.js build on low-memory servers (< 2GB RAM)
ENV NODE_OPTIONS="--max-old-space-size=1536"
RUN npm run build

# Stage 3: Production
FROM node:20-alpine AS runner
WORKDIR /app

RUN apk add --no-cache bash

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copy Prisma schema and migrations
COPY --from=builder /app/prisma ./prisma

# Copy Next.js standalone output (compiled pages structure + standalone server.js)
COPY --from=builder /app/.next/standalone ./

# Install all production runtime dependencies (socket.io, prisma, pino, nodemailer, etc.)
# Uses --omit=dev to skip devDependencies (vitest, eslint, husky, etc.)
# This overwrites standalone's pruned node_modules with the full production set
COPY --from=builder /app/package.json /app/package-lock.json ./
RUN npm ci --omit=dev

# Install tsx globally for TypeScript server execution at runtime
RUN npm install -g tsx

# Copy compiled static assets and public files
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy TypeScript source files needed by server.ts at runtime (socket-server, memory-monitor, etc.)
COPY --from=builder /app/src ./src

# Copy custom server entry point
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["tsx", "server.ts"]
