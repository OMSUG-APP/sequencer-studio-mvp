# Build stage
FROM node:20-alpine AS build

WORKDIR /app

# Copy root workspace files
COPY package.json package-lock.json ./
# Copy workspace packages so npm can resolve monorepo symlinks
COPY packages/ ./packages/
COPY apps/studio/package.json ./apps/studio/

# Install dependencies (using workspaces)
RUN npm ci

# Copy source code
COPY apps/studio ./apps/studio

# Build the app
RUN npm run build -w @sequencer/studio

# Production stage
FROM nginx:alpine

# Copy custom nginx config
COPY apps/studio/nginx.conf /etc/nginx/conf.d/default.conf

# Copy build artifacts from build stage
COPY --from=build /app/apps/studio/dist /usr/share/nginx/html

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
