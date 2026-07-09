FROM node:22-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./

COPY packages/ ./packages/
COPY apps/backend/ ./apps/backend/

RUN pnpm install --frozen-lockfile

RUN pnpm --filter @delivery-tracker/types build
RUN pnpm --filter @delivery-tracker/utils build

RUN pnpm --filter backend build

FROM node:22-alpine

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/backend ./apps/backend
COPY --from=builder /app/package.json ./package.json

WORKDIR /app/apps/backend

EXPOSE 3001

CMD ["npm", "start"]
