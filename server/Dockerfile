# server/Dockerfile
FROM node:22-alpine

WORKDIR /app

# Install dependencies first so this layer is cached unless package*.json changes.
COPY package*.json ./
RUN npm install --omit=dev

COPY . .

# medishare.db lives here at runtime; mounted as a volume in docker-compose
# so data survives container restarts/rebuilds.
ENV DATABASE_PATH=/app/data/medishare.db
RUN mkdir -p /app/data

EXPOSE 4000

CMD ["node", "server.js"]
