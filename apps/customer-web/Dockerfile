FROM node:20-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy root config and workspace config
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./

# Copy all packages and apps
COPY packages/ ./packages/
COPY apps/customer-web/ ./apps/customer-web/

# Pass build args to environment variables (for VITE_)
ARG VITE_BACKEND_URL
ARG VITE_GOOGLE_MAPS_API_KEY
ENV VITE_BACKEND_URL=$VITE_BACKEND_URL
ENV VITE_GOOGLE_MAPS_API_KEY=$VITE_GOOGLE_MAPS_API_KEY

RUN pnpm install --frozen-lockfile

# Build the shared packages first
RUN pnpm --filter @delivery-tracker/types build
RUN pnpm --filter @delivery-tracker/utils build

# Build the customer app
RUN pnpm --filter customer-web build

# Serve with Nginx
FROM nginx:alpine

# Copy custom nginx config
COPY apps/customer-web/nginx.conf /etc/nginx/conf.d/default.conf

# Copy build output to nginx html dir
COPY --from=builder /app/apps/customer-web/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
