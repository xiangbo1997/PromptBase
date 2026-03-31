FROM node:20-bookworm-slim AS builder

WORKDIR /app

COPY package.json package-lock.json turbo.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/ui/package.json packages/ui/package.json

RUN npm ci

COPY . .

ARG NEXT_PUBLIC_API_URL=/api/v1
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

RUN npm run build --workspace @promptbase/shared
RUN npm run build --workspace @promptbase/web

FROM node:20-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3008

COPY --from=builder /app /app

EXPOSE 3008

CMD ["npm", "run", "start", "--workspace", "@promptbase/web", "--", "--port", "3008", "--hostname", "0.0.0.0"]
