# ─────────────────────────────────────────────────────────────
# Stage 1 – deps
#   Install only production dependencies so the final image
#   does not contain devDependencies (nodemon, etc.)
# ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

# Copy manifests first so Docker cache is reused when only
# source code changes (not dependencies)
COPY package*.json ./

RUN npm ci --omit=dev

# ─────────────────────────────────────────────────────────────
# Stage 2 – runtime
# ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime

# Install dumb-init so Node.js is not PID 1 (handles signals properly)
RUN apk add --no-cache dumb-init

WORKDIR /app

# Copy installed node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy all source files
COPY . .

# Create temp directory for multer uploads (files are pushed to FTP
# immediately after upload so this dir stays near-empty)
RUN mkdir -p temp

# Run as non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
RUN chown -R appuser:appgroup /app
USER appuser

# Expose API port
EXPOSE 5000

# Health check – hits the /api/health endpoint every 30 s
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:5000/api/health || exit 1

# Use dumb-init as the entrypoint so SIGTERM is forwarded correctly
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
