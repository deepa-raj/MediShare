# client/Dockerfile
# Stage 1: build the static React bundle.
FROM node:22-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# Baked in at build time. docker-compose passes this so the built bundle
# knows where the API lives — it cannot read .env at runtime since it's
# already a static bundle by the time nginx serves it.
ARG VITE_API_URL=http://localhost:4000/api
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# Stage 2: serve the build output with nginx. Final image has no Node,
# no node_modules, no source — just static files and a tiny web server.
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
