FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY index.html tools-services.html 404.html input.css ./
RUN npm run build

FROM nginx:stable-alpine AS site
COPY --from=build /app/index.html /app/tools-services.html /app/404.html /app/styles.css /usr/share/nginx/html/
COPY script.js daily-artwork.js /usr/share/nginx/html/
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY assets/ /usr/share/nginx/html/assets/
COPY previews/index.html /usr/share/nginx/html/previews/index.html
EXPOSE 80
