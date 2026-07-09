# Build Stage
FROM node:22-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy package configurations
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./

# Copy all packages and the specific app
COPY packages/ ./packages/
COPY apps/customer-web/ ./apps/customer-web/

# Install dependencies (handles workspace links automatically)
RUN pnpm install --frozen-lockfile

# Build shared packages
RUN pnpm --filter @delivery-tracker/types build
RUN pnpm --filter @delivery-tracker/utils build

# Pass build args to environment variables (for VITE_ prefix variables)
ARG VITE_BACKEND_URL
ARG VITE_GOOGLE_MAPS_API_KEY
ENV VITE_BACKEND_URL=$VITE_BACKEND_URL
ENV VITE_GOOGLE_MAPS_API_KEY=$VITE_GOOGLE_MAPS_API_KEY

# Build the customer app
RUN pnpm --filter customer-web build

# Runtime Stage
FROM nginx:alpine

# Copy custom nginx config
COPY apps/customer-web/nginx.conf /etc/nginx/conf.d/default.conf

# Copy build output to nginx html dir
COPY --from=builder /app/apps/customer-web/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
