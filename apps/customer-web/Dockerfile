# ------------------------------------------------------------
# 1. Builder Stage
# ------------------------------------------------------------
FROM node:22-alpine AS builder

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy dependency configuration files first to leverage Docker cache
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./

# Copy ONLY the shared packages and the specific frontend app.
# We do NOT copy apps/backend. This ensures backend artifacts are never included.
COPY packages/ ./packages/
COPY apps/customer-web/ ./apps/customer-web/

# Install dependencies for the workspace
RUN pnpm install --frozen-lockfile

# Build shared dependencies first (in case Vite strictly requires the compiled outputs)
RUN pnpm --filter @delivery-tracker/types build
RUN pnpm --filter @delivery-tracker/utils build

# Inject environment variables required by Vite during the build phase
ARG VITE_BACKEND_URL
ARG VITE_GOOGLE_MAPS_API_KEY
ENV VITE_BACKEND_URL=$VITE_BACKEND_URL
ENV VITE_GOOGLE_MAPS_API_KEY=$VITE_GOOGLE_MAPS_API_KEY

# Build the customer web application (produces static files in dist/)
RUN pnpm --filter customer-web build

# ------------------------------------------------------------
# 2. Runtime Stage
# ------------------------------------------------------------
FROM nginx:alpine

# Copy our optimized nginx configuration for SPA routing
COPY apps/customer-web/nginx.conf /etc/nginx/conf.d/default.conf

# Copy ONLY the static build artifacts from the builder stage.
# Node.js, source code, and backend files are completely excluded from this image.
COPY --from=builder /app/apps/customer-web/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
