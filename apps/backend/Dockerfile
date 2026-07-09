FROM node:20-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy root config and workspace config
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./

# Copy all packages and apps (needed for workspace dependencies)
COPY packages/ ./packages/
COPY apps/backend/ ./apps/backend/

# Install all dependencies (this handles the workspace links automatically)
RUN pnpm install --frozen-lockfile

# Build the shared packages
RUN pnpm --filter @delivery-tracker/types build
RUN pnpm --filter @delivery-tracker/utils build

# Build the backend
RUN pnpm --filter backend build

# Production image
FROM node:20-alpine

WORKDIR /app

# Copy only the built backend and its dependencies
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/backend ./apps/backend
COPY --from=builder /app/package.json ./package.json

WORKDIR /app/apps/backend

EXPOSE 3001

CMD ["npm", "start"]
