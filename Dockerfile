# ---- Build Stage ----
FROM node:20-alpine AS builder

WORKDIR /app

# Copy workspace config
COPY package.json package-lock.json* ./
COPY shared/package.json shared/
COPY client/package.json client/
COPY server/package.json server/

# Install all dependencies
RUN npm install --workspaces --include-workspace-root

# Copy source code
COPY shared/ shared/
COPY client/ client/
COPY server/ server/

# Build client (Vite)
RUN cd client && npx vite build

# Build server (TypeScript)
RUN cd server && npx tsc

# ---- Production Stage ----
FROM node:20-alpine AS production

WORKDIR /app

# Copy workspace config
COPY package.json package-lock.json* ./
COPY shared/package.json shared/
COPY server/package.json server/

# Install production dependencies only
RUN npm install --workspaces --include-workspace-root --omit=dev

# Copy built artifacts
COPY --from=builder /app/client/dist ./client/dist
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/shared/ ./shared/

# Server serves static files + WebSocket
EXPOSE 8080

ENV NODE_ENV=production
ENV PORT=8080

# Start the server
CMD ["node", "server/dist/src/index.js"]
