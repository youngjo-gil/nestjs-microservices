FROM node:20-alpine AS development

WORKDIR /app

RUN npm install -g pnpm@8

COPY package.json pnpm-lock.yaml ./

RUN pnpm install

COPY . .

CMD ["pnpm", "run", "start:dev", "--", "--project", "api"]
