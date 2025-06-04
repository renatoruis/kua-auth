# Build stage
FROM node:18-alpine as build-stage

# install pnpm
RUN npm install -g pnpm

WORKDIR /app

COPY package*.json ./

RUN pnpm install

COPY . .

RUN pnpm run build

EXPOSE 80

CMD ["pnpm", "serve"]