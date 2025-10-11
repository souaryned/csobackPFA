# ------------ base ------------
FROM node:20-alpine AS base
WORKDIR /app
ENV NODE_ENV=production
# Speed up installs in CI/containers
RUN corepack enable

# ------------ development ------------
FROM base AS dev
ENV NODE_ENV=development
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# If using TypeScript, nodemon can run ts-node directly or tsx:
# RUN npm i -D ts-node tsx
# EXPOSE your app port
EXPOSE 3000
# Run your dev script (hot reload)
CMD ["npm", "run", "dev"]

# ------------ production build ------------
FROM base AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
# If using TypeScript:
# RUN npm run build
# Otherwise keep sources as-is

# ------------ production runtime ------------
FROM node:20-alpine AS prod
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S nodegrp && adduser -S nodeusr -G nodegrp
COPY --from=build /app ./
USER nodeusr
EXPOSE 3000
CMD ["npm", "start"]
