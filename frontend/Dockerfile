# ─────────────────────────────────────────────────────────────
# Stage 1 – builder
#   Installs ALL deps (including devDeps) and runs `npm run build`
#   to produce the optimised static files in /app/build
# ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy manifests first for layer caching
COPY package*.json ./

# Install all dependencies (devDeps needed for react-scripts build)
RUN npm ci

# Copy source
COPY . .

# The proxy field in package.json only works with react-scripts dev server.
# In production the Nginx config handles /api proxying, so we point the
# React app at a relative path (empty string = same origin).
# REACT_APP_API_URL is baked into the build at this stage.
ARG REACT_APP_API_URL=/api
ENV REACT_APP_API_URL=$REACT_APP_API_URL

# Build optimised production bundle
RUN npm run build

# ─────────────────────────────────────────────────────────────
# Stage 2 – production server
#   Copies only the /build output into a lean Nginx image.
#   No Node.js runtime in the final image at all.
# ─────────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS production

# Remove default Nginx site config
RUN rm /etc/nginx/conf.d/default.conf

# Copy our custom Nginx config
COPY nginx.conf /etc/nginx/conf.d/app.conf

# Copy the React build output from the builder stage
COPY --from=builder /app/build /usr/share/nginx/html

# Expose HTTP port
EXPOSE 80

# Nginx runs as PID 1 – this is fine for the official image
CMD ["nginx", "-g", "daemon off;"]
