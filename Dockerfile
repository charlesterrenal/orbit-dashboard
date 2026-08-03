# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production server stage
FROM nginx:alpine
# Copy the built assets from the builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Copy the nginx template so envsubst can replace the proxy URLs at runtime
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
