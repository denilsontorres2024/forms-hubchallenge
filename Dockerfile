FROM node:20-alpine AS deps

WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM deps AS build

ARG VITE_SUBMISSIONS_ENDPOINT=/api/submissions
ENV VITE_SUBMISSIONS_ENDPOINT=$VITE_SUBMISSIONS_ENDPOINT

COPY . .
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY package*.json ./
RUN npm ci --omit=dev

COPY server ./server
COPY --from=build /app/dist ./dist

EXPOSE 3000

CMD ["node", "server/index.mjs"]
