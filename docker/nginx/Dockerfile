# Build del SPA (React + Vite) y servidor nginx que también hace de
# reverse proxy hacia PHP-FPM para las rutas /api/*.
FROM node:22-alpine AS client-build

WORKDIR /app

COPY client/package.json client/package-lock.json ./
RUN npm ci

COPY client/ ./
RUN npm run build

FROM nginx:1.27-alpine

COPY docker/nginx/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=client-build /app/dist /usr/share/nginx/html

EXPOSE 80
